import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  const dashboard = await DashboardService.getDashboard(req.user!.userId);
  res.json(dashboard);
};
