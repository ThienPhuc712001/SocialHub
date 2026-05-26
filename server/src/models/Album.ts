import mongoose, { Document, Schema } from 'mongoose';

export interface IAlbum extends Document {
  title: string;
  description?: string;
  coverImage?: string;
  images: string[];
  author: mongoose.Types.ObjectId;
  createdAt: Date;
}

const albumSchema = new Schema<IAlbum>({
  title: { type: String, required: true },
  description: { type: String },
  coverImage: { type: String },
  images: [{ type: String }],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

albumSchema.index({ author: 1, createdAt: -1 });
albumSchema.index({ createdAt: -1 });

export default mongoose.model<IAlbum>('Album', albumSchema);