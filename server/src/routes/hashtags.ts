import express, { Response } from 'express';
import mongoose from 'mongoose';
import HashtagFollow from '../models/HashtagFollow';
import Post from '../models/Post';
import Block from '../models/Block';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/trending', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await Post.aggregate([
      { $match: { createdAt: { $gte: twentyFourHoursAgo } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json(trending.map(t => ({ tag: t._id, count: t.count })));
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/followed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const followed = await HashtagFollow.find({ user: userId }).sort({ createdAt: -1 });
    res.json(followed.map(f => ({ tag: f.hashtag, followedAt: f.createdAt })));
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/follow/:tag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tag = (req.params.tag as string).toLowerCase();
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    const existing = await HashtagFollow.findOne({ user: userId, hashtag: tag });
    if (existing) return res.status(400).json({ message: 'Already following this hashtag' });

    const follow = await HashtagFollow.create({ user: userId, hashtag: tag });
    res.status(201).json({ tag: follow.hashtag, followedAt: follow.createdAt });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/follow/:tag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tag = (req.params.tag as string).toLowerCase();
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    await HashtagFollow.deleteOne({ user: userId, hashtag: tag });
    res.json({ message: 'Unfollowed hashtag' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:tag/posts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tag = (req.params.tag as string).toLowerCase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(req.user!.id) });
    const blockedIds = blocks.map(b => b.blocked);

    const total = await Post.countDocuments({ hashtags: tag, author: { $nin: blockedIds } });
    const posts = await Post.find({ hashtags: tag, author: { $nin: blockedIds } })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;