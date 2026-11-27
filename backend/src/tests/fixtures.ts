import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { newId } from '../services/postgres';

export async function createTestUser(
  name: string,
  email: string,
  role: 'user' | 'admin' = 'user'
) {
  const id = newId();
  const passwordHash = await bcrypt.hash('password123', 4);
  await pool.query(
    'INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
    [id, name, email, passwordHash, role]
  );
  return id;
}
