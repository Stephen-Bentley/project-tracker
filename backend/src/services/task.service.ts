import { pool } from '../config/db';
import {
  assertProjectMember,
  domainError,
  getProject,
  newId,
  TaskStatus,
  userShape,
} from './postgres';

interface TaskSchedule {
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
  dueDate?: string | null;
}

const labels: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  code_review: 'Code review',
  completed: 'Completed',
  done: 'Code review',
};
const taskRow = async (id: string) => {
  const result = await pool.query(
    `SELECT t.*, to_char(t.due_date, 'YYYY-MM-DD') AS due_date_text,
      row_to_json(a.*) AS assigned_user, row_to_json(c.*) AS creator_user
    FROM tasks t LEFT JOIN users a ON a.id=t.assigned_to JOIN users c ON c.id=t.created_by WHERE t.id=$1`,
    [id]
  );
  const row: any = result.rows[0];
  if (!row) return undefined;
  const [comments, activities, images] = await Promise.all([
    pool.query(
      `SELECT tc.id, tc.body, tc.created_at, row_to_json(u.*) AS author FROM task_comments tc JOIN users u ON u.id=tc.author_id WHERE tc.task_id=$1 ORDER BY tc.created_at`,
      [id]
    ),
    pool.query(
      `SELECT ta.id, ta.type, ta.message, ta.created_at, row_to_json(u.*) AS actor FROM task_activities ta JOIN users u ON u.id=ta.actor_id WHERE ta.task_id=$1 ORDER BY ta.created_at`,
      [id]
    ),
    pool.query(
      'SELECT id, filename, content_type, uploaded_at FROM task_images WHERE task_id=$1 ORDER BY uploaded_at',
      [id]
    ),
  ]);
  return {
    _id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: row.due_date_text,
    project: row.project_id,
    assignedTo: row.assigned_user ? userShape(row.assigned_user) : null,
    createdBy: userShape(row.creator_user),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images: images.rows.map((image: any) => ({
      _id: image.id,
      filename: image.filename,
      contentType: image.content_type,
      uploadedAt: image.uploaded_at,
    })),
    comments: comments.rows.map((comment: any) => ({
      _id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      author: userShape(comment.author),
    })),
    activities: activities.rows.map((activity: any) => ({
      _id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.created_at,
      actor: userShape(activity.actor),
    })),
  };
};
const addActivity = (
  taskId: string,
  actorId: string,
  type: string,
  message: string
) =>
  pool.query(
    'INSERT INTO task_activities (id, task_id, actor_id, type, message, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
    [newId(), taskId, actorId, type, message]
  );
const getExistingTask = async (taskId: string) => {
  const task = await taskRow(taskId);
  if (!task) throw domainError('Task not found', 404);
  return task;
};
const assertTaskMember = async (task: any, actorId: string) =>
  assertProjectMember(task.project, actorId);

