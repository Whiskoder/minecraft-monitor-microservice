import { Test, TestingModule } from '@nestjs/testing';
import { MinecraftForgeServerController } from './minecraft-forge-server.controller';
import { MinecraftForgeServerService } from './minecraft-forge-server.service';

describe('MinecraftForgeServerController', () => {
  let controller: MinecraftForgeServerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MinecraftForgeServerController],
      providers: [MinecraftForgeServerService],
    }).compile();

    controller = module.get<MinecraftForgeServerController>(MinecraftForgeServerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
