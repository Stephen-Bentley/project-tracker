import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  role: 'admin' | 'user';
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '15m',
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

export const createRefreshToken = () => randomBytes(48).toString('hex');

export const hashRefreshToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
