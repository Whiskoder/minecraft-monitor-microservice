export enum TaskStatus {
  PENDING = 'PENDING', // Task is waiting to be executed
  RUNNING = 'RUNNING', // Task is currently being executed
  SUCCESS = 'SUCCESS', // Task has been executed successfully
  FAILED = 'FAILED', // Task has failed to execute
  TERMINATED = 'TERMINATED', // Task has been terminated
}
