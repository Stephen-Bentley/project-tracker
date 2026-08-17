import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserService } from '../services/user.service';
import {
  createUserSchema,
  updateCurrentUserSchema,
  changePasswordSchema,
} from '../validators/user.validator';
import { validate } from '../middleware/validate.middleware';

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  const user = await UserService.getCurrentUser(req.user!.userId);
  res.json(user);
};

export const updateCurrentUser = async (req: AuthRequest, res: Response) => {
  const { name, avatarUrl } = req.body;
  const user = await UserService.updateCurrentUser(req.user!.userId, name, avatarUrl);
  res.json(user);
};

export const uploadCurrentUserAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: 'Please select an image to upload' });
  }

  const result = await UserService.uploadAvatar(req.user!.userId, req.file.buffer, req.file.mimetype);
  res.json(result);
};

export const getUserAvatar = async (req: Request, res: Response) => {
  const result = await UserService.getUserAvatar(req.params.userId);
  if (!result) return res.status(404).end();

  res.set('Cache-Control', 'no-store');
  res.type(result.contentType).send(result.data);
};

export const changeCurrentUserPassword = async (req: AuthRequest, res: Response) => {
  const result = await UserService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
  res.json(result);
};

export const getUsers = async (_req: Request, res: Response) => {
  const users = await UserService.getUsers();
  res.json(users);
};

export const createUser = async (req: Request, res: Response) => {
  const result = await UserService.createUser(req.body);
  res.status(201).json(result);
};