export { TaskStatus };
export class TaskService {
  static async createTask(
    title: string,
    description: string | undefined,
    projectId: string,
    assignedTo: string | null,
    status: TaskStatus,
    creatorId: string,
    schedule: TaskSchedule = {}
  ) {
    if (!(await getProject(projectId)))
      throw domainError('Project not found', 404);
    await assertProjectMember(projectId, creatorId);
    if (
      assignedTo &&
      !(
        await pool.query(
          'SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2',
          [projectId, assignedTo]
        )
      ).rowCount
    )
      throw domainError('Target user is not a member of this project', 403);
    const id = newId();
    await pool.query(
      `INSERT INTO tasks (id,title,description,project_id,assigned_to,status,created_by,priority,due_date,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
      [
        id,
        title.trim(),
        description?.trim() || null,
        projectId,
        assignedTo,
        status,
        creatorId,
        schedule.priority ?? null,
        schedule.dueDate ?? null,
      ]
    );
    await addActivity(id, creatorId, 'created', 'Task created');
    return getExistingTask(id);
  }
  static async getTasksByProject(projectId: string, actorId?: string) {
    if (!(await getProject(projectId)))
      throw domainError('Project not found', 404);
    if (actorId) await assertProjectMember(projectId, actorId);
    const result = await pool.query(
      'SELECT id FROM tasks WHERE project_id=$1 ORDER BY updated_at DESC',
      [projectId]
    );
    return Promise.all(result.rows.map((row: any) => getExistingTask(row.id)));
  }
  static async getTask(taskId: string) {
    return getExistingTask(taskId);
  }
  static async assertMemberForTask(taskId: string, actorId: string) {
    const task = await getExistingTask(taskId);
    await assertTaskMember(task, actorId);
    return task;
  }
  static async updateTask(taskId: string, updates: any, actorId: string) {
    const task = await this.assertMemberForTask(taskId, actorId);
    const nextStatus = updates.status ?? task.status;
    if (
      updates.assignedTo !== undefined &&
      updates.assignedTo &&
      !(
        await pool.query(
          'SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2',
          [task.project, updates.assignedTo]
        )
      ).rowCount
    )
      throw domainError('Target user is not a member of this project', 403);
    await pool.query(
      `UPDATE tasks SET title=$2, description=$3, assigned_to=$4, status=$5,
       priority=CASE WHEN $6 THEN $7 ELSE priority END,
       due_date=CASE WHEN $8 THEN $9::date ELSE due_date END,
       updated_at=NOW() WHERE id=$1`,
      [
        taskId,
        updates.title === undefined ? task.title : updates.title.trim(),
        updates.description === undefined
          ? task.description
          : updates.description?.trim() || null,
        updates.assignedTo === undefined
          ? task.assignedTo?._id || null
          : updates.assignedTo || null,
        nextStatus,
        updates.priority !== undefined,
        updates.priority ?? null,
        updates.dueDate !== undefined,
        updates.dueDate ?? null,
      ]
    );
    if (nextStatus !== task.status)
      await addActivity(
        taskId,
        actorId,
        'status_changed',
        `Status changed from ${labels[task.status as TaskStatus]} to ${labels[nextStatus as TaskStatus]}`
      );
    if (
      updates.title !== undefined ||
      updates.description !== undefined ||
      (updates.priority !== undefined && updates.priority !== task.priority) ||
      (updates.dueDate !== undefined && updates.dueDate !== task.dueDate)
    )
      await addActivity(
        taskId,
        actorId,
        'details_updated',
        'Task details updated'
      );
    if (
      updates.assignedTo !== undefined &&
      (task.assignedTo?._id || null) !== (updates.assignedTo || null)
    )
      await addActivity(
        taskId,
        actorId,
        'assigned',
        updates.assignedTo ? 'Task assignee changed' : 'Task unassigned'
      );
    return getExistingTask(taskId);
  }
  static async uploadTaskImages(
    taskId: string,
    images: any[],
    actorId: string
  ) {
    const task = await this.assertMemberForTask(taskId, actorId);
    if (task.images.length + images.length > 3)
      throw domainError('A task can have up to three images');
    for (const image of images)
      await pool.query(
        'INSERT INTO task_images (id,task_id,filename,content_type,data,uploaded_at) VALUES ($1,$2,$3,$4,$5,NOW())',
        [newId(), taskId, image.originalname, image.mimetype, image.buffer]
      );
    await addActivity(
      taskId,
      actorId,
      'images_added',
      `${images.length} image${images.length === 1 ? '' : 's'} added`
    );
    return getExistingTask(taskId);
  }
  static async getTaskImage(taskId: string, imageId: string, actorId: string) {
    await this.assertMemberForTask(taskId, actorId);
    const result = await pool.query(
      'SELECT data, content_type FROM task_images WHERE id=$1 AND task_id=$2',
      [imageId, taskId]
    );
    if (!result.rows[0]) throw domainError('Image not found', 404);
    return {
      data: result.rows[0].data,
      contentType: result.rows[0].content_type,
    };
  }
  static async deleteTask(taskId: string, actorId: string) {
    await this.assertMemberForTask(taskId, actorId);
    await pool.query('DELETE FROM tasks WHERE id=$1', [taskId]);
    return { message: 'Task deleted' };
  }
  static async assignUserToTask(
    taskId: string,
    userId: string | null,
    actorId: string
  ) {
    const task = await this.assertMemberForTask(taskId, actorId);
    if (
      userId &&
      !(
        await pool.query(
          'SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2',
          [task.project, userId]
        )
      ).rowCount
    )
      throw domainError('Target user is not a member of this project', 403);
    await this.updateTask(taskId, { assignedTo: userId }, actorId);
    return {
      message: userId ? 'User assigned to task' : 'User unassigned from task',
      taskId,
      assignedTo: userId,
    };
  }
  static async addComment(taskId: string, body: string, authorId: string) {
    await this.assertMemberForTask(taskId, authorId);
    await pool.query(
      'INSERT INTO task_comments (id,task_id,author_id,body,created_at) VALUES ($1,$2,$3,$4,NOW())',
      [newId(), taskId, authorId, body.trim()]
    );
    await addActivity(taskId, authorId, 'comment_added', 'Comment added');
    return getExistingTask(taskId);
  }
}
