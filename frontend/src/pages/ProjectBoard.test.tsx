import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getProjectById } from '../api/projects';
import { getTasksByProject } from '../api/tasks';
import type { Task } from '../types/task';
import ProjectBoard from './ProjectBoard';

vi.mock('../api/projects', () => ({ getProjectById: vi.fn() }));
vi.mock('../api/tasks', () => ({ getTasksByProject: vi.fn() }));

const alex = {
  _id: 'alex',
  name: 'Alex',
  email: 'alex@example.test',
  role: 'user' as const,
};
const beth = {
  _id: 'beth',
  name: 'Beth',
  email: 'beth@example.test',
  role: 'user' as const,
};
const task = (
  fields: Omit<Task, 'images' | 'comments' | 'activities'>
): Task => ({
  images: [],
  comments: [],
  activities: [],
  ...fields,
});

test('searches titles and descriptions, combines with filters and clears without changing them', async () => {
  vi.mocked(getProjectById).mockResolvedValue({
    _id: 'board',
    name: 'Board',
    members: [alex, beth],
  });
  vi.mocked(getTasksByProject).mockResolvedValue([
    task({
      _id: '1',
      title: 'Nightly invoice',
      status: 'todo',
      assignedTo: beth._id,
    }),
    task({
      _id: '2',
      title: 'Release notes',
      status: 'in_progress',
      description: 'Include the NIGHTLY changes',
      assignedTo: alex,
    }),
    task({
      _id: '3',
      title: 'Archived report',
      status: 'completed',
      description: 'nightly report',
      assignedTo: beth,
    }),
    task({ _id: '4', title: 'Other work', status: 'todo', assignedTo: beth }),
  ]);

  render(
    <MemoryRouter initialEntries={['/projects/board']}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectBoard />} />
      </Routes>
    </MemoryRouter>
  );

  const search = await screen.findByRole('searchbox', {
    name: 'Search tickets',
  });
  const clear = screen.getByRole('button', { name: 'Clear search' });
  expect(clear).toBeDisabled();
  fireEvent.change(search, { target: { value: '  NiGhTlY ' } });
  expect(screen.getByText('Nightly invoice')).toBeInTheDocument();
  expect(screen.getByText('Release notes')).toBeInTheDocument();
  expect(screen.queryByText('Other work')).not.toBeInTheDocument();
  expect(screen.queryByText('Archived report')).not.toBeInTheDocument();

  const assignee = screen.getByRole('combobox', { name: 'Assignee' });
  fireEvent.change(assignee, { target: { value: beth._id } });
  expect(screen.queryByText('Release notes')).not.toBeInTheDocument();
  const completed = screen.getByRole('checkbox', { name: 'Show completed' });
  fireEvent.click(completed);
  expect(screen.getByText('Archived report')).toBeInTheDocument();

  fireEvent.change(search, { target: { value: 'no such ticket' } });
  expect(
    screen.getByText('No tickets match your filters.')
  ).toBeInTheDocument();
  fireEvent.click(clear);
  expect(search).toHaveValue('');
  expect(assignee).toHaveValue(beth._id);
  expect(completed).toBeChecked();
  expect(screen.getByText('Other work')).toBeInTheDocument();
  expect(screen.getByText('Archived report')).toBeInTheDocument();
  expect(
    screen.queryByText('No tickets match your filters.')
  ).not.toBeInTheDocument();
});
