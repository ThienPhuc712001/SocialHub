import express, { Response } from 'express';
import mongoose from 'mongoose';
import Report from '../models/Report';
import User from '../models/User';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Story from '../models/Story';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/reports', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const total = await Report.countDocuments({ status: 'pending' });
    const reports = await Report.find({ status: 'pending' })
      .populate('reporter', 'username avatar')
      .populate('targetId', 'username avatar content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ reports, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/reports/:id/review', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid report ID' });

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = 'reviewed';
    await report.save();
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/reports/:id/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid report ID' });

    const { action } = req.body;
    if (!action) return res.status(400).json({ message: 'Action is required' });

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = 'resolved';
    await report.save();
    res.json({ report, action });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalComments = await Comment.countDocuments();
    const totalStories = await Story.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    res.json({ totalUsers, totalPosts, totalComments, totalStories, pendingReports });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/verify/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isVerified = true;
    await user.save();
    res.json({ message: 'User verified', user: { id: user._id, username: user.username, isVerified: user.isVerified } });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;