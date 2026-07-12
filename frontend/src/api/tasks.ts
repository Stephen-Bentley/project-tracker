import api from './api';
import { Task } from '../types/task';

export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  const res = await api.get<Task[]>(`/tasks/project/${projectId}`);
  return res.data;
};

export const updateTaskStatus = async (taskId: string, status: string) => {
  await api.put(`/tasks/${taskId}`, { status });
};

export const createTask = async (
  projectId: string,
  title: string,
  description?: string
) => {
  const res = await api.post('/tasks', {
    projectId,
    title,
    description,
  });

  return res.data;
};

export const assignUserToTask = async (taskId: string, userId: string) => {
  await api.put(`/tasks/${taskId}/assign`, { userId });
};

export const updateTaskDetails = async (
  taskId: string,
  title: string,
  description: string,
  assignedTo: string
): Promise<Task> => {
  const res = await api.put<Task>(`/tasks/${taskId}`, {
    title,
    description,
    assignedTo: assignedTo || null,
  });
  return res.data;
};

export const uploadTaskImages = async (
  taskId: string,
  files: File[]
): Promise<Task> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const res = await api.post<Task>(`/tasks/${taskId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
