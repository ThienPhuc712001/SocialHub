import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface INotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  bookmarks: boolean;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  bio?: string;
  avatar?: string;
  coverPhoto?: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  isPrivate: boolean;
  notificationPreferences: INotificationPreferences;
  createdAt: Date;
  isVerified: boolean;
  followingHashtags: string[];
  role: 'user' | 'admin';
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const defaultNotifPrefs: INotificationPreferences = {
  likes: true,
  comments: true,
  follows: true,
  messages: true,
  bookmarks: true,
};

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  avatar: { type: String },
  coverPhoto: { type: String },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPrivate: { type: Boolean, default: false },
  notificationPreferences: {
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    bookmarks: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  followingHashtags: [{ type: String }],
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);