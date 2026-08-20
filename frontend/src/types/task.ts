import { User } from './index';

export type TaskStatus =
  'todo' | 'in_progress' | 'code_review' | 'completed' | 'done';

export interface TaskImage {
  _id: string;
  filename: string;
  contentType: string;
  uploadedAt: string;
}

export interface TaskComment {
  _id: string;
  author: User | string;
  body: string;
  createdAt: string;
}

export interface TaskActivity {
  _id: string;
  type: string;
  message: string;
  actor: User | string;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: User | string | null;
  images: TaskImage[];
  comments: TaskComment[];
  activities: TaskActivity[];
}
