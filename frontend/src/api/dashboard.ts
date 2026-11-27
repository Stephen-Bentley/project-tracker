import api from './api';
import { DashboardData } from '../types/dashboard';
import { localCalendarDate } from '../utils/calendarDate';

export const getDashboard = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>('/dashboard', {
    params: { today: localCalendarDate() },
  });
  return response.data;
};
