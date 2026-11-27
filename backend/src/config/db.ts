import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const connectDB = async (): Promise<void> => {
  try {
    await pool.query(
      'ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS board_position INTEGER'
    );
    console.log('✅ PostgreSQL connected');
  } catch (error) {
    console.error('❌ PostgreSQL connection failed', error);
    process.exit(1);
  }
};
