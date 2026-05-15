import mongoose, { Document, Schema } from 'mongoose';

export interface IStoryHighlight extends Document {
  author: mongoose.Types.ObjectId;
  name: string;
  stories: mongoose.Types.ObjectId[];
  coverImage?: string;
  createdAt: Date;
}

const storyHighlightSchema = new Schema<IStoryHighlight>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  stories: [{ type: Schema.Types.ObjectId, ref: 'Story' }],
  coverImage: { type: String },
  createdAt: { type: Date, default: Date.now },
});

storyHighlightSchema.index({ author: 1 });

export default mongoose.model<IStoryHighlight>('StoryHighlight', storyHighlightSchema);