import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
};

const getRefreshCookie = (req: Request) =>
  req.headers.cookie
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([name]) => name === 'refreshToken')?.[1];

export const login = async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body.email, req.body.password);
  setRefreshCookie(res, result.refreshToken);
  res.json({ token: result.token, user: result.user });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = getRefreshCookie(req);
  if (!refreshToken) return res.status(401).json({ message: 'Unauthorized' });

  const result = await AuthService.refresh(refreshToken);
  setRefreshCookie(res, result.refreshToken);
  res.json({ token: result.token });
};

export const logout = async (req: Request, res: Response) => {
  await AuthService.logout(getRefreshCookie(req));
  res.clearCookie('refreshToken', refreshCookieOptions);
  res.status(204).send();
};
