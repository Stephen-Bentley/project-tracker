import React, { useEffect, useRef, useState } from 'react';
import { avatarSource } from '../utils/avatar';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

import {
  Task,
  TaskSchedule,
  TaskStatus,
  taskPriorityLabels,
} from '../types/task';
import { formatCalendarDate } from '../utils/calendarDate';
import { User } from '../types/index';
import {
  getTasksByProject,
  createTask,
  moveBoardTask,
  updateTaskDetails,
  uploadTaskImages,
  addTaskComment,
} from '../api/tasks';
import { getProjectById } from '../api/projects';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import './ProjectBoard.css';

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

const normalizeTask = (task: Task): Task =>
  task.status === 'done' ? { ...task, status: 'code_review' } : task;

const ProjectBoard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [ProjectName, setProjectName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [movePending, setMovePending] = useState(false);
  const [moveError, setMoveError] = useState('');
  const moving = useRef(false);
  const currentProject = useRef(projectId);
  const boardElement = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<string | null>(null);
  currentProject.current = projectId;

  useEffect(() => {
    if (movePending || !restoreFocus.current) return;
    if (document.activeElement === document.body) {
      const cards =
        boardElement.current?.querySelectorAll<HTMLElement>('[data-task-id]');
      Array.from(cards ?? [])
        .find((card) => card.dataset.taskId === restoreFocus.current)
        ?.focus();
    }
    restoreFocus.current = null;
  }, [movePending]);

  // Load tasks and project members
  useEffect(() => {
    if (!projectId) return;
    setMoveError('');

    const load = async () => {
      try {
        const [tasksData, projectData] = await Promise.all([
          getTasksByProject(projectId),
          getProjectById(projectId),
        ]);
        setProjectName(projectData.name);
        setTasks(tasksData.map(normalizeTask));
        setMembers(projectData.members);
      } catch (err) {
        console.error(err);
        alert('Failed to load project or tasks');
        navigate('/projects');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId, navigate]);

  const handleCreateTask = async (
    title: string,
    description?: string,
    assignedTo?: string,
    schedule?: TaskSchedule
  ) => {
    if (!projectId) return;

    await createTask(projectId, title, description, assignedTo, schedule);
    const updatedTasks = await getTasksByProject(projectId);
    setTasks(updatedTasks.map(normalizeTask));
    setShowModal(false);
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || moving.current) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId as TaskStatus;
    const task = tasks.find((candidate) => candidate._id === draggableId);
    if (!task) return;
    const beforeMove = tasks;
    const targetTasks = tasksByStatus(newStatus).filter(
      (candidate) => candidate._id !== draggableId
    );
    const beforeTaskId = targetTasks[destination.index]?._id ?? null;
    const next = tasks.filter((candidate) => candidate._id !== draggableId);
    const insertAt = beforeTaskId
      ? next.findIndex((candidate) => candidate._id === beforeTaskId)
      : next.length;
    next.splice(insertAt, 0, { ...task, status: newStatus });

    moving.current = true;
    setMovePending(true);
    setMoveError('');
    setTasks(next);
    try {
      await moveBoardTask(draggableId, newStatus, beforeTaskId);
    } catch {
      if (currentProject.current === projectId) {
        setTasks(beforeMove);
        setMoveError(
          'Could not save the card move. Refresh the board and try again.'
        );
      }
    } finally {
      if (result.mode === 'SNAP' && currentProject.current === projectId) {
        restoreFocus.current = draggableId;
      }
      moving.current = false;
      setMovePending(false);
    }
  };

  const refreshTasks = async () => {
    if (!projectId) return;
    const updatedTasks = await getTasksByProject(projectId);
    setTasks(updatedTasks.map(normalizeTask));
    setSelectedTask((current) =>
      current
        ? updatedTasks.find((task) => task._id === current._id) || null
        : null
    );
  };

  const saveTaskDetails = async (
    title: string,
    description: string,
    assignedTo: string,
    status: TaskStatus,
    schedule: TaskSchedule
  ) => {
    if (!selectedTask) return;
    await updateTaskDetails(
      selectedTask._id,
      title,
      description,
      assignedTo,
      status,
      schedule
    );
    await refreshTasks();
  };

  const addTaskImages = async (files: File[]) => {
    if (!selectedTask) return;
    await uploadTaskImages(selectedTask._id, files);
    await refreshTasks();
  };

  const addComment = async (body: string) => {
    if (!selectedTask) return;
    await addTaskComment(selectedTask._id, body);
    await refreshTasks();
  };

  const assignedUser = (task: Task) => {
    if (task.assignedTo && typeof task.assignedTo === 'object')
      return task.assignedTo;
    return members.find((member) => member._id === task.assignedTo);
  };

  const initials = (name: string) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const visibleStatuses = showCompleted
    ? STATUSES
    : STATUSES.filter((status) => status !== 'completed');

  const query = search.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    if (
      query &&
      !task.title.toLowerCase().includes(query) &&
      !task.description?.toLowerCase().includes(query)
    ) {
      return false;
    }
    if (assigneeFilter === 'unassigned') return !assignedUser(task);
    if (assigneeFilter === 'all') return true;
    return assignedUser(task)?._id === assigneeFilter;
  });

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((task) => task.status === status);

  const hasNoMatches =
    (query !== '' || assigneeFilter !== 'all') &&
    !filteredTasks.some((task) => visibleStatuses.includes(task.status));

  if (loading) return <p style={{ padding: 24 }}>Loading board...</p>;

  return (
    <main className="board-page">
      <div className="board-toolbar">
        <div>
          <p className="board-eyebrow">{ProjectName}</p>
          <h1 className="board-title">Project Board</h1>
        </div>
        <div className="board-actions">
          <button
            className="add-task-button"
            disabled={movePending}
            onClick={() => setShowModal(true)}
          >
            + Add task
          </button>
        </div>
      </div>

      <div className="board-filters" aria-label="Board filters">
        <div className="board-search">
          <label className="board-filter">
            <span>Search tickets</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="clear-board-search"
            disabled={!search}
            onClick={() => setSearch('')}
          >
            Clear search
          </button>
        </div>
        <label className="board-filter">
          <span>Assignee</span>
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option value={member._id} key={member._id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="completed-filter">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
          />
          Show completed
        </label>
      </div>

      {hasNoMatches && (
        <p className="board-no-matches" role="status">
          No tickets match your filters.
        </p>
      )}
      {moveError && (
        <p className="board-move-error" role="alert">
          {moveError}
        </p>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          ref={boardElement}
          className={`board board--${visibleStatuses.length}`}
        >
          {visibleStatuses.map((status) => {
            const statusTasks = tasksByStatus(status);
            return (
              <Droppable droppableId={status} key={status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`board-column board-column--${status}`}
                  >
                    <div className="column-header">
                      <h3 className="column-title">{STATUS_LABELS[status]}</h3>
                      <span className="column-count">{statusTasks.length}</span>
                    </div>

                    <div className="column-dropzone">
                      {statusTasks.map((task, index) => (
                        <Draggable
                          key={task._id}
                          draggableId={task._id}
                          index={index}
                          isDragDisabled={movePending}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                              className="task-card"
                              data-task-id={task._id}
                              onClick={() => {
                                if (!moving.current) setSelectedTask(task);
                              }}
                            >
                              <h4 className="task-title">{task.title}</h4>
                              {task.description && (
                                <p className="task-description">
                                  {task.description}
                                </p>
                              )}
                              {(task.priority || task.dueDate) && (
                                <div className="task-card-schedule">
                                  {task.priority && (
                                    <span>
                                      {taskPriorityLabels[task.priority]}{' '}
                                      priority
                                    </span>
                                  )}
                                  {task.dueDate && (
                                    <time dateTime={task.dueDate}>
                                      Due {formatCalendarDate(task.dueDate)}
                                    </time>
                                  )}
                                </div>
                              )}

                              <div
                                className="task-person"
                                title={
                                  assignedUser(task)
                                    ? `Assigned to ${assignedUser(task)?.name}`
                                    : 'Unassigned'
                                }
                              >
                                <div className="task-avatar">
                                  {assignedUser(task)?.avatarUrl ? (
                                    <img
                                      src={avatarSource(
                                        assignedUser(task)?.avatarUrl
                                      )}
                                      alt=""
                                    />
                                  ) : assignedUser(task) ? (
                                    initials(assignedUser(task)?.name || '')
                                  ) : (
                                    '—'
                                  )}
                                </div>
                                <span>
                                  {assignedUser(task)?.name || 'Unassigned'}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {statusTasks.length === 0 && (
                        <div className="empty-column">Drop tasks here</div>
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {showModal && (
        <CreateTaskModal
          members={members}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateTask}
        />
      )}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          members={members}
          onClose={() => setSelectedTask(null)}
          onSave={saveTaskDetails}
          onUpload={addTaskImages}
          onComment={addComment}
        />
      )}
    </main>
  );
};

export default ProjectBoard;
