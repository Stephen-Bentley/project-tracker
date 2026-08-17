import React, { FormEvent, useEffect, useState } from 'react';
import { Task, TaskStatus } from '../types/task';
import { User } from '../types';
import { apiAssetSource } from '../utils/avatar';

interface Props {
  task: Task;
  members: User[];
  onClose: () => void;
  onSave: (
    title: string,
    description: string,
    assignedTo: string,
    status: TaskStatus
  ) => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
  onComment: (body: string) => Promise<void>;
}

const TaskDetailsModal: React.FC<Props> = ({
  task,
  members,
  onClose,
  onSave,
  onUpload,
  onComment,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assignedTo, setAssignedTo] = useState(
    typeof task.assignedTo === 'object'
      ? task.assignedTo?._id || ''
      : task.assignedTo || ''
  );
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(
      typeof task.assignedTo === 'object'
        ? task.assignedTo?._id || ''
        : task.assignedTo || ''
    );
    setStatus(task.status === 'done' ? 'code_review' : task.status);
  }, [task]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      await onSave(title, description, assignedTo, status);
      setMessage('Task saved.');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Unable to save the task.');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage('');
    setUploading(true);
    try {
      await onUpload(Array.from(files));
      setMessage('Image uploaded.');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Unable to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const addComment = async () => {
    if (!commentBody.trim()) return;
    setMessage('');
    setCommenting(true);
    try {
      await onComment(commentBody.trim());
      setCommentBody('');
      setMessage('Comment added.');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Unable to add comment.');
    } finally {
      setCommenting(false);
    }
  };

  const displayName = (value: User | string) =>
    typeof value === 'object' ? value.name : 'Unknown user';

  const formatDate = (value: string) =>
    new Date(value).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const imageSlotsRemaining = 3 - (task.images?.length || 0);

  return (
    <div
      className="task-modal-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="task-modal-header">
          <div>
            <p>Task details</p>
            <h2 id="task-modal-title">Edit task</h2>
          </div>
          <button
            type="button"
            className="task-modal-close"
            onClick={onClose}
            aria-label="Close task details"
          >
            ×
          </button>
        </div>
        <form className="task-details-form" onSubmit={save}>
          <label>
            Heading
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            Assignee
            <select
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="code_review">Code review</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <div className="task-images-section">
            <div className="task-images-heading">
              <strong>Images</strong>
              <span>{task.images?.length || 0}/3</span>
            </div>
            {task.images?.length > 0 && (
              <div className="task-image-grid">
                {task.images.map((image) => {
                  const source = apiAssetSource(
                    `/api/tasks/${task._id}/images/${image._id}`
                  );
                  return (
                    <a
                      key={image._id}
                      href={source}
                      target="_blank"
                      rel="noreferrer"
                      title={image.filename}
                    >
                      <img src={source} alt={image.filename} />
                    </a>
                  );
                })}
              </div>
            )}
            {imageSlotsRemaining > 0 && (
              <label className="task-upload-control">
                <span>{uploading ? 'Uploading...' : 'Add images'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={uploading}
                  onChange={(event) => {
                    upload(event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            )}
            <small>JPG, PNG, WebP, or GIF — up to 3 MB each.</small>
          </div>
          <section className="task-history-section" aria-label="Comments and activity">
            <div className="task-images-heading">
              <strong>Comments</strong>
              <span>{task.comments?.length || 0}</span>
            </div>
            <div className="task-comments-list">
              {task.comments?.length ? (
                task.comments.map((comment) => (
                  <article className="task-comment" key={comment._id}>
                    <div className="task-history-meta">
                      <strong>{displayName(comment.author)}</strong>
                      <time dateTime={comment.createdAt}>
                        {formatDate(comment.createdAt)}
                      </time>
                    </div>
                    <p>{comment.body}</p>
                  </article>
                ))
              ) : (
                <p className="task-history-empty">No comments yet.</p>
              )}
            </div>
            <div className="task-comment-form">
              <textarea
                aria-label="Add a comment"
                placeholder="Write a comment..."
                maxLength={2000}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
              />
              <button
                type="button"
                className="task-save"
                disabled={commenting || !commentBody.trim()}
                onClick={() => void addComment()}
              >
                {commenting ? 'Adding...' : 'Add comment'}
              </button>
            </div>
          </section>
          <section className="task-history-section" aria-label="Activity history">
            <div className="task-images-heading">
              <strong>Activity history</strong>
              <span>{task.activities?.length || 0}</span>
            </div>
            <div className="task-activity-list">
              {task.activities?.length ? (
                [...task.activities].reverse().map((activity) => (
                  <div className="task-activity" key={activity._id}>
                    <span className="task-activity-dot" aria-hidden="true" />
                    <div>
                      <p>{activity.message}</p>
                      <small>
                        {displayName(activity.actor)} · {formatDate(activity.createdAt)}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="task-history-empty">No activity yet.</p>
              )}
            </div>
          </section>
          {message && <p className="task-modal-message">{message}</p>}
          <div className="task-modal-actions">
            <button type="button" className="task-cancel" onClick={onClose}>
              Close
            </button>
            <button className="task-save" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default TaskDetailsModal;
