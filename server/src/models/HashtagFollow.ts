import mongoose, { Document, Schema } from 'mongoose';

export interface IHashtagFollow extends Document {
  user: mongoose.Types.ObjectId;
  hashtag: string;
  createdAt: Date;
}

const hashtagFollowSchema = new Schema<IHashtagFollow>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hashtag: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

hashtagFollowSchema.index({ user: 1, hashtag: 1 }, { unique: true });

export default mongoose.model<IHashtagFollow>('HashtagFollow', hashtagFollowSchema);