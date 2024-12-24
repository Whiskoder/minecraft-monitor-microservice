import { Module } from '@nestjs/common';
import { MinecraftForgeServerModule } from './src/modules/minecraft-forge-server/minecraft-forge-server.module';

@Module({
  imports: [MinecraftForgeServerModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
