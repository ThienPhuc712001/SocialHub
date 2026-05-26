import mongoose, { Document, Schema } from 'mongoose';

export interface IStoryReply extends Document {
  sender: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface IStory extends Document {
  author: mongoose.Types.ObjectId;
  image?: string;
  content?: string;
  viewers: mongoose.Types.ObjectId[];
  replies: IStoryReply[];
  createdAt: Date;
  expiresAt: Date;
}

const storyReplySchema = new Schema<IStoryReply>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const storySchema = new Schema<IStory>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String },
  content: { type: String },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replies: [storyReplySchema],
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IStory>('Story', storySchema);