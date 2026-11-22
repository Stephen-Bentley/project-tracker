import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskStatus } from '../types/task';
import { User } from '../types/index';
import {
  getTasksByProject,
  updateTaskStatus,
  updateTaskDetails,
} from '../api/tasks';
import { getProjectById } from '../api/projects';
import { avatarSource } from '../utils/avatar';
import './TaskDetails.css';

const STATUSES: TaskStatus[] = [
  'todo',
  'in_progress',
  'code_review',
  'completed',
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  code_review: 'Code review',
  completed: 'Completed',
  done: 'Code review',
};

interface ProjectInfo {
  _id: string;
  name: string;
}

const TaskDetails: React.FC = () => {
  const { taskId, projectId } = useParams<{
    taskId: string;
    projectId: string;
  }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!taskId || !projectId) {
      navigate('/projects');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [tasksData, projectData] = await Promise.all([
          getTasksByProject(projectId),
          getProjectById(projectId),
        ]);

        const foundTask = tasksData.find((t) => t._id === taskId);

        if (!foundTask) {
          setError('Task not found');
          navigate('/projects');
          return;
        }

        setTask(foundTask);
        setProjectInfo(projectData);

        // Initialize form states
        setTitle(foundTask.title);
        setDescription(foundTask.description || '');
        setAssignedTo(
          typeof foundTask.assignedTo === 'object'
            ? foundTask.assignedTo?._id || ''
            : foundTask.assignedTo || ''
        );
        setStatus(
          foundTask.status === 'done' ? 'code_review' : foundTask.status
        );
      } catch (err) {
        console.error(err);
        setError('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [taskId, projectId, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !taskId || !projectId) return;

    setSaving(true);
    try {
      await updateTaskDetails(taskId, title, description, assignedTo, status);
      // Update local state to keep everything in sync
      setTask({
        ...task,
        title,
        description,
        assignedTo: assignedTo || (task.assignedTo as any),
        status,
      });
      // Refresh task to get updated timestamp and potentially other fields from server
      const refreshedTasks = await getTasksByProject(projectId);
      const refreshedTask = refreshedTasks.find((t) => t._id === taskId);
      if (refreshedTask) setTask(refreshedTask);
    } catch (err) {
      alert('Failed to save task changes');
    } finally {
      setSaving(false);
    }
  };

  const getAssignedUser = (idOrUser: string | User | null | undefined) => {
    if (!idOrUser) return null;
    if (typeof idOrUser === 'object' && 'name' in idOrUser) {
      return idOrUser as User;
    }
    return null;
  };

  const assignedToUser = getAssignedUser(task?.assignedTo);
  const projectName = projectInfo?.name || '';

  if (loading) {
    return (
      <div className="task-details-page task-details-page--loading">
        Loading task...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="task-details-page">
        <h1>Task not found</h1>
        <p>{error || 'The requested task could not be found.'}</p>
        <button onClick={() => navigate('/projects')}>Back to Projects</button>
      </div>
    );
  }

  return (
    <main className="task-details-page">
      <nav className="task-details-nav">
        <button onClick={() => navigate(`/projects/${projectId}`)}>
          ← Back to {projectName || 'Project'}
        </button>
      </nav>

      <form className="task-details-form-container" onSubmit={handleSave}>
        <div className="task-details-header-container">
          <div className="task-details-title-section">
            <input
              className="task-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
            <span className={`status-badge status-badge--${status}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>

          <div className="task-actions-container">
            <div className="status-select-wrapper">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="assignee-select-wrapper">
              <label>Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {/* In a real app, we would list all members of the project here */}
                <option value={assignedTo}>
                  {assignedToUser?.name || 'Unassigned'}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="task-details-main-content">
          <div className="task-details-column-left">
            <section className="task-details-section">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={12}
                placeholder="Describe the task..."
              />
            </section>

            <section className="task-details-section">
              <div className="section-header">
                <strong className="section-title">
                  Images ({task.images?.length || 0}/3)
                </strong>
              </div>
              <div className="task-image-grid">
                {task.images?.map((image) => (
                  <div key={image._id} className="image-container">
                    <img
                      src={`/api/tasks/${taskId}/images/${image._id}`}
                      alt=""
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="task-details-section">
              <div className="section-header">
                <strong className="section-title">
                  Comments ({task.comments?.length || 0})
                </strong>
              </div>
              <div className="task-comments-list">
                {task.comments?.length ? (
                  task.comments.map((comment) => (
                    <article key={comment._id} className="task-comment-item">
                      <div className="task-comment-meta">
                        <span className="comment-author">
                          {typeof comment.author === 'object'
                            ? (comment.author as User).name
                            : comment.author}
                        </span>
                        <time dateTime={comment.createdAt}>
                          {new Date(comment.createdAt).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </time>
                      </div>
                      <p className="comment-body">{comment.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="task-history-empty">No comments yet.</p>
                )}
              </div>
            </section>
          </div>

          <aside className="task-details-column-right">
            <section className="task-details-section task-history-section">
              <div className="section-header">
                <strong className="section-title">
                  Activity ({task.activities?.length || 0})
                </strong>
              </div>
              <div className="task-activity-list">
                {task.activities?.length ? (
                  [...task.activities].reverse().map((activity) => (
                    <div className="task-activity-item" key={activity._id}>
                      <span className="task-activity-dot" aria-hidden="true" />
                      <div className="task-activity-content">
                        <p>{activity.message}</p>
                        <small>
                          {typeof activity.actor === 'object' &&
                          'name' in activity.actor
                            ? activity.actor.name
                            : activity.actor}{' '}
                          ·{' '}
                          {new Date(activity.createdAt).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="task-history-empty">No activity yet.</p>
                )}
              </div>
            </section>

            <div className="task-form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/projects/${projectId}`)}
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
};

export default TaskDetails;
