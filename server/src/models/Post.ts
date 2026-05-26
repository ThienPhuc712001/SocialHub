import mongoose, { Document, Schema } from 'mongoose';

export interface IPollOption {
  text: string;
  votes: mongoose.Types.ObjectId[];
}

export interface IPoll {
  question: string;
  options: IPollOption[];
  expiresAt?: Date;
}

export interface ILocation {
  name: string;
  type: string;
  coordinates: number[];
}

export interface ILocation {
  name: string;
  type: string;
  coordinates: number[];
}

export interface IPost extends Document {
  title?: string;
  content: string;
  image?: string;
  images: string[];
  video?: string;
  author: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  commentCount: number;
  hashtags: string[];
  editedAt?: Date;
  pinned: boolean;
  createdAt: Date;
  reactions: Map<string, mongoose.Types.ObjectId[]>;
  viewCount: number;
  viewers: mongoose.Types.ObjectId[];
  mentions: mongoose.Types.ObjectId[];
  visibility: 'public' | 'friends' | 'private';
  isRepost: boolean;
  originalPost?: mongoose.Types.ObjectId;
  repostComment?: string;
  poll?: IPoll;
  verified: boolean;
  status: 'draft' | 'published' | 'scheduled';
  scheduledAt?: Date;
  location?: ILocation;
}

const pollOptionSchema = new Schema<IPollOption>({
  text: { type: String, required: true },
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

const pollSchema = new Schema<IPoll>({
  question: { type: String, required: true },
  options: [pollOptionSchema],
  expiresAt: { type: Date },
});

const locationSchema = new Schema<ILocation>({
  name: { type: String },
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: [{ type: Number }],
});

const postSchema = new Schema<IPost>({
  title: { type: String },
  content: { type: String, required: true },
  image: { type: String },
  images: [{ type: String }],
  video: { type: String },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
  hashtags: [{ type: String }],
  editedAt: { type: Date },
  pinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  reactions: {
    type: Map,
    of: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  viewCount: { type: Number, default: 0 },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
  isRepost: { type: Boolean, default: false },
  originalPost: { type: Schema.Types.ObjectId, ref: 'Post' },
  repostComment: { type: String },
  poll: { type: pollSchema },
  verified: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'published' },
  scheduledAt: { type: Date },
  location: { type: locationSchema },
});

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ pinned: 1, author: 1 });
postSchema.index({ visibility: 1 });
postSchema.index({ viewCount: -1 });
postSchema.index({ status: 1 });
postSchema.index({ 'location.coordinates': '2dsphere' });
postSchema.index({ status: 1 });
postSchema.index({ scheduledAt: 1 });
postSchema.index({ 'location.coordinates': '2dsphere' });

export default mongoose.model<IPost>('Post', postSchema);