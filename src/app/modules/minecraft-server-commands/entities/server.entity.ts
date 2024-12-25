import { ForgeEntity } from '@modules/minecraft-server-commands/entities/forge.entity';
import { ModEntity } from '@modules/minecraft-server-commands/entities/mod.entity';

export interface ServerEntity {
  createdAt: Date;
  forge: ForgeEntity;
  mods: ModEntity[];
  isActive: boolean;
  maxMemory: number;
  maxMemoryUnit: 'G' | 'M';
  minMemory: number;
  minMemoryUnit: 'G' | 'M';
  name: string;
  running: boolean;
  id: string;
}
