import express, { Response } from 'express';
import mongoose from 'mongoose';
import StoryHighlight from '../models/StoryHighlight';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const highlights = await StoryHighlight.find({ author: new mongoose.Types.ObjectId(userId) })
      .populate('stories')
      .sort({ createdAt: -1 });

    res.json(highlights);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export const createHighlight = [
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, storyIds, coverImage } = req.body;
      if (!name) return res.status(400).json({ message: 'Name is required' });
      if (!storyIds || !Array.isArray(storyIds) || storyIds.length === 0) {
        return res.status(400).json({ message: 'At least one story ID is required' });
      }

      for (const sid of storyIds) {
        if (!mongoose.Types.ObjectId.isValid(sid)) {
          return res.status(400).json({ message: 'Invalid story ID' });
        }
      }

      const highlight = new StoryHighlight({
        author: new mongoose.Types.ObjectId(req.user!.id),
        name,
        stories: storyIds.map((sid: string) => new mongoose.Types.ObjectId(sid)),
        coverImage,
      });
      await highlight.save();
      await highlight.populate('stories');
      res.status(201).json(highlight);
    } catch (error: any) {
      res.status(500).json({ message: 'Internal server error' });
    }
  },
];

router.post('/', ...createHighlight);

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid highlight ID' });

    const highlight = await StoryHighlight.findById(id);
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });
    if (highlight.author.toString() !== req.user!.id) return res.status(403).json({ message: 'Not authorized to update this highlight' });

    highlight.name = req.body.name || highlight.name;
    if (req.body.coverImage) highlight.coverImage = req.body.coverImage;
    await highlight.save();
    await highlight.populate('stories');
    res.json(highlight);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid highlight ID' });

    const highlight = await StoryHighlight.findById(id);
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });
    if (highlight.author.toString() !== req.user!.id) return res.status(403).json({ message: 'Not authorized to delete this highlight' });

    await StoryHighlight.deleteOne({ _id: highlight._id });
    res.json({ message: 'Highlight deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/add-story', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid highlight ID' });

    const { storyId } = req.body;
    if (!storyId || !mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'Invalid story ID' });

    const highlight = await StoryHighlight.findById(id);
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });
    if (highlight.author.toString() !== req.user!.id) return res.status(403).json({ message: 'Not authorized to update this highlight' });

    if (highlight.stories.some((s: any) => s.toString() === storyId)) {
      return res.status(400).json({ message: 'Story already in highlight' });
    }

    highlight.stories.push(new mongoose.Types.ObjectId(storyId));
    await highlight.save();
    await highlight.populate('stories');
    res.json(highlight);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/remove-story/:storyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const storyId = req.params.storyId as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid highlight ID' });
    if (!mongoose.Types.ObjectId.isValid(storyId)) return res.status(400).json({ message: 'Invalid story ID' });

    const highlight = await StoryHighlight.findById(id);
    if (!highlight) return res.status(404).json({ message: 'Highlight not found' });
    if (highlight.author.toString() !== req.user!.id) return res.status(403).json({ message: 'Not authorized to update this highlight' });

    highlight.stories = highlight.stories.filter((s: any) => s.toString() !== storyId);
    await highlight.save();
    await highlight.populate('stories');
    res.json(highlight);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;