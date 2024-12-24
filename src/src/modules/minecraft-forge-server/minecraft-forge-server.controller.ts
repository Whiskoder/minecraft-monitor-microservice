import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MinecraftForgeServerService } from './minecraft-forge-server.service';

@Controller()
export class MinecraftForgeServerController {
  constructor(
    private readonly minecraftForgeServerService: MinecraftForgeServerService,
  ) {}

  @MessagePattern('minecraft-create-new-server')
  createNewServer() {
    return this.minecraftForgeServerService.createNewServer();
  }

  // @MessagePattern('createMinecraftForgeServer')
  // create(@Payload() createMinecraftForgeServerDto: CreateMinecraftForgeServerDto) {
  //   return this.minecraftForgeServerService.create(createMinecraftForgeServerDto);
  // }

  // @MessagePattern('findAllMinecraftForgeServer')
  // findAll() {
  //   return this.minecraftForgeServerService.findAll();
  // }

  // @MessagePattern('findOneMinecraftForgeServer')
  // findOne(@Payload() id: number) {
  //   return this.minecraftForgeServerService.findOne(id);
  // }

  // @MessagePattern('updateMinecraftForgeServer')
  // update(@Payload() updateMinecraftForgeServerDto: UpdateMinecraftForgeServerDto) {
  //   return this.minecraftForgeServerService.update(updateMinecraftForgeServerDto.id, updateMinecraftForgeServerDto);
  // }

  // @MessagePattern('removeMinecraftForgeServer')
  // remove(@Payload() id: number) {
  //   return this.minecraftForgeServerService.remove(id);
  // }
}
