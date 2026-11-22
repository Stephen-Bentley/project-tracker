import api from './api';
import { DashboardData } from '../types/dashboard';

export const getDashboard = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>('/dashboard');
  return response.data;
};
