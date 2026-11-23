import { pool } from '../config/db';
import { ProjectService } from './project.service';
import { TaskService, TaskStatus } from './task.service';

const terminal: TaskStatus[] = ['completed', 'done'];
const active: TaskStatus[] = ['todo', 'in_progress', 'code_review'];
const labels: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  code_review: 'Code review',
  completed: 'Completed',
  done: 'Completed',
};

export class DashboardService {
  static async getDashboard(userId: string) {
    const projects = await ProjectService.getProjectsByMember(userId);
    const names = new Map(
      projects
        .filter(Boolean)
        .map((project: any) => [project!._id, project!.name])
    );
    const ids = [...names.keys()];
    if (!ids.length)
      return {
        summary: { waitingOnMe: 0, blocked: 0, inReview: 0, repliesNeeded: 0 },
        activeWork: [],
        todaysFocus: [],
        watchList: [],
        recentUpdates: [],
        generatedAt: new Date().toISOString(),
      };
    const rows = await pool.query(
      'SELECT id FROM tasks WHERE project_id = ANY($1::varchar[]) AND assigned_to = $2 ORDER BY updated_at DESC',
      [ids, userId]
    );
    const hydrated = await Promise.all(
      rows.rows.map((row: any) => TaskService.getTask(row.id))
    );
    const tasks = hydrated
      .filter((task) => !terminal.includes(task.status as TaskStatus))
      .map((task) => {
        const latestComment = task.comments[task.comments.length - 1];
        const latestActivity = task.activities[task.activities.length - 1];
        const latest: any =
          !latestActivity ||
          (latestComment &&
            new Date(latestComment.createdAt) >=
              new Date(latestActivity.createdAt))
            ? latestComment
            : latestActivity;
        const text = latest?.body || latest?.message;
        const repliesNeeded = Boolean(
          latestComment && latestComment.author?._id !== userId
        );
        const blocked = Boolean(text?.toLowerCase().includes('blocked'));
        const inReview = task.status === 'code_review';
        return {
          id: task._id,
          taskId: task._id,
          projectId: task.project,
          projectName: names.get(task.project) || '',
          title: task.title,
          status: task.status,
          updatedAt: new Date(task.updatedAt).toISOString(),
          latestUpdate: text,
          latestUpdateAt: latest?.createdAt,
          latestUpdateAuthor: (latest?.author || latest?.actor)?.name,
          waitingOnMe:
            active.includes(task.status as TaskStatus) &&
            (task.status === 'todo' || repliesNeeded || inReview || blocked),
          blocked,
          inReview,
          repliesNeeded,
          hasComments: Boolean(task.comments.length),
        };
      });
    const waitingOnMe = tasks.filter((t) => t.waitingOnMe),
      blocked = tasks.filter((t) => t.blocked),
      inReview = tasks.filter((t) => t.inReview),
      repliesNeeded = tasks.filter((t) => t.repliesNeeded);
    const focus = [...tasks].sort(
      (a, b) =>
        Number(b.blocked) - Number(a.blocked) ||
        Number(b.repliesNeeded) - Number(a.repliesNeeded) ||
        Number(b.inReview) - Number(a.inReview) ||
        b.updatedAt.localeCompare(a.updatedAt)
    );
    return {
      summary: {
        waitingOnMe: waitingOnMe.length,
        blocked: blocked.length,
        inReview: inReview.length,
        repliesNeeded: repliesNeeded.length,
      },
      activeWork: tasks,
      todaysFocus: focus
        .slice(0, 3)
        .map((t) => ({
          taskId: t.id,
          projectId: t.projectId,
          label: t.blocked
            ? 'Unblock this task'
            : t.repliesNeeded
              ? 'Reply to the latest update'
              : t.inReview
                ? 'Move the review forward'
                : 'Keep active work moving',
          title: t.title,
          detail: `${t.projectName} · ${labels[t.status as TaskStatus]}`,
        })),
      watchList: tasks
        .filter((t) => t.blocked || t.repliesNeeded || t.hasComments)
        .slice(0, 4)
        .map((t) => ({
          taskId: t.id,
          projectId: t.projectId,
          title: t.title,
          reason: t.blocked
            ? 'Blocked signal found in recent activity.'
            : t.repliesNeeded
              ? 'The latest comment may need your response.'
              : 'This task has recent discussion.',
          severity: (t.blocked || t.repliesNeeded ? 'high' : 'medium') as
            'high' | 'medium',
        })),
      recentUpdates: tasks.slice(0, 6),
      generatedAt: new Date().toISOString(),
    };
  }
}
