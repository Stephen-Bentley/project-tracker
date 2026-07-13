import React, { FormEvent, useEffect, useState } from 'react';
import { Task } from '../types/task';
import { User } from '../types';
import { apiAssetSource } from '../utils/avatar';

interface Props {
  task: Task;
  members: User[];
  onClose: () => void;
  onSave: (
    title: string,
    description: string,
    assignedTo: string
  ) => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
}

const TaskDetailsModal: React.FC<Props> = ({
  task,
  members,
  onClose,
  onSave,
  onUpload,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assignedTo, setAssignedTo] = useState(
    typeof task.assignedTo === 'object'
      ? task.assignedTo?._id || ''
      : task.assignedTo || ''
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(
      typeof task.assignedTo === 'object'
        ? task.assignedTo?._id || ''
        : task.assignedTo || ''
    );
  }, [task]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      await onSave(title, description, assignedTo);
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
