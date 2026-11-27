import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { addUserToProject, getAllProjects } from '../api/projects';
import { getCurrentUser, getUsers } from '../api/users';
import type { User } from '../types';
import AdminProjectsPage from './AdminProjects';

vi.mock('../api/projects', () => ({
  addUserToProject: vi.fn(),
  createProject: vi.fn(),
  getAllProjects: vi.fn(),
  removeUserFromProject: vi.fn(),
}));
vi.mock('../api/users', () => ({
  createUser: vi.fn(),
  getCurrentUser: vi.fn(),
  getUsers: vi.fn(),
}));

const admin: User = {
  _id: 'admin',
  name: 'Workspace Admin',
  email: 'admin@example.test',
  role: 'admin',
};
const automation: User = {
  _id: 'automation',
  name: 'MCP Automation',
  email: 'automation@example.test',
  role: 'user',
};
const member: User = {
  _id: 'member',
  name: 'New Member',
  email: 'member@example.test',
  role: 'user',
};
const privateProject = {
  _id: 'mcp-project',
  name: 'MCP-created project',
  members: [automation],
};

function renderAdmin() {
  return render(
    <MemoryRouter>
      <AdminProjectsPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAllProjects).mockResolvedValue([
    { _id: 'joined', name: 'Joined project', members: [admin] },
    privateProject,
  ]);
  vi.mocked(getCurrentUser).mockResolvedValue(admin);
  vi.mocked(getUsers).mockResolvedValue([admin, automation, member]);
});

test('lists projects outside the admin membership and supports adding an existing user and the admin', async () => {
  vi.mocked(addUserToProject).mockResolvedValue(undefined);
  renderAdmin();

  await screen.findByRole('heading', { name: 'Joined project' });
  expect(screen.queryByText(privateProject.name)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'All Projects' }));
  const card = within(
    screen
      .getByRole('heading', { name: privateProject.name })
      .closest('article')!
  );
  const select = card.getByRole('combobox');
  const boardName = `Open board for ${privateProject.name}`;
  expect(card.queryByRole('link', { name: boardName })).not.toBeInTheDocument();
  expect(
    card.queryByRole('option', { name: /MCP Automation/ })
  ).not.toBeInTheDocument();

  fireEvent.change(select, { target: { value: member._id } });
  fireEvent.click(card.getByRole('button', { name: 'Add' }));
  expect(await card.findByText(member.name)).toBeInTheDocument();
  expect(addUserToProject).toHaveBeenNthCalledWith(
    1,
    privateProject._id,
    member._id
  );

  fireEvent.change(select, { target: { value: admin._id } });
  fireEvent.click(card.getByRole('button', { name: 'Add' }));
  expect(await card.findByRole('link', { name: boardName })).toHaveAttribute(
    'href',
    '/projects/mcp-project'
  );
  expect(addUserToProject).toHaveBeenNthCalledWith(
    2,
    privateProject._id,
    admin._id
  );

  fireEvent.click(screen.getByRole('button', { name: 'My Projects' }));
  expect(
    screen.getByRole('heading', { name: privateProject.name })
  ).toBeInTheDocument();
});

test('reports a failed membership update and keeps the board link restricted', async () => {
  vi.mocked(addUserToProject).mockRejectedValue({
    response: { data: { message: 'User already in project' } },
  });
  renderAdmin();
  fireEvent.click(screen.getByRole('button', { name: 'All Projects' }));
  const select = await screen.findByRole('combobox', {
    name: `Add a user to ${privateProject.name}`,
  });
  const card = within(select.closest('article')!);

  fireEvent.change(select, { target: { value: admin._id } });
  fireEvent.click(card.getByRole('button', { name: 'Add' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'User already in project'
  );
  expect(card.queryByRole('link')).not.toBeInTheDocument();
  expect(card.getByRole('button', { name: 'Add' })).toBeEnabled();
});
