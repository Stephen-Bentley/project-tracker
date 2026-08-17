import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export const login = async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body.email, req.body.password);
  res.json(result);
};
