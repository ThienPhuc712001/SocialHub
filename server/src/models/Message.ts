import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  createdAt: Date;
  conversationId?: mongoose.Types.ObjectId;
  messageType: 'text' | 'voice' | 'sticker' | 'file' | 'image' | 'post_share';
  audioUrl?: string;
  stickerId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  imageUrl?: string;
}

const messageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  messageType: { type: String, enum: ['text', 'voice', 'sticker', 'file', 'image', 'post_share'], default: 'text' },
  audioUrl: { type: String },
  stickerId: { type: String },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  fileType: { type: String },
  imageUrl: { type: String },
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, sender: 1, read: 1 });

export default mongoose.model<IMessage>('Message', messageSchema);