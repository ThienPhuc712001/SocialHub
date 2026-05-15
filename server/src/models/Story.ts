import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  author: mongoose.Types.ObjectId;
  image?: string;
  content?: string;
  viewers: mongoose.Types.ObjectId[];
  createdAt: Date;
  expiresAt: Date;
}

const storySchema = new Schema<IStory>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String },
  content: { type: String },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IStory>('Story', storySchema);