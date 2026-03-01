import { User } from './index';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: User | string | null;
}
