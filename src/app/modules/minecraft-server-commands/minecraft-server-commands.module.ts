import { Module } from '@nestjs/common';

import { MinecraftServerCommandsService } from '@modules/minecraft-server-commands/minecraft-server-commands.service';
import { MinecraftServerCommandsController } from '@modules/minecraft-server-commands/minecraft-server-commands.controller';

@Module({
  controllers: [MinecraftServerCommandsController],
  providers: [MinecraftServerCommandsService],
})
export class MinecraftServerCommandsModule {}
