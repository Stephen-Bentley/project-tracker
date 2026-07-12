import api from './api';
import { User } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const res = await api.get<User[]>('/users');
  return res.data;
};

export const createUser = async (
  name: string,
  email: string,
  password: string
) => {
  const res = await api.post<User>('/users', { name, email, password });
  return res.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const res = await api.get<User>('/users/me');
  return res.data;
};

export const updateCurrentUser = async (
  name: string,
  avatarUrl: string
): Promise<User> => {
  const res = await api.put<User>('/users/me', { name, avatarUrl });
  return res.data;
};

export const uploadCurrentUserAvatar = async (file: File): Promise<User> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await api.post<User>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const changeCurrentUserPassword = async (
  currentPassword: string,
  newPassword: string
) => {
  await api.put('/users/me/password', { currentPassword, newPassword });
};
