import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { DashboardService } from '../services/dashboard.service';
import { calendarDateSchema } from '../validators/task.validator';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  const today = calendarDateSchema.optional().safeParse(req.query.today);
  if (!today.success)
    return res.status(400).json({ message: 'Invalid calendar date.' });
  const dashboard = await DashboardService.getDashboard(
    req.user!.userId,
    today.data
  );
  res.json(dashboard);
};
