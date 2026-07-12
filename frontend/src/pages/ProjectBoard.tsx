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
  assignUserToTask,
} from '../api/tasks';
import { getProjectById } from '../api/projects';
import CreateTaskModal from '../components/CreateTaskModal';
import './ProjectBoard.css';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

const ProjectBoard: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Load tasks and project members
  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      try {
        const [tasksData, projectData] = await Promise.all([
          getTasksByProject(projectId),
          getProjectById(projectId),
        ]);
        setTasks(tasksData);
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

  const handleCreateTask = async (title: string, description?: string) => {
    if (!projectId) return;

    try {
      await createTask(projectId, title, description);
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

  const handleAssignUser = async (taskId: string, userId: string) => {
    try {
      await assignUserToTask(taskId, userId);
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId ? { ...task, assignedTo: userId } : task
        )
      );
    } catch {
      alert('Failed to assign user');
    }
  };

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

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

  if (loading) return <p style={{ padding: 24 }}>Loading board...</p>;

  return (
    <main className="board-page">
      <div className="board-toolbar">
        <div>
          <p className="board-eyebrow">Project workspace</p>
          <h1 className="board-title">Project Board</h1>
        </div>
        <button className="add-task-button" onClick={() => setShowModal(true)}>
          + Add task
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board">
          {STATUSES.map((status) => {
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
                      <h3 className="column-title">
                        {status.replace('_', ' ')}
                      </h3>
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
                                      src={avatarSource(assignedUser(task)?.avatarUrl)}
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

                              <div>
                                <label
                                  className="task-assignee"
                                  htmlFor={`assignee-${task._id}`}
                                >
                                  Assignee
                                </label>
                                <select
                                  id={`assignee-${task._id}`}
                                  className="task-select"
                                  value={
                                    task.assignedTo &&
                                    typeof task.assignedTo === 'object'
                                      ? task.assignedTo._id
                                      : (task.assignedTo ?? '')
                                  }
                                  onChange={(e) =>
                                    handleAssignUser(task._id, e.target.value)
                                  }
                                >
                                  <option value="">Unassigned</option>
                                  {members.map((member) => (
                                    <option key={member._id} value={member._id}>
                                      {member.name}
                                    </option>
                                  ))}
                                </select>
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
          onClose={() => setShowModal(false)}
          onCreate={handleCreateTask}
        />
      )}
    </main>
  );
};

export default ProjectBoard;
