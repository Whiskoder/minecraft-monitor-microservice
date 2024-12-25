import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import {
  MinecraftServerCommandsService,
  RunCommandOptions,
} from '@modules/minecraft-server-commands/minecraft-server-commands.service';

@Controller()
export class MinecraftServerCommandsController {
  constructor(
    private readonly minecraftForgeServerService: MinecraftServerCommandsService,
  ) {}

  @MessagePattern('run-forge-installer')
  runForgeInstaller(@Payload() opts: RunCommandOptions) {
    return this.minecraftForgeServerService.runForgeInstaller(opts);
  }

  @MessagePattern('run-forge-server')
  runForgeServer(@Payload() opts: RunCommandOptions) {
    return this.minecraftForgeServerService.runForgeServer(opts);
  }

  @MessagePattern('stop-forge-server')
  stopForgeServer(@Payload() opts: RunCommandOptions) {
    return this.minecraftForgeServerService.stopForgeServer(opts);
  }
}
