import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { domainError, getUser, newId, userShape } from './postgres';

export class UserService {
  static async getCurrentUser(userId: string) {
    const user = await getUser(userId);
    if (!user) throw domainError('User not found', 404);
    return userShape(user);
  }

  static async updateCurrentUser(
    userId: string,
    name: string,
    avatarUrl: string
  ) {
    const result = await pool.query(
      'UPDATE users SET name = $2, avatar_url = $3, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, avatar_url, created_at, updated_at',
      [userId, name.trim(), avatarUrl?.trim() || '']
    );
    if (!result.rows[0]) throw domainError('User not found', 404);
    return userShape(result.rows[0]);
  }

  static async uploadAvatar(
    userId: string,
    buffer: Buffer,
    contentType: string
  ) {
    const avatarUrl = `/api/users/${userId}/avatar?v=${Date.now()}`;
    const result = await pool.query(
      'UPDATE users SET avatar_image = $2, avatar_content_type = $3, avatar_url = $4, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, avatar_url, created_at, updated_at',
      [userId, buffer, contentType, avatarUrl]
    );
    if (!result.rows[0]) throw domainError('User not found', 404);
    return userShape(result.rows[0]);
  }

  static async getUserAvatar(userId: string) {
    const user = await getUser(userId, true);

    if (!user?.avatarImage || !user.avatarContentType) {
      return null;
    }

    return {
      data: user.avatar_image,
      contentType: user.avatar_content_type,
    };
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await getUser(userId, true);
    if (!user) throw domainError('User not found', 404);
    if (!(await bcrypt.compare(currentPassword, user.password_hash)))
      throw domainError('Incorrect password', 400);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $2, refresh_token_hash = NULL, refresh_token_expires_at = NULL, updated_at = NOW() WHERE id = $1',
      [userId, passwordHash]
    );
    return { message: 'Password updated successfully' };
  }

  static async getUsers() {
    const users = await pool.query(
      'SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users ORDER BY name'
    );
    return users.rows.map(userShape);
  }

  static async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
  }) {
    const id = newId();
    try {
      const passwordHash = await bcrypt.hash(data.password, 10);
      const result = await pool.query(
        'INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, name, email, role, avatar_url, created_at, updated_at',
        [
          id,
          data.name.trim(),
          data.email.trim().toLowerCase(),
          passwordHash,
          data.role || 'user',
        ]
      );
      return userShape(result.rows[0]);
    } catch (error: any) {
      if (error?.code === '23505')
        throw domainError('User already exists', 409);
      throw error;
    }
  }
}
