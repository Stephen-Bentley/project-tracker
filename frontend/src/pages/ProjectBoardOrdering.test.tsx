import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getProjectById } from '../api/projects';
import { getTasksByProject, moveBoardTask } from '../api/tasks';
import type { Task } from '../types/task';
import ProjectBoard from './ProjectBoard';

vi.mock('../api/projects', () => ({ getProjectById: vi.fn() }));
vi.mock('../api/tasks', () => ({
  getTasksByProject: vi.fn(),
  moveBoardTask: vi.fn(),
}));

vi.mock('@hello-pangea/dnd', () => {
  const provided = {
    innerRef: () => {},
    droppableProps: {},
    draggableProps: {},
    dragHandleProps: { tabIndex: 0 },
  };
  const source = { droppableId: 'todo', index: 1 };
  return {
    DragDropContext: ({
      onDragEnd,
      children,
    }: {
      onDragEnd: (result: {
        draggableId: string;
        source: typeof source;
        destination: typeof source;
        mode?: 'SNAP';
      }) => void;
      children: ReactNode;
    }) => (
      <>
        <button
          onClick={() =>
            onDragEnd({
              draggableId: 'second',
              source,
              destination: { droppableId: 'todo', index: 0 },
            })
          }
        >
          Test reorder
        </button>
        <button
          onClick={() =>
            onDragEnd({
              draggableId: 'second',
              source,
              destination: { droppableId: 'in_progress', index: 0 },
              mode: 'SNAP',
            })
          }
        >
          Test cross-lane move
        </button>
        {children}
      </>
    ),
    Droppable: ({
      children,
    }: {
      children: (value: typeof provided) => ReactNode;
    }) => children(provided),
    Draggable: ({
      children,
    }: {
      children: (value: typeof provided) => ReactNode;
    }) => children(provided),
  };
});

const fixture = (id: string, status: Task['status']): Task => ({
  _id: id,
  title: id,
  status,
  images: [],
  comments: [],
  activities: [],
});

const setup = async () => {
  vi.resetAllMocks();
  vi.mocked(getProjectById).mockResolvedValue({
    _id: 'board',
    name: 'Board',
    members: [],
  });
  vi.mocked(getTasksByProject).mockResolvedValue([
    fixture('first', 'todo'),
    fixture('second', 'todo'),
    fixture('destination', 'in_progress'),
  ]);
  render(
    <MemoryRouter initialEntries={['/projects/board']}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectBoard />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText('first');
};

const lane = (name: string) =>
  within(screen.getByRole('heading', { name }).closest('.board-column')!);
const order = (name: string) =>
  lane(name)
    .getAllByRole('heading', { level: 4 })
    .map((card) => card.textContent);

test('reorders cards optimistically and saves a stable destination anchor', async () => {
  await setup();
  vi.mocked(moveBoardTask).mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Test reorder' }));
  expect(order('To do')).toEqual(['second', 'first']);
  expect(moveBoardTask).toHaveBeenCalledWith('second', 'todo', 'first');
  await act(async () => {});
});

test('restores the whole board and shows an error when a cross-lane save fails', async () => {
  await setup();
  let fail = () => {};
  vi.mocked(moveBoardTask).mockImplementation(
    () =>
      new Promise((_, reject) => {
        fail = () => reject(new Error('Move failed'));
      })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Test cross-lane move' }));
  expect(order('To do')).toEqual(['first']);
  expect(order('In progress')).toEqual(['second', 'destination']);
  expect(moveBoardTask).toHaveBeenCalledWith(
    'second',
    'in_progress',
    'destination'
  );
  await act(async () => fail());
  expect(order('To do')).toEqual(['first', 'second']);
  expect(order('In progress')).toEqual(['destination']);
  expect(screen.getByText('second').closest('[data-task-id]')).toHaveFocus();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Could not save the card move'
  );
});
