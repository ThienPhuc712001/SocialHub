import express, { Response } from 'express';
import Notification from '../models/Notification';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const total = await Notification.countDocuments({ recipient: req.user!.id });
    const notifications = await Notification.find({ recipient: req.user!.id })
      .populate('sender', 'username avatar')
      .populate('post', 'title content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ notifications, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/unread-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user!.id, read: false });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user!.id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    notification.read = true;
    await notification.save();
    res.json({ message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ recipient: req.user!.id, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;