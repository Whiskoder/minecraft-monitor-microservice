import { Injectable } from '@nestjs/common';

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFile, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { catchError, Observable, switchMap, tap } from 'rxjs';
import axios from 'axios';

import { envs } from '@config/envs.config';
import { TaskStatus } from '@modules/minecraft-server-commands/enums/task-status.enum';
import { ServerTaskEntity } from '@modules/minecraft-server-commands/entities/server-task.entity';
import { ServerEntity } from '@modules/minecraft-server-commands/entities/server.entity';
import { writeFileObservable } from '@common/utils/write-file-observable.util';
import { ForgeServerProcessSingleton } from '@modules/minecraft-server-commands/forge-server-process';

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
          this.downloadForgeInstaller(
            server.forge.version,
            forgeServerDirectory,
          ),
        ),
        switchMap((forgeInstallerDirectory) =>
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
          this.runForgeServerProcess(forgeServerDirectory);
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

    this.forgeServerInstance.$stop();

    this.notifyTaskStatus({
      serverId: server.id,
      taskId: tasks.id,
      status: TaskStatus.TERMINATED,
      result: 'Server stopped by user',
    }).subscribe();
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

  private downloadForgeInstaller(
    version: string,
    forgeServerDirectory: string,
  ): Observable<string> {
    const $downloadForgeObservable = new Observable<string>((observer) => {
      const url = `${this.apiHost}/api/v1/minecraft/forge/${version}`;

      axios
        .get(url, { responseType: 'arraybuffer' })
        .then(({ data }) => {
          const forgeInstallerDirectory = join(
            forgeServerDirectory,
            'forge.jar',
          );

          writeFile(forgeInstallerDirectory, Buffer.from(data), (e) => {
            if (e) throw new Error('Error saving forge installer');
            observer.next(forgeInstallerDirectory);
            observer.complete();
          });
        })
        .catch((e) => {
          if (e.status === 404) throw new Error('Forge version not found');
          throw new Error('Error downloading Forge installer');
        });
    });

    return $downloadForgeObservable;
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

  private runForgeServerProcess(forgeServerDirectory: string) {
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
      console.log(data.toString());
    });

    // TODO: Notify task status on exit

    this.forgeServerInstance.$process.on('exit', (code) => {
      console.log(`Forge server exited with code ${code}`);
      this.forgeServerInstance.$stop();
    });

    this.forgeServerInstance.$process.on('error', (e) => {
      console.log(`Forge server error: ${e}`);
      this.forgeServerInstance.$stop();
    });

    process.on('exit', () => {
      console.log('Process exited');
      this.forgeServerInstance.$stop();
    });
  }
}
