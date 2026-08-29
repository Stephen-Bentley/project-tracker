import Project from '../models/Project';
import Task, { ITask, TaskStatus } from '../models/Task';

const TERMINAL_STATUSES: TaskStatus[] = ['completed', 'done'];
const ACTIVE_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'code_review'];

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

export interface DashboardResponse {
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

const idOf = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

const displayName = (value: unknown): string | undefined => {
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return String((value as { name: unknown }).name);
  }
  return undefined;
};

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  code_review: 'Code review',
  completed: 'Completed',
  done: 'Completed',
};

const latestEntry = (task: ITask) => {
  const comments = task.comments || [];
  const activities = task.activities || [];
  const comment = comments[comments.length - 1];
  const activity = activities[activities.length - 1];

  if (!comment && !activity) return undefined;
  if (!activity || (comment && comment.createdAt >= activity.createdAt)) {
    return {
      text: comment!.body,
      at: comment!.createdAt,
      authorId: idOf(comment!.author),
      authorName: displayName(comment!.author),
    };
  }
  return {
    text: activity.message,
    at: activity.createdAt,
    authorId: idOf(activity.actor),
    authorName: displayName(activity.actor),
  };
};

const hasBlockedSignal = (task: ITask): boolean => {
  const entry = latestEntry(task);
  return Boolean(entry?.text.toLowerCase().includes('blocked'));
};

const toDashboardTask = (
  task: ITask & { project: { _id: unknown; name: string } },
  userId: string
): DashboardTask => {
  const latest = latestEntry(task);
  const latestComment = task.comments?.[task.comments.length - 1];
  const repliesNeeded = Boolean(
    latestComment && idOf(latestComment.author) !== userId
  );
  const inReview = task.status === 'code_review';
  const blocked = hasBlockedSignal(task);

  return {
    id: task._id.toString(),
    projectId: task.project._id.toString(),
    projectName: task.project.name,
    title: task.title,
    status: task.status,
    updatedAt: task.updatedAt.toISOString(),
    latestUpdate: latest?.text,
    latestUpdateAt: latest?.at.toISOString(),
    latestUpdateAuthor: latest?.authorName,
    waitingOnMe:
      ACTIVE_STATUSES.includes(task.status) &&
      (task.status === 'todo' || repliesNeeded || inReview || blocked),
    blocked,
    inReview,
    repliesNeeded,
    hasComments: Boolean(task.comments?.length),
  };
};

export class DashboardService {
  static async getDashboard(userId: string): Promise<DashboardResponse> {
    const projects = await Project.find({ members: userId }).select('_id name');
    const projectIds = projects.map((project) => project._id);

    const tasks = await Task.find({
      project: { $in: projectIds },
      assignedTo: userId,
    })
      .select('-images')
      .populate('project', '_id name')
      .populate('comments.author', '_id name')
      .populate('activities.actor', '_id name')
      .sort({ updatedAt: -1 });

    const dashboardTasks = tasks
      .filter(
        (task) => task.project && !TERMINAL_STATUSES.includes(task.status)
      )
      .map((task) =>
        toDashboardTask(
          task as unknown as ITask & {
            project: { _id: unknown; name: string };
          },
          userId
        )
      );

    const waitingOnMe = dashboardTasks.filter((task) => task.waitingOnMe);
    const blocked = dashboardTasks.filter((task) => task.blocked);
    const inReview = dashboardTasks.filter((task) => task.inReview);
    const repliesNeeded = dashboardTasks.filter((task) => task.repliesNeeded);

    const focusSource = [...dashboardTasks].sort(
      (left, right) =>
        Number(right.blocked) - Number(left.blocked) ||
        Number(right.repliesNeeded) - Number(left.repliesNeeded) ||
        Number(right.inReview) - Number(left.inReview) ||
        right.updatedAt.localeCompare(left.updatedAt)
    );

    const todaysFocus = focusSource.slice(0, 3).map((task) => ({
      taskId: task.id,
      projectId: task.projectId,
      label: task.blocked
        ? 'Unblock this task'
        : task.repliesNeeded
          ? 'Reply to the latest update'
          : task.inReview
            ? 'Move the review forward'
            : 'Keep active work moving',
      title: task.title,
      detail: `${task.projectName} · ${statusLabel[task.status]}`,
    }));

    const watchList = [...dashboardTasks]
      .filter((task) => task.blocked || task.repliesNeeded || task.hasComments)
      .slice(0, 4)
      .map((task) => ({
        taskId: task.id,
        projectId: task.projectId,
        title: task.title,
        reason: task.blocked
          ? 'Blocked signal found in recent activity.'
          : task.repliesNeeded
            ? 'The latest comment may need your response.'
            : 'This task has recent discussion.',
        severity: (task.blocked || task.repliesNeeded ? 'high' : 'medium') as
          'high' | 'medium',
      }));

    return {
      summary: {
        waitingOnMe: waitingOnMe.length,
        blocked: blocked.length,
        inReview: inReview.length,
        repliesNeeded: repliesNeeded.length,
      },
      activeWork: dashboardTasks,
      todaysFocus,
      watchList,
      recentUpdates: dashboardTasks.slice(0, 6),
      generatedAt: new Date().toISOString(),
    };
  }
}
