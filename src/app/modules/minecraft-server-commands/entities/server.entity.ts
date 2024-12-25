import { ForgeEntity } from '@modules/minecraft-server-commands/entities/forge.entity';

export interface ServerEntity {
  createdAt: Date;
  forge: ForgeEntity;
  isActive: boolean;
  maxMemory: number;
  maxMemoryUnit: 'G' | 'M';
  minMemory: number;
  minMemoryUnit: 'G' | 'M';
  name: string;
  running: boolean;
  id: string;
}
