import mongoose, { Document, Schema } from 'mongoose';

export interface ISticker extends Document {
  id: string;
  name: string;
  url: string;
  emoji: string;
}

export interface IStickerPack extends Document {
  name: string;
  description?: string;
  stickers: ISticker[];
  author?: mongoose.Types.ObjectId;
  isDefault: boolean;
  createdAt: Date;
}

const stickerSchema = new Schema<ISticker>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String },
  emoji: { type: String, required: true },
});

const stickerPackSchema = new Schema<IStickerPack>({
  name: { type: String, required: true },
  description: { type: String },
  stickers: [stickerSchema],
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IStickerPack>('StickerPack', stickerPackSchema);