import React, { FormEvent, useState } from 'react';
import { User } from '../types';

interface Props {
  members: User[];
  onClose: () => void;
  onCreate: (
    title: string,
    description: string,
    assignedTo: string
  ) => Promise<void>;
}

const CreateTaskModal: React.FC<Props> = ({ members, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const create = async (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setMessage('Title is required.');
      return;
    }

    setMessage('');
    setCreating(true);

    try {
      await onCreate(title.trim(), description.trim(), assignedTo);
      setMessage('Task created.');
      onClose();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Unable to create the task.');
    } finally {
      setCreating(false);
    }
  };

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
        aria-labelledby="create-task-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="task-modal-header">
          <div>
            <p>New task</p>
            <h2 id="create-task-modal-title">Create task</h2>
          </div>

          <button
            type="button"
            className="task-modal-close"
            onClick={onClose}
            aria-label="Close create task modal"
          >
            ×
          </button>
        </div>

        <form className="task-details-form" onSubmit={create}>
          <label>
            Heading
            <input
              required
              value={title}
              placeholder="Task title"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              placeholder="Description optional"
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

          {message && <p className="task-modal-message">{message}</p>}

          <div className="task-modal-actions">
            <button
              type="button"
              className="task-cancel"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>

            <button type="submit" className="task-save" disabled={creating}>
              {creating ? 'Creating...' : 'Create task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreateTaskModal;