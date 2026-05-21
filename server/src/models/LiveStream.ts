import mongoose, { Schema, Document } from 'mongoose';

export interface ILiveStream extends Document {
  title: string;
  host: mongoose.Types.ObjectId;
  status: 'live' | 'ended';
  viewerCount: number;
  peakViewerCount: number;
  likeCount: number;
  thumbnail?: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
}

const liveStreamSchema = new Schema<ILiveStream>({
  title: { type: String, required: true, maxlength: 100, trim: true },
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['live', 'ended'], default: 'live', required: true },
  viewerCount: { type: Number, default: 0 },
  peakViewerCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  thumbnail: { type: String },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  duration: { type: Number },
}, { timestamps: true });

liveStreamSchema.index({ status: 1, startedAt: -1 });
liveStreamSchema.index({ host: 1, status: 1 });

export default mongoose.model<ILiveStream>('LiveStream', liveStreamSchema);