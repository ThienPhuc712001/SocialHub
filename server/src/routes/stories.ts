import express, { Response } from 'express';
import mongoose from 'mongoose';
import Story from '../models/Story';
import User from '../models/User';
import Notification from '../models/Notification';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { storyUpload } from '../middleware/upload';
import { storyValidation } from '../middleware/validation';
import { validationResult } from 'express-validator';

const router = express.Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    const total = await Story.countDocuments();
    const stories = await Story.find()
      .populate('author', 'username avatar')
      .populate('viewers', 'username avatar')
      .populate('replies.sender', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const grouped = new Map();
    stories.forEach((story: any) => {
      const authorId = story.author._id.toString();
      if (!grouped.has(authorId)) {
        grouped.set(authorId, { author: story.author, stories: [] });
      }
      grouped.get(authorId).stories.push(story);
    });

    res.json({ groups: Array.from(grouped.values()), total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authMiddleware, storyUpload.single('image'), storyValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { content } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;
    if (!image && !content) return res.status(400).json({ message: 'Story must have image or content' });
    const story = new Story({ author: req.user!.id, image, content });
    await story.save();
    await story.populate('author', 'username avatar');

    const io = req.app.get('io');
    io.emit('newStory', story);

    res.status(201).json(story);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to create story' });
  }
});

router.post('/:id/view', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const storyId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'Invalid story ID' });
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    if (!story.viewers.some(v => v.equals(userId)) && story.author.toString() !== req.user!.id) {
      story.viewers.push(userId);
      await story.save();
    }

    res.json({ viewerCount: story.viewers.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id/viewers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const storyId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'Invalid story ID' });
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.author.toString() !== req.user!.id) return res.status(403).json({ message: 'Only story author can see viewers' });

    const viewers = await User.find({ _id: { $in: story.viewers } }).select('username avatar');
    res.json({ viewerCount: story.viewers.length, viewers });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/reply', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const storyId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'Invalid story ID' });
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Reply content is required' });

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    (story.replies as any).push({ sender: userId, content: content.trim() });
    await story.save();
    await story.populate('replies.sender', 'username avatar');

    if (story.author.toString() !== req.user!.id) {
      await Notification.create({
        recipient: story.author,
        sender: userId,
        type: 'comment',
        content: `Replied to your story: ${content.trim().substring(0, 50)}`,
      });
      const io = req.app.get('io');
      io.to(story.author.toString()).emit('notification', { type: 'comment', senderId: req.user!.id });
      io.to(story.author.toString()).emit('storyReply', { storyId, senderId: req.user!.id, content: content.trim() });
    }

    res.status(201).json(story.replies[story.replies.length - 1]);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to reply to story' });
  }
});

router.get('/:id/replies', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const storyId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'Invalid story ID' });
    const story = await Story.findById(storyId).populate('replies.sender', 'username avatar');
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.json({ replies: story.replies });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const storyId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'Invalid story ID' });
    const story = await Story.findById(storyId);
    if (!story || story.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Story not found' });
    await Story.deleteOne({ _id: story._id });
    res.json({ message: 'Story deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;