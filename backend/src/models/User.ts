import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
  avatarImage?: Buffer;
  avatarContentType?: string;
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // IMPORTANT: don’t return password by default
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    avatarImage: {
      type: Buffer,
      select: false,
    },
    avatarContentType: {
      type: String,
      select: false,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    refreshTokenExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Password Hashing Middleware
 * Using async/await without the 'next' parameter resolves the TS2349 error.
 */
UserSchema.pre<IUser>('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error: any) {
    throw new Error(error);
  }
});

/**
 * Method to compare passwords
 */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // Since password has 'select: false', ensure it exists on 'this'
  // before comparing in your controller (using .select('+password'))
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
