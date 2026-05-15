import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  parentComment?: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const commentSchema = new Schema<IComment>({
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

commentSchema.post('save', async function () {
  await mongoose.model('Post').updateOne(
    { _id: this.post },
    { $inc: { commentCount: 1 } }
  );
});

commentSchema.post('deleteOne', { document: true, query: false }, async function () {
  await mongoose.model('Post').updateOne(
    { _id: this.post },
    { $inc: { commentCount: -1 } }
  );
});

export default mongoose.model<IComment>('Comment', commentSchema);