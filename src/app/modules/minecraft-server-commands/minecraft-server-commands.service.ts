import { Injectable } from '@nestjs/common';

import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFile,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { catchError, forkJoin, Observable, of, switchMap, tap } from 'rxjs';
import axios from 'axios';
import pidtree from 'pidtree';

import { envs } from '@config/envs.config';
import { TaskStatus } from '@modules/minecraft-server-commands/enums/task-status.enum';
import { ServerTaskEntity } from '@modules/minecraft-server-commands/entities/server-task.entity';
import { ServerEntity } from '@modules/minecraft-server-commands/entities/server.entity';
import { writeFileObservable } from '@common/utils/write-file-observable.util';
import { ForgeServerProcessSingleton } from '@modules/minecraft-server-commands/forge-server-process';
import { readDirObservable } from '@common/utils/read-dir-observable.utils';

export interface RunCommandOptions {
  tasks: ServerTaskEntity;
  server: ServerEntity;
}

interface NotifyTaskStatusOptions {
  serverId: string;
  taskId: string;
  status: TaskStatus;
  result?: string;
}

@Injectable()
export class MinecraftServerCommandsService {
  private forgeServerInstance: ForgeServerProcessSingleton;
  private apiHost: string;
  private baseDir: string;

  constructor() {
    this.apiHost = envs.apiHost;
    this.baseDir = envs.baseDir;
    this.forgeServerInstance = ForgeServerProcessSingleton.getInstance();
  }

  runForgeInstaller(opts: RunCommandOptions) {
    const { server, tasks } = opts;
    const forgeServerDirectory = join(this.baseDir, 'servers', server.name);
    const forgeRunFileDirectory = join(forgeServerDirectory, 'run.bat');
    const forgeInstallerDirectory = join(forgeServerDirectory, 'forge.jar');
    const forgeDownloadUrl = `${this.apiHost}/api/v1/minecraft/forge/${server.forge.version}`;

    this.notifyTaskStatus({
      serverId: server.id,
      taskId: tasks.id,
      status: TaskStatus.RUNNING,
    })
      .pipe(
        tap(() => {
          if (existsSync(forgeRunFileDirectory))
            throw new Error('Forge server already exists');
          mkdirSync(forgeServerDirectory, { recursive: true });
        }),
        switchMap(() =>
          this.downloadFile(forgeDownloadUrl, forgeInstallerDirectory),
        ),
        switchMap(() =>
          this.runForgeInstallerProcess(
            forgeInstallerDirectory,
            forgeServerDirectory,
          ),
        ),
        switchMap(() =>
          this.notifyTaskStatus({
            serverId: server.id,
            taskId: tasks.id,
            status: TaskStatus.SUCCESS,
          }),
        ),
        catchError((e) =>
          this.notifyTaskStatus({
            serverId: server.id,
            taskId: tasks.id,
            status: TaskStatus.FAILED,
            result: e.message,
          }),
        ),
      )
      .subscribe();
  }

  runInstallMods(opts: RunCommandOptions) {
    const { server, tasks } = opts;

    const forgeServerDirectory = join(this.baseDir, 'servers', server.name);
    const installedModsDirectory = join(forgeServerDirectory, 'mods.txt');
    const modsBaseDirectory = join(forgeServerDirectory, 'mods');

    let installedMods: string[] = [];
    if (existsSync(installedModsDirectory))
      installedMods = readFileSync(installedModsDirectory, 'utf8')
        .split(',')
        .filter((modId) => modId);

    const $downloadModObservers = server.mods
      .filter((mod) => !installedMods.includes(mod.id)) // Filter mods that are already installed
      .map((mod) => {
        const modDownloadUrl = `${this.apiHost}/api/v1/minecraft/mods/${mod.id}`;
        const modSaveDirectory = join(modsBaseDirectory, `${mod.id}.jar`);
        return this.downloadFile(modDownloadUrl, modSaveDirectory);
      });

    this.notifyTaskStatus({
      serverId: server.id,
      taskId: tasks.id,
      status: TaskStatus.RUNNING,
    })
      .pipe(
        tap(() => {
          if (!existsSync(join(forgeServerDirectory, 'run.bat')))
            throw new Error('Forge server not found');

          if (this.forgeServerInstance.$process)
            throw new Error('Stop server before installing mods');

          mkdirSync(modsBaseDirectory, { recursive: true });
        }),
        switchMap(() =>
          $downloadModObservers.length > 0
            ? forkJoin($downloadModObservers)
            : of([]),
        ),
        switchMap(() => readDirObservable(modsBaseDirectory)),
        switchMap((mods) =>
          writeFileObservable(
            installedModsDirectory,
            mods.join(',').replaceAll('.jar', ''),
          ),
        ),
        // TODO: Post installed mods to database
        switchMap(() =>
          this.notifyTaskStatus({
            serverId: server.id,
            taskId: tasks.id,
            status: TaskStatus.SUCCESS,
          }),
        ),
        catchError((e) =>
          this.notifyTaskStatus({
            serverId: server.id,
            taskId: tasks.id,
            status: TaskStatus.FAILED,
            result: e.message,
          }),
        ),
      )
      .subscribe();
  }

  runForgeServer(opts: RunCommandOptions) {
    const { server, tasks } = opts;

    const forgeServerDirectory = join(this.baseDir, 'servers', server.name);
    const userJvmArgsPath = join(forgeServerDirectory, 'user_jvm_args.txt');
    const eulaFilePath = join(forgeServerDirectory, 'eula.txt');

    const maxMemoryArg = `-Xmx${server.maxMemory}${server.maxMemoryUnit}`;
    const minMemoryArg = `-Xms${server.minMemory}${server.minMemoryUnit}`;
    const memoryArgs = `${maxMemoryArg}\n${minMemoryArg}`;

    this.notifyTaskStatus({
      serverId: server.id,
      taskId: tasks.id,
      status: TaskStatus.RUNNING,
    })
      .pipe(
        tap(() => {
          if (!existsSync(forgeServerDirectory))
            throw new Error('Forge server not found');
          if (this.forgeServerInstance.$process)
            throw new Error('Server is already running');
        }),
        switchMap(() => writeFileObservable(userJvmArgsPath, memoryArgs)),
        switchMap(() => writeFileObservable(eulaFilePath, 'eula=true')),
        tap(() => {
          this.runForgeServerProcess(forgeServerDirectory, server.id, tasks.id);
        }),
        catchError((e) =>
          this.notifyTaskStatus({
            serverId: server.id,
            taskId: tasks.id,
            status: TaskStatus.FAILED,
            result: e.message,
          }),
        ),
      )
      .subscribe();
  }

  stopForgeServer(opts: RunCommandOptions) {
    const { server, tasks } = opts;
    if (!this.forgeServerInstance.$process) {
      this.notifyTaskStatus({
        serverId: server.id,
        taskId: tasks.id,
        status: TaskStatus.FAILED,
        result: 'Error stopping server',
      }).subscribe();
      return;
    }

    pidtree(
      this.forgeServerInstance.$process.pid,
      { root: true },
      (e, pids) => {
        console.log(pids);
      },
    );

    this.forgeServerInstance.$process.stdin.emit('data', '\n');

    this.forgeServerInstance.$process.stdin.write('stop');

    this.forgeServerInstance.$process.stdin.on('data', (data) => {
      console.log(data.toString());
    });
  }

  killForgeServer(opts: RunCommandOptions) {
    const { server, tasks } = opts;

    if (!this.forgeServerInstance.$process) {
      this.notifyTaskStatus({
        serverId: server.id,
        taskId: tasks.id,
        status: TaskStatus.FAILED,
        result: 'Error killing server',
      }).subscribe();
      return;
    }

    this.forgeServerInstance.$kill();
  }

  runServerCommand(opts: RunCommandOptions) {
    const { server, tasks } = opts;

    // this.forgeServerInstance.$process.stdin.write(server.command);
  }

