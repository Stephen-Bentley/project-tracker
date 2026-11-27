import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TaskDetailsModal from './TaskDetailsModal';
import { Task } from '../types/task';
import { User } from '../types';

vi.mock('../api/api', () => ({
  __esModule: true,
  default: {
    defaults: { baseURL: 'http://localhost:5000/api' },
  },
}));

const currentUser: User = {
  _id: 'user-1',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  role: 'user',
};

const task: Task = {
  _id: 'task-1',
  title: 'Prepare release notes',
  description: 'Summarize the changes.',
  status: 'code_review',
  assignedTo: currentUser,
  images: [],
  comments: [
    {
      _id: 'comment-1',
      author: currentUser,
      body: 'Please include the migration note.',
      createdAt: '2026-08-14T08:00:00.000Z',
    },
  ],
  activities: [
    {
      _id: 'activity-1',
      type: 'status_changed',
      message: 'Status changed from In progress to Code review',
      actor: currentUser,
      createdAt: '2026-08-14T08:05:00.000Z',
    },
  ],
};

test('shows comments, activity history, and status choices', () => {
  render(
    <TaskDetailsModal
      task={task}
      members={[currentUser]}
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onUpload={vi.fn().mockResolvedValue(undefined)}
      onComment={vi.fn().mockResolvedValue(undefined)}
    />
  );

  expect(
    screen.getByText('Please include the migration note.')
  ).toBeInTheDocument();
  expect(
    screen.getByText('Status changed from In progress to Code review')
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Add a comment')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Completed' })).toBeInTheDocument();
  expect(screen.getByLabelText('Priority')).toHaveValue('');
  expect(screen.getByLabelText('Due date')).toHaveValue('');
});

test('submits a new comment through the modal callback', async () => {
  const onComment = vi.fn().mockResolvedValue(undefined);

  render(
    <TaskDetailsModal
      task={task}
      members={[currentUser]}
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onUpload={vi.fn().mockResolvedValue(undefined)}
      onComment={onComment}
    />
  );

  fireEvent.change(screen.getByLabelText('Add a comment'), {
    target: { value: 'Looks good to me.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));

  await waitFor(() =>
    expect(onComment).toHaveBeenCalledWith('Looks good to me.')
  );
  await waitFor(() =>
    expect(screen.getByText('Comment added.')).toBeInTheDocument()
  );
});

test('clears the priority and due date explicitly when editing a ticket', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <TaskDetailsModal
      task={{ ...task, priority: 'high', dueDate: '2026-12-05' }}
      members={[currentUser]}
      onClose={vi.fn()}
      onSave={onSave}
      onUpload={vi.fn()}
      onComment={vi.fn()}
    />
  );

  expect(screen.getByLabelText('Priority')).toHaveValue('high');
  expect(screen.getByLabelText('Due date')).toHaveValue('2026-12-05');
  fireEvent.change(screen.getByLabelText('Priority'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Clear due date' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      task.title,
      task.description,
      currentUser._id,
      task.status,
      {
        priority: null,
        dueDate: null,
      }
    )
  );
});

test('omits both scheduling fields when an existing ticket edit leaves them unchanged', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <TaskDetailsModal
      task={{ ...task, priority: 'high', dueDate: '2026-12-05' }}
      members={[currentUser]}
      onClose={vi.fn()}
      onSave={onSave}
      onUpload={vi.fn()}
      onComment={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText('Heading'), {
    target: { value: 'Updated title' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      'Updated title',
      task.description,
      currentUser._id,
      task.status,
      {}
    )
  );
});
