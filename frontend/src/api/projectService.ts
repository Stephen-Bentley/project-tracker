import axiosInstance from './axiosInstance';

export interface Project {
  id: string;
  name: string;
  description?: string;
  members: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string;
  }[];
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string;
  };
}

export const projectService = {
  create: async (name: string, description?: string) => {
    const response = await axiosInstance.post('/projects', {
      name,
      description,
    });
    return response.data;
  },

  getMine: async () => {
    const response = await axiosInstance.get('/projects/mine');
    return response.data;
  },

  getById: async (projectId: string) => {
    const response = await axiosInstance.get(`/projects/${projectId}`);
    return response.data;
  },

  getAll: async () => {
    const response = await axiosInstance.get('/projects');
    return response.data;
  },

  addMember: async (projectId: string, userId: string) => {
    const response = await axiosInstance.post(`/projects/${projectId}/users`, {
      userId,
    });
    return response.data;
  },

  removeMember: async (projectId: string, userId: string) => {
    const response = await axiosInstance.delete(
      `/projects/${projectId}/users/${userId}`
    );
    return response.data;
  },

  updateMembers: async (projectId: string, members: string[]) => {
    const response = await axiosInstance.put(`/projects/${projectId}/members`, {
      members,
    });
    return response.data;
  },
};
