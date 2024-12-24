import { Test, TestingModule } from '@nestjs/testing';
import { MinecraftForgeServerService } from './minecraft-forge-server.service';

describe('MinecraftForgeServerService', () => {
  let service: MinecraftForgeServerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MinecraftForgeServerService],
    }).compile();

    service = module.get<MinecraftForgeServerService>(MinecraftForgeServerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
