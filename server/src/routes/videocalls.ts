import express, { Response } from 'express';
import mongoose from 'mongoose';
import VideoCall from '../models/VideoCall';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const total = await VideoCall.countDocuments({
      $or: [{ caller: userId }, { receiver: userId }],
    });
    const calls = await VideoCall.find({
      $or: [{ caller: userId }, { receiver: userId }],
    }).populate('caller', 'username avatar').populate('receiver', 'username avatar')
      .sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({ calls, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const callId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(callId)) return res.status(400).json({ message: 'Invalid call ID' });
    const call = await VideoCall.findById(callId).populate('caller', 'username avatar').populate('receiver', 'username avatar');
    if (!call) return res.status(404).json({ message: 'Call not found' });
    res.json(call);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;