import { Module } from '@nestjs/common';

import { MinecraftServerCommandsModule } from '@modules/minecraft-server-commands/minecraft-server-commands.module';

@Module({
  imports: [MinecraftServerCommandsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
