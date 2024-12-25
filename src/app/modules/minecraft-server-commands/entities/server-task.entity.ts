import { TaskStatus } from '@modules/minecraft-server-commands/enums/task-status.enum';
import { TaskType } from '@modules/minecraft-server-commands/enums/task-type.enum';

export interface ServerTaskEntity {
  id: string;
  serverId: string;
  status: TaskStatus;
  type: TaskType;
  result: string;
  createdAt: Date;
  updatedAt: Date;
}
