import { Module } from '@nestjs/common';
import { MinecraftForgeServerService } from './minecraft-forge-server.service';
import { MinecraftForgeServerController } from './minecraft-forge-server.controller';

@Module({
  controllers: [MinecraftForgeServerController],
  providers: [MinecraftForgeServerService],
})
export class MinecraftForgeServerModule {}
