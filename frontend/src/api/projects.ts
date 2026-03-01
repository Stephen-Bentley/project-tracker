import api from './api';
import { Project } from '../types/projects';

export const getMyProjects = async (): Promise<Project[]> => {
  const res = await api.get<Project[]>('/projects');
  return res.data;
};

export const getProjectById = async (projectId: string): Promise<Project> => {
  const res = await api.get<Project>(`/projects/${projectId}`);
  return res.data;
};
