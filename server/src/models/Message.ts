import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  createdAt: Date;
  conversationId?: mongoose.Types.ObjectId;
}

const messageSchema = new Schema<IMessage>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

export default mongoose.model<IMessage>('Message', messageSchema);