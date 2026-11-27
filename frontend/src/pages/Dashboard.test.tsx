import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { getDashboard } from '../api/dashboard';
import { DashboardData } from '../types/dashboard';

vi.mock('../api/dashboard', () => ({
  getDashboard: vi.fn(),
}));

const dashboardData: DashboardData = {
  summary: { waitingOnMe: 1, blocked: 0, inReview: 1, repliesNeeded: 1 },
  activeWork: [
    {
      id: 'task-1',
      projectId: 'project-1',
      projectName: 'Payments',
      title: 'Reply to review feedback',
      status: 'code_review',
      updatedAt: new Date().toISOString(),
      latestUpdate: 'Can you check this?',
      latestUpdateAuthor: 'Alex',
      waitingOnMe: true,
      blocked: false,
      inReview: true,
      repliesNeeded: true,
      hasComments: true,
    },
  ],
  todaysFocus: [],
  watchList: [],
  recentUpdates: [],
  generatedAt: new Date().toISOString(),
};

test('shows personal work and filters the task queue', async () => {
  vi.mocked(getDashboard).mockResolvedValue(dashboardData);

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

  expect(
    await screen.findByText('Reply to review feedback')
  ).toBeInTheDocument();
  expect(screen.getAllByText('Waiting on me')[0]).toBeInTheDocument();
  expect(screen.getByText('Payments')).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('Search your tasks'), {
    target: { value: 'does not exist' },
  });

  await waitFor(() => {
    expect(
      screen.getByText('No active tasks match this view.')
    ).toBeInTheDocument();
  });
});

test('surfaces overdue tickets contributed by the project queue', async () => {
  vi.mocked(getDashboard).mockResolvedValue({
    ...dashboardData,
    overdueWork: [
      {
        taskId: 'overdue-1',
        projectId: 'project-1',
        projectName: 'Payments',
        title: 'Check expired invoice',
        dueDate: '2026-01-15',
      },
    ],
  });
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
  expect(
    await screen.findByRole('heading', { name: 'Overdue work' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /Check expired invoice/ })
  ).toBeInTheDocument();
});
