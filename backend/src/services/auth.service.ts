import User from '../models/User';
import { createRefreshToken, hashRefreshToken, signToken } from '../utils/jwt';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const unauthorized = () => {
  const error = new Error('Invalid or expired refresh token');
  (error as any).status = 401;
  return error;
};

const issueTokens = async (user: any) => {
  const refreshToken = createRefreshToken();
  user.refreshTokenHash = hashRefreshToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await user.save();

  return {
    token: signToken({
      userId: user._id.toString(),
      role: user.role,
    }),
    refreshToken,
  };
};

export class AuthService {
  static async login(email: string, password: string) {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const { token, refreshToken } = await issueTokens(user);

    return {
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  static async refresh(refreshToken: string) {
    const user = await User.findOne({
      refreshTokenHash: hashRefreshToken(refreshToken),
      refreshTokenExpiresAt: { $gt: new Date() },
    }).select('+refreshTokenHash +refreshTokenExpiresAt');

    if (!user) throw unauthorized();

    return issueTokens(user);
  }

  static async logout(refreshToken?: string) {
    if (refreshToken) {
      await User.updateOne(
        { refreshTokenHash: hashRefreshToken(refreshToken) },
        { $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } }
      );
    }
  }
}
