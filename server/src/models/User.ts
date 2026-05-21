import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface INotificationPreferences {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  bookmarks: boolean;
}

export interface IPrivacySettings {
  postsVisibility: 'public' | 'friends' | 'private';
  messagesFrom: 'everyone' | 'friends' | 'none';
  storiesVisibility: 'public' | 'friends' | 'private';
  profileVisibility: 'public' | 'friends' | 'private';
  activityStatus: boolean;
  dataSharing: boolean;
}

export interface IMonetizationSettings {
  allowAds: boolean;
  creatorSubscriptions: boolean;
  subscriptionPrice: number;
  adsFrequency: 'low' | 'medium' | 'high';
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
  closeFriends: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  isPrivate: boolean;
  notificationPreferences: INotificationPreferences;
  privacySettings: IPrivacySettings;
  monetizationSettings: IMonetizationSettings;
  createdAt: Date;
  isVerified: boolean;
  followingHashtags: string[];
  role: 'user' | 'admin';
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const defaultPrivacySettings: IPrivacySettings = {
  postsVisibility: 'public',
  messagesFrom: 'everyone',
  storiesVisibility: 'public',
  profileVisibility: 'public',
  activityStatus: true,
  dataSharing: false,
};

const defaultMonetizationSettings: IMonetizationSettings = {
  allowAds: false,
  creatorSubscriptions: false,
  subscriptionPrice: 0,
  adsFrequency: 'low',
};

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
  closeFriends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isPrivate: { type: Boolean, default: false },
  notificationPreferences: {
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    bookmarks: { type: Boolean, default: true },
  },
  privacySettings: {
    postsVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    messagesFrom: { type: String, enum: ['everyone', 'friends', 'none'], default: 'everyone' },
    storiesVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    activityStatus: { type: Boolean, default: true },
    dataSharing: { type: Boolean, default: false },
  },
  monetizationSettings: {
    allowAds: { type: Boolean, default: false },
    creatorSubscriptions: { type: Boolean, default: false },
    subscriptionPrice: { type: Number, default: 0 },
    adsFrequency: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
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