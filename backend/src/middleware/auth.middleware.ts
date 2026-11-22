import { Request, Response, NextFunction } from 'express';
import {
  AuthenticatedActor,
  getActorFromAuthorizationHeader,
} from '../utils/authentication';

export interface AuthRequest extends Request {
  user?: AuthenticatedActor;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    req.user = getActorFromAuthorizationHeader(authHeader);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
