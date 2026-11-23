import { verifyToken } from './jwt';
import { createHash } from 'crypto';
import { pool } from '../config/db';

export interface AuthenticatedActor {
  userId: string;
  role: 'admin' | 'user';
}

export class AuthenticationError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AuthenticationError';
  }
}

const isAuthenticatedActor = (value: unknown): value is AuthenticatedActor => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const { userId, role } = value as Record<string, unknown>;
  return (
    typeof userId === 'string' &&
    userId.length > 0 &&
    (role === 'admin' || role === 'user')
  );
};

export const getActorFromToken = (token: string): AuthenticatedActor => {
  if (!token || /\s/.test(token)) {
    throw new AuthenticationError();
  }

  try {
    const payload = verifyToken(token);

    if (!isAuthenticatedActor(payload)) {
      throw new AuthenticationError();
    }

    return { userId: payload.userId, role: payload.role };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    throw new AuthenticationError();
  }
};

const getActorFromApiToken = async (
  token: string
): Promise<AuthenticatedActor> => {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await pool.query(
    `SELECT u.id, u.role FROM api_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1 AND t.revoked_at IS NULL
       AND (t.expires_at IS NULL OR t.expires_at > NOW())`,
    [tokenHash]
  );
  const user = result.rows[0] as
    { id: string; role: 'admin' | 'user' } | undefined;
  if (!user) throw new AuthenticationError();
  await pool.query(
    'UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = $1',
    [tokenHash]
  );
  return { userId: user.id, role: user.role };
};

export const getActorFromAuthorizationHeader = (
  authorization?: string
): Promise<AuthenticatedActor> => {
  const match = authorization?.match(/^Bearer ([^\s]+)$/);

  if (!match) {
    throw new AuthenticationError();
  }

  const token = match[1];
  return token.startsWith('mcp_')
    ? getActorFromApiToken(token)
    : Promise.resolve(getActorFromToken(token));
};
