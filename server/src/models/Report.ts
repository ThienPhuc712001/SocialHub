import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  targetType: 'post' | 'comment' | 'user' | 'story';
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
}

const reportSchema = new Schema<IReport>({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['post', 'comment', 'user', 'story'], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

reportSchema.index({ reporter: 1, targetId: 1, targetType: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IReport>('Report', reportSchema);