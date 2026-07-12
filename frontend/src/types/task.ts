import { User } from './index';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskImage {
  _id: string;
  filename: string;
  contentType: string;
  uploadedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: User | string | null;
  images: TaskImage[];
}
