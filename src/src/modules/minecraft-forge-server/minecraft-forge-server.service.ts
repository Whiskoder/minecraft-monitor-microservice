import { Injectable } from '@nestjs/common';

import { ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';

import { RunMinecraftForgeServerDto } from './dto/run-minecraft-forge-server.dto';

@Injectable()
export class MinecraftForgeServerService {
  private forgeServerProcess: ChildProcess;

  constructor() {
    // this.createNewServer();
    this.runMinecraftForgeServer({
      name: 'server-test',
      maxMemory: 4,
      minMemory: 2,
    });
  }

  runMinecraftForgeServer(
    runMinecraftForgeServerDto: RunMinecraftForgeServerDto,
  ) {
    const { name, maxMemory, minMemory } = runMinecraftForgeServerDto;

    const forgeServerDirectory = join('~', 'servers', name);

    // Start process
    this.forgeServerProcess = spawn('bash', ['run.sh'], {
      cwd: forgeServerDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.forgeServerProcess.stdout.pipe(process.stdout);
    this.forgeServerProcess.stderr.pipe(process.stderr);
    this.forgeServerProcess.stdin.pipe(process.stdin);

    // Stop process when exit
    this.forgeServerProcess.on('exit', () => this.stopForgeServerProcess());
    process.on('exit', () => this.stopForgeServerProcess());
  }

  private stopForgeServerProcess = () => {
    this.forgeServerProcess.kill();
    this.forgeServerProcess = undefined;
  };

  createNewServer() {
    const currentDir =
      'C:\\Users\\aajem\\Workspace\\minecraft-service\\minecraft-monitor-microservice';
    // const forgeInstallDir = join(
    //   currentDir,
    //   'server-test',
    //   'forge-1.20.1-47.3.0-installer.jar',
    // );
    const forgeInstallDir = join(currentDir, 'server');
    console.log(forgeInstallDir);

    // const forgeInstallProcess = spawn(
    //   'java',
    //   ['-jar', forgeInstallDir, '--installServer', 'server'],
    //   { cwd: '.', stdio: ['pipe', 'pipe', 'pipe'] },
    // );
    const forgeInstallProcess = spawn('cmd.exe', ['/c', 'run.bat'], {
      cwd: forgeInstallDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // forgeInstallProcess.stdout.pipe();
    // forgeInstallProcess.stderr.pipe(process.stderr);
    // forgeInstallProcess.stdin.pipe(process.stdin);

    forgeInstallProcess.on('data', (chunk: Buffer) => {
      chunk
        .toString()
        .split('\n')
        .forEach((line) => {
          // console.log(line);
        });
    });

    const stopForgeInstallProcess = () => {
      forgeInstallProcess.kill();
    };

    forgeInstallProcess.on('exit', () => {
      stopForgeInstallProcess();
    });

    process.on('exit', () => {
      stopForgeInstallProcess();
    });
  }
}
