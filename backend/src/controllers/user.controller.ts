import { Request, Response } from 'express';
import User from '../models/User';

type AuthenticatedRequest = Request & { user?: { userId: string } };

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const user = await User.findById(req.user?.userId).select(
    'name email role avatarUrl'
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const updateCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { name, avatarUrl } = req.body;
  if (typeof name !== 'string' || !name.trim())
    return res.status(400).json({ message: 'Name is required' });
  if (avatarUrl !== undefined && typeof avatarUrl !== 'string')
    return res.status(400).json({ message: 'Avatar URL must be a string' });

  const user = await User.findByIdAndUpdate(
    req.user?.userId,
    { name: name.trim(), avatarUrl: avatarUrl?.trim() || '' },
    { new: true, runValidators: true }
  ).select('name email role avatarUrl');

  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

export const changeCurrentUserPassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new passwords are required' });
  if (typeof newPassword !== 'string' || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

  const user = await User.findById(req.user?.userId).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!(await user.comparePassword(currentPassword))) return res.status(401).json({ message: 'Current password is incorrect' });

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated successfully' });
};

export const getUsers = async (_req: Request, res: Response) => {
  const users = await User.find()
    .select('name email role avatarUrl')
    .sort({ name: 1 });
  res.json(users);
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'user',
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
};
