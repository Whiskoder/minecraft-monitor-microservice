import { ChildProcess } from 'node:child_process';

import kill from 'tree-kill';

export class ForgeServerProcessSingleton {
  private forgeServerProcess: ChildProcess | undefined;
  private static instance: ForgeServerProcessSingleton;

  private constructor() {
    this.forgeServerProcess = undefined;
  }

  public static getInstance() {
    if (!ForgeServerProcessSingleton.instance) {
      ForgeServerProcessSingleton.instance = new ForgeServerProcessSingleton();
    }
    return ForgeServerProcessSingleton.instance;
  }

  public get $process(): ChildProcess | undefined {
    return this.forgeServerProcess;
  }

  public set $process(forgeServerProcess: ChildProcess) {
    this.forgeServerProcess = forgeServerProcess;
  }

  public $stop() {
    if (this.forgeServerProcess)
      kill(this.forgeServerProcess.pid, '-15', (err) => {
        if (err) throw err;
      });
    this.forgeServerProcess = undefined;
  }
}
