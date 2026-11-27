import { User } from './index';

export type TaskStatus =
  'todo' | 'in_progress' | 'code_review' | 'completed' | 'done';

export const taskPriorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export type TaskPriority = keyof typeof taskPriorityLabels;

export interface TaskSchedule {
  priority?: TaskPriority | null;
  dueDate?: string | null;
}

export function changedTaskSchedule(
  value: TaskSchedule,
  saved: TaskSchedule
): TaskSchedule {
  const changes: TaskSchedule = {};
  if ((value.priority ?? null) !== (saved.priority ?? null)) {
    changes.priority = value.priority ?? null;
  }
  if ((value.dueDate ?? null) !== (saved.dueDate ?? null)) {
    changes.dueDate = value.dueDate ?? null;
  }
  return changes;
}

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

export interface Task extends TaskSchedule {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: User | string | null;
  images: TaskImage[];
  comments: TaskComment[];
  activities: TaskActivity[];
}
