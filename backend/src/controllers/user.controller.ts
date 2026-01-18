import { Request, Response } from 'express';
import User from '../models/User';

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
    role: role || 'user'
  });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  });
};
