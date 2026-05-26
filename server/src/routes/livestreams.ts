import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import LiveStream from '../models/LiveStream';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const thumbnailStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, _file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`),
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.post('/', authMiddleware, thumbnailUpload.single('thumbnail'), [
  body('title').trim().isLength({ min: 1, max: 100 }),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await LiveStream.findOne({ host: (req as AuthRequest).user!.id, status: 'live' });
    if (existing) return res.status(400).json({ message: 'You already have an active stream' });

    const stream = new LiveStream({
      title: req.body.title,
      host: (req as AuthRequest).user!.id,
      thumbnail: req.file ? `/uploads/${req.file.filename}` : undefined,
      startedAt: new Date(),
    });

    await stream.save();

    const populated = await LiveStream.findById(stream._id).populate('host', 'username avatar isVerified');
    res.status(201).json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/active', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const streams = await LiveStream.find({ status: 'live' })
      .populate('host', 'username avatar isVerified')
      .sort({ viewerCount: -1 });
    res.json(streams);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const streams = await LiveStream.find({ host: req.user!.id, status: 'ended' })
      .populate('host', 'username avatar isVerified')
      .sort({ endedAt: -1 })
      .limit(20);
    res.json(streams);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authMiddleware, [
  param('id').isMongoId(),
], async (req: Request, res: Response) => {
  try {
    const stream = await LiveStream.findById(req.params.id).populate('host', 'username avatar isVerified');
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    res.json(stream);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/end', authMiddleware, [
  param('id').isMongoId(),
], async (req: AuthRequest, res: Response) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (stream.host.toString() !== req.user!.id) return res.status(403).json({ message: 'Not your stream' });
    if (stream.status === 'ended') return res.status(400).json({ message: 'Stream already ended' });

    stream.status = 'ended';
    stream.endedAt = new Date();
    stream.duration = Math.floor((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000);
    stream.viewerCount = 0;

    await stream.save();

    const populated = await LiveStream.findById(stream._id).populate('host', 'username avatar isVerified');
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/like', authMiddleware, [
  param('id').isMongoId(),
], async (req: Request, res: Response) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    if (stream.status !== 'live') return res.status(400).json({ message: 'Stream is not live' });

    stream.likeCount += 1;
    await stream.save();

    res.json({ likeCount: stream.likeCount });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;