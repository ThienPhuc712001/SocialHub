import express, { Response } from 'express';
import mongoose from 'mongoose';
import Album from '../models/Album';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.query.userId as string || req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const total = await Album.countDocuments({ author: new mongoose.Types.ObjectId(userId) });
    const albums = await Album.find({ author: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({ albums, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, coverImage, images } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const album = new Album({
      title, description, coverImage, images: images || [],
      author: new mongoose.Types.ObjectId(req.user!.id),
    });
    await album.save();
    res.status(201).json(album);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to create album' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const albumId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(albumId)) return res.status(400).json({ message: 'Invalid album ID' });
    const album = await Album.findById(albumId);
    if (!album) return res.status(404).json({ message: 'Album not found' });
    res.json(album);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const albumId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(albumId)) return res.status(400).json({ message: 'Invalid album ID' });
    const album = await Album.findById(albumId);
    if (!album || album.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Album not found' });
    album.title = req.body.title || album.title;
    album.description = req.body.description || album.description;
    album.coverImage = req.body.coverImage || album.coverImage;
    await album.save();
    res.json(album);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to update album' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const albumId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(albumId)) return res.status(400).json({ message: 'Invalid album ID' });
    const album = await Album.findById(albumId);
    if (!album || album.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Album not found' });
    await Album.deleteOne({ _id: album._id });
    res.json({ message: 'Album deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/images', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const albumId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(albumId)) return res.status(400).json({ message: 'Invalid album ID' });
    const album = await Album.findById(albumId);
    if (!album || album.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Album not found' });
    const { images } = req.body;
    if (!Array.isArray(images)) return res.status(400).json({ message: 'Images must be an array' });
    album.images.push(...images);
    await album.save();
    res.json(album);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to add images' });
  }
});

router.delete('/:id/images/:imageIndex', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const albumId = req.params.id as string;
    const imageIndex = parseInt(req.params.imageIndex as string);
    if (!mongoose.Types.ObjectId.isValid(albumId)) return res.status(400).json({ message: 'Invalid album ID' });
    const album = await Album.findById(albumId);
    if (!album || album.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Album not found' });
    if (imageIndex < 0 || imageIndex >= album.images.length) return res.status(400).json({ message: 'Invalid image index' });
    album.images.splice(imageIndex, 1);
    await album.save();
    res.json(album);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;