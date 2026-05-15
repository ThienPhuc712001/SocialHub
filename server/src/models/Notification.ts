import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'message' | 'bookmark';
  post?: mongoose.Types.ObjectId;
  content?: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment', 'follow', 'message', 'bookmark'], required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post' },
  content: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);