import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  name?: string;
  participants: mongoose.Types.ObjectId[];
  isGroup: boolean;
  creator?: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageTime?: Date;
  createdAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  name: { type: String },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isGroup: { type: Boolean, default: false },
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageTime: -1 });

export default mongoose.model<IConversation>('Conversation', conversationSchema);