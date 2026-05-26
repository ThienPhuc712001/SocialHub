import express, { Response } from 'express';
import StickerPack from '../models/StickerPack';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/packs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const packs = await StickerPack.find().sort({ isDefault: -1, createdAt: 1 });
    res.json(packs);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/packs/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const pack = await StickerPack.findById(req.params.id);
    if (!pack) return res.status(404).json({ message: 'Sticker pack not found' });
    res.json(pack);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/packs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, stickers } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const pack = new StickerPack({
      name, description, stickers: stickers || [],
      author: req.user!.id, isDefault: false,
    });
    await pack.save();
    res.status(201).json(pack);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to create sticker pack' });
  }
});

export default router;