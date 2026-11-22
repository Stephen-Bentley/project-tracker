import { verifyToken } from './jwt';

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

const isAuthenticatedActor = (
  value: unknown
): value is AuthenticatedActor => {
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

export const getActorFromAuthorizationHeader = (
  authorization?: string
): AuthenticatedActor => {
  const match = authorization?.match(/^Bearer ([^\s]+)$/);

  if (!match) {
    throw new AuthenticationError();
  }

  return getActorFromToken(match[1]);
};
