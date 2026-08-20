import React, { useEffect, useState } from 'react';
import { avatarSource } from '../utils/avatar';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

import { Task, TaskStatus } from '../types/task';
import { User } from '../types/index';
import {
  getTasksByProject,
  createTask,
  updateTaskStatus,
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

  // Load tasks and project members
  useEffect(() => {
    if (!projectId) return;

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
    assignedTo?: string
  ) => {
    if (!projectId) return;

    try {
      await createTask(projectId, title, description, assignedTo);
      const updatedTasks = await getTasksByProject(projectId);
      setTasks(updatedTasks);
      setShowModal(false);
    } catch {
      alert('Failed to create task');
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((task) =>
        task._id === draggableId ? { ...task, status: newStatus } : task
      )
    );

    try {
      await updateTaskStatus(draggableId, newStatus);
    } catch {
      alert('Failed to update task status');
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
    status: TaskStatus
  ) => {
    if (!selectedTask) return;
    await updateTaskDetails(
      selectedTask._id,
      title,
      description,
      assignedTo,
      status
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

  const filteredTasks = tasks.filter((task) => {
    if (assigneeFilter === 'unassigned') return !assignedUser(task);
    if (assigneeFilter === 'all') return true;
    return assignedUser(task)?._id === assigneeFilter;
  });

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((task) => task.status === status);

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
            onClick={() => setShowModal(true)}
          >
            + Add task
          </button>
        </div>
      </div>

      <div className="board-filters" aria-label="Board filters">
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className={`board board--${visibleStatuses.length}`}>
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
                              onClick={() => setSelectedTask(task)}
                            >
                              <h4 className="task-title">{task.title}</h4>
                              {task.description && (
                                <p className="task-description">
                                  {task.description}
                                </p>
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
          onCreate={async (title, description, assignedTo) => {
            await handleCreateTask(title, description, assignedTo);
          }}
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