  private notifyTaskStatus = (
    opts: NotifyTaskStatusOptions,
  ): Observable<boolean> => {
    const { serverId, taskId, status, result } = opts;
    const url = `${this.apiHost}/api/v1/minecraft/server/${serverId}/tasks/${taskId}`;

    const $request = new Observable<boolean>((obs) => {
      axios
        .patch(url, { status, result })
        .then(() => {
          obs.next(true);
          obs.complete();
        })
        .catch(() => {
          obs.next(false);
          obs.complete();
        });
    });

    return $request;
  };

  private downloadFile(
    url: string,
    saveFileDirectory: string,
  ): Observable<void> {
    const $downloadFileObservable = new Observable<void>((observer) => {
      axios
        .get(url, { responseType: 'arraybuffer' })
        .then(({ data }) => {
          writeFile(saveFileDirectory, Buffer.from(data), (e) => {
            if (e) throw new Error('Error saving file');
            observer.next();
            observer.complete();
          });
        })
        .catch((e) => {
          if (e.status === 404) throw new Error('File not found');
          throw new Error('Error downloading file');
        });
    });

    return $downloadFileObservable;
  }

  private runForgeInstallerProcess(
    forgeInstallerDirectory: string,
    forgeServerDirectory: string,
  ): Observable<void> {
    const $install = new Observable<void>((observer) => {
      const forgeInstallProcess = spawn(
        'java',
        [
          '-jar',
          forgeInstallerDirectory,
          '--installServer',
          forgeServerDirectory,
        ],
        { cwd: '.', stdio: ['pipe', 'pipe', 'pipe'] },
      );

      let installProcessLog: string[] = [];
      const saveProcessLog = () => {
        writeFileSync(
          join(forgeServerDirectory, 'install.log'),
          installProcessLog.join('\n'),
          'utf8',
        );
      };

      forgeInstallProcess.stdout.on('data', (data) =>
        installProcessLog.push(data.toString()),
      );

      forgeInstallProcess.on('exit', (code) => {
        forgeInstallProcess.kill();
        saveProcessLog();

        if (code !== 0)
          throw new Error(`Forge installer exited with code ${code}`);

        observer.next();
        observer.complete();
      });

      forgeInstallProcess.on('error', (e) => {
        forgeInstallProcess.kill();
        saveProcessLog();
        throw e;
      });

      process.on('exit', () => {
        forgeInstallProcess.kill();
        saveProcessLog();
      });
    });

    return $install;
  }

  private runForgeServerProcess(
    forgeServerDirectory: string,
    serverId: string,
    taskId: string,
  ) {
    // Switch between cmd and bash based on the OS
    const isWindows = process.platform === 'win32';
    const args = isWindows ? ['/c', 'run.bat', 'nogui'] : ['run.sh', 'nogui'];
    const terminal = isWindows ? 'cmd.exe' : 'bash';

    this.forgeServerInstance.$process = spawn(terminal, args, {
      cwd: forgeServerDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // TODO: Store logs
    this.forgeServerInstance.$process.stdout.on('data', (data) => {
      if (data.toString().includes('Presione una tecla para continuar'))
        this.forgeServerInstance.$process.stdin.write(' ');
      console.log(data.toString());
    });

    const onServerStop = (message: string) => {
      this.notifyTaskStatus({
        serverId,
        taskId,
        status: TaskStatus.TERMINATED,
        result: message,
      }).subscribe();
    };

    this.forgeServerInstance.$process.on('exit', (code) => {
      onServerStop(`Server stopped with code ${code}`);
      this.forgeServerInstance.$kill();
    });

    this.forgeServerInstance.$process.on('error', (e) => {
      onServerStop(`Server stopped by error: ${e}`);
      this.forgeServerInstance.$kill();
    });

    process.on('exit', () => {
      onServerStop('Server stopped by process exit');
      this.forgeServerInstance.$kill();
    });
  }
}
