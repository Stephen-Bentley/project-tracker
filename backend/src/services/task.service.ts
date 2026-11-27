import { pool } from '../config/db';
import {
  assertProjectMember,
  domainError,
  getProject,
  newId,
  TaskStatus,
  userShape,
} from './postgres';

const labels: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  code_review: 'Code review',
  completed: 'Completed',
  done: 'Code review',
};
const boardOrder = 'board_position ASC NULLS FIRST, updated_at DESC, id';
const taskRow = async (id: string) => {
  const result = await pool.query(
    `SELECT t.*, row_to_json(a.*) AS assigned_user, row_to_json(c.*) AS creator_user
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
    creatorId: string
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
      'INSERT INTO tasks (id,title,description,project_id,assigned_to,status,created_by,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())',
      [
        id,
        title.trim(),
        description?.trim() || null,
        projectId,
        assignedTo,
        status,
        creatorId,
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
      `SELECT id FROM tasks WHERE project_id=$1 ORDER BY ${boardOrder}`,
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
  static async moveBoardTask(
    taskId: string,
    lane: Exclude<TaskStatus, 'done'>,
    beforeTaskId: string | null,
    actorId: string
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: tasks } = await client.query<{ project_id: string }>(
        'SELECT project_id FROM tasks WHERE id = $1',
        [taskId]
      );
      const projectId = tasks[0]?.project_id;
      if (!projectId) throw domainError('Task not found', 404);

      // A project's drag operations share one lock, including moves in opposite directions.
      await client.query(
        'SELECT id FROM projects WHERE id = $1 FOR NO KEY UPDATE',
        [projectId]
      );
      const membership = await client.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 FOR KEY SHARE',
        [projectId, actorId]
      );
      if (membership.rowCount !== 1)
        throw domainError('Not a project member', 403);
      const { rows: moving } = await client.query<{ status: TaskStatus }>(
        'SELECT status FROM tasks WHERE id = $1 AND project_id = $2 FOR UPDATE',
        [taskId, projectId]
      );
      const previous = moving[0]?.status;
      if (!previous) throw domainError('Task not found', 404);

      const { rows: destination } = await client.query<{ id: string }>(
        `SELECT id FROM tasks
         WHERE project_id = $1 AND id <> $2 AND status = ANY($3::text[])
         ORDER BY ${boardOrder} FOR UPDATE`,
        [projectId, taskId, lane === 'code_review' ? [lane, 'done'] : [lane]]
      );
      const orderedIds = destination.map(({ id }) => id);
      const index = beforeTaskId
        ? orderedIds.indexOf(beforeTaskId)
        : orderedIds.length;
      if (index === -1)
        throw domainError(
          'The destination changed. Refresh the board and try again.',
          409
        );
      orderedIds.splice(index, 0, taskId);
      const status =
        previous === 'done' && lane === 'code_review' ? previous : lane;
      await client.query(
        `UPDATE tasks AS t
         SET board_position = ordered.position,
             status = CASE WHEN t.id = $2 THEN $3 ELSE t.status END,
             updated_at = CASE WHEN t.id = $2 AND t.status <> $3 THEN NOW() ELSE t.updated_at END
         FROM unnest($1::varchar[]) WITH ORDINALITY AS ordered(id, position)
         WHERE t.id = ordered.id AND t.project_id = $4`,
        [orderedIds, taskId, status, projectId]
      );
      if (status !== previous) {
        await client.query(
          'INSERT INTO task_activities (id, task_id, actor_id, type, message, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
          [
            newId(),
            taskId,
            actorId,
            'status_changed',
            `Status changed from ${labels[previous]} to ${labels[status]}`,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
      `UPDATE tasks SET title=$2, description=$3, assigned_to=$4,
        board_position=CASE
          WHEN $5::text IS NOT NULL AND status <> $5
            AND NOT (status IN ('done', 'code_review') AND $5 IN ('done', 'code_review'))
          THEN NULL ELSE board_position END,
        status=COALESCE($5, status), updated_at=NOW() WHERE id=$1`,
      [
        taskId,
        updates.title === undefined ? task.title : updates.title.trim(),
        updates.description === undefined
          ? task.description
          : updates.description?.trim() || null,
        updates.assignedTo === undefined
          ? task.assignedTo?._id || null
          : updates.assignedTo || null,
        updates.status ?? null,
      ]
    );
    if (nextStatus !== task.status)
      await addActivity(
        taskId,
        actorId,
        'status_changed',
        `Status changed from ${labels[task.status as TaskStatus]} to ${labels[nextStatus as TaskStatus]}`
      );
    if (updates.title !== undefined || updates.description !== undefined)
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
