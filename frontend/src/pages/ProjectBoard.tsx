import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

import { Task, TaskStatus } from "../types/task";
import { User } from "../types/index";
import {
  getTasksByProject,
  createTask,
  updateTaskStatus,
  assignUserToTask,
} from "../api/tasks";
import { getProjectById } from "../api/projects";
import CreateTaskModal from "../components/CreateTaskModal";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

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
        alert("Failed to load project or tasks");
        navigate("/projects");
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
      alert("Failed to create task");
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
        task._id === draggableId ? { ...task, status: newStatus } : task,
      ),
    );

    try {
      await updateTaskStatus(draggableId, newStatus);
    } catch {
      alert("Failed to update task status");
    }
  };

  const handleAssignUser = async (taskId: string, userId: string) => {
    try {
      await assignUserToTask(taskId, userId);
      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId ? { ...task, assignedTo: userId } : task,
        ),
      );
    } catch {
      alert("Failed to assign user");
    }
  };

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

  if (loading) return <p style={{ padding: 24 }}>Loading board...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "#16a34a" }}>Project Board</h1>

      <button style={styles.addButton} onClick={() => setShowModal(true)}>
        + Add Task
      </button>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={styles.board}>
          {STATUSES.map((status) => (
            <Droppable droppableId={status} key={status}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={styles.column}
                >
                  <h3 style={styles.columnTitle}>
                    {status.replace("_", " ").toUpperCase()}
                  </h3>

                  {tasksByStatus(status).map((task, index) => (
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
                            ...styles.card,
                            ...provided.draggableProps.style,
                          }}
                        >
                          <strong>{task.title}</strong>
                          {task.description && <p>{task.description}</p>}

                          {/* Assignment dropdown */}
                          <div style={{ marginTop: 8 }}>
                            <select
                              value={
                                task.assignedTo &&
                                typeof task.assignedTo === "object"
                                  ? task.assignedTo._id
                                  : (task.assignedTo ?? "")
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

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {showModal && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  board: { display: "flex", gap: 16, marginTop: 20 },
  column: {
    background: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    minHeight: 400,
  },
  columnTitle: { marginBottom: 10, color: "#16a34a" },
  card: {
    background: "#fff",
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
    borderLeft: "4px solid #22c55e",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
  },
  addButton: {
    marginBottom: 16,
    background: "#22c55e",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 4,
    cursor: "pointer",
  },
};

export default ProjectBoard;
