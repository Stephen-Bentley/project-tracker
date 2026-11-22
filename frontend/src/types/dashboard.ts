import { TaskStatus } from './task';

export interface DashboardTask {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;
  latestUpdate?: string;
  latestUpdateAt?: string;
  latestUpdateAuthor?: string;
  waitingOnMe: boolean;
  blocked: boolean;
  inReview: boolean;
  repliesNeeded: boolean;
  hasComments: boolean;
}

export interface DashboardData {
  summary: {
    waitingOnMe: number;
    blocked: number;
    inReview: number;
    repliesNeeded: number;
  };
  activeWork: DashboardTask[];
  todaysFocus: Array<{
    taskId: string;
    projectId: string;
    label: string;
    title: string;
    detail: string;
  }>;
  watchList: Array<{
    taskId: string;
    projectId: string;
    title: string;
    reason: string;
    severity: 'high' | 'medium';
  }>;
  recentUpdates: DashboardTask[];
  generatedAt: string;
}
