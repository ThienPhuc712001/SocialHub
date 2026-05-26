import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoCall extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  callType: 'video' | 'audio';
  status: 'missed' | 'completed' | 'rejected';
  duration?: number;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
}

const videoCallSchema = new Schema<IVideoCall>({
  caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  callType: { type: String, enum: ['video', 'audio'], required: true },
  status: { type: String, enum: ['missed', 'completed', 'rejected'], default: 'missed' },
  duration: { type: Number },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

videoCallSchema.index({ caller: 1, createdAt: -1 });
videoCallSchema.index({ receiver: 1, createdAt: -1 });

export default mongoose.model<IVideoCall>('VideoCall', videoCallSchema);