import api from './api';
import { User } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const res = await api.get<User[]>('/users');
  return res.data;
};

export const createUser = async (name: string, email: string, password: string) => {
  const res = await api.post<User>('/users', { name, email, password });
  return res.data;
};
