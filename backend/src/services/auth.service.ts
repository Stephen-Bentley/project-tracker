import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { getUser } from './postgres';
import { createRefreshToken, hashRefreshToken, signToken } from '../utils/jwt';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const unauthorized = () =>
  Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
const issueTokens = async (user: any) => {
  const refreshToken = createRefreshToken();
  await pool.query(
    'UPDATE users SET refresh_token_hash = $2, refresh_token_expires_at = $3, updated_at = NOW() WHERE id = $1',
    [
      user.id,
      hashRefreshToken(refreshToken),
      new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    ]
  );
  return {
    token: signToken({ userId: user.id, role: user.role }),
    refreshToken,
  };
};
export class AuthService {
  static async login(email: string, password: string) {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [
      email.trim().toLowerCase(),
    ]);
    const user = result.rows[0] && (await getUser(result.rows[0].id, true));
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw new Error('Invalid credentials');
    const { token, refreshToken } = await issueTokens(user);
    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
  static async refresh(refreshToken: string) {
    const result = await pool.query(
      'SELECT id FROM users WHERE refresh_token_hash = $1 AND refresh_token_expires_at > NOW()',
      [hashRefreshToken(refreshToken)]
    );
    const user = result.rows[0] && (await getUser(result.rows[0].id, true));
    if (!user) throw unauthorized();
    return issueTokens(user);
  }
  static async logout(refreshToken?: string) {
    if (refreshToken)
      await pool.query(
        'UPDATE users SET refresh_token_hash = NULL, refresh_token_expires_at = NULL WHERE refresh_token_hash = $1',
        [hashRefreshToken(refreshToken)]
      );
  }
}
