import User from '../models/User';

export class UserService {
  static async getCurrentUser(userId: string) {
    const user = await User.findById(userId).select(
      'name email role avatarUrl'
    );
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async updateCurrentUser(
    userId: string,
    name: string,
    avatarUrl: string
  ) {
    const user = await User.findByIdAndUpdate(
      userId,
      { name: name.trim(), avatarUrl: avatarUrl?.trim() || '' },
      { new: true, runValidators: true }
    ).select('name email role avatarUrl');

    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async uploadAvatar(
    userId: string,
    buffer: Buffer,
    contentType: string
  ) {
    const user = await User.findById(userId).select(
      '+avatarImage +avatarContentType'
    );

    if (!user) {
      throw new Error('User not found');
    }

    user.avatarImage = buffer;
    user.avatarContentType = contentType;
    user.avatarUrl = `/api/users/${user._id.toString()}/avatar?v=${Date.now()}`;
    await user.save();

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }

  static async getUserAvatar(userId: string) {
    const user = await User.findById(userId).select(
      '+avatarImage +avatarContentType'
    );

    if (!user?.avatarImage || !user.avatarContentType) {
      return null;
    }

    return {
      data: user.avatarImage,
      contentType: user.avatarContentType,
    };
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    if (!(await user.comparePassword(currentPassword))) {
      throw new Error('Incorrect password');
    }

    user.password = newPassword;
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();
    return { message: 'Password updated successfully' };
  }

  static async getUsers() {
    const users = await User.find()
      .select('name email role avatarUrl')
      .sort({ name: 1 });
    return users;
  }

  static async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
  }) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'user',
    });

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
