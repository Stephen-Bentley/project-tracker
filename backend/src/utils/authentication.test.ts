import jwt from 'jsonwebtoken';
import {
  AuthenticationError,
  getActorFromAuthorizationHeader,
  getActorFromToken,
} from './authentication';
import { signToken } from './jwt';

describe('shared bearer authentication', () => {
  const actor = { userId: 'user-123', role: 'user' as const };

  it('returns only the application actor for a valid bearer token', () => {
    const token = signToken(actor);

    expect(getActorFromAuthorizationHeader(`Bearer ${token}`)).toEqual(actor);
  });

  it.each([
    undefined,
    '',
    'Basic credentials',
    'Bearer',
    'Bearer ',
    'Bearer token with-space',
  ])('rejects a missing or malformed authorization header: %p', (header) => {
    expect(() => getActorFromAuthorizationHeader(header)).toThrow(
      AuthenticationError
    );
  });

  it('rejects an invalid token without including it in the error', () => {
    const invalidToken = 'not-a-valid-token';

    expect(() => getActorFromToken(invalidToken)).toThrow(AuthenticationError);
    expect(() => getActorFromToken(invalidToken)).not.toThrow(invalidToken);
  });

  it('rejects an expired token', () => {
    const expiredToken = jwt.sign(actor, process.env.JWT_SECRET!, {
      expiresIn: -1,
    });

    expect(() => getActorFromToken(expiredToken)).toThrow(AuthenticationError);
  });

  it('rejects a signed token whose actor claims are invalid', () => {
    const invalidActorToken = jwt.sign(
      { userId: '', role: 'administrator' },
      process.env.JWT_SECRET!
    );

    expect(() => getActorFromToken(invalidActorToken)).toThrow(
      AuthenticationError
    );
  });
});
