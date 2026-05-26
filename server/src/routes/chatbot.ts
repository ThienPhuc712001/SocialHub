import express, { Response } from 'express';
import { processAIMessage } from '../utils/ai';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

const conversationHistory = new Map<string, { role: 'user' | 'assistant'; content: string }[]>();

router.post('/message', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const userId = req.user!.id;
    if (!conversationHistory.has(userId)) {
      conversationHistory.set(userId, []);
    }

    const history = conversationHistory.get(userId)!;
    history.push({ role: 'user', content: message.trim() });

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_API_BASE_URL;
    const model = process.env.OPENAI_MODEL;
    const result = await processAIMessage(history, apiKey, baseUrl, model);

    if (result.success) {
      history.push({ role: 'assistant', content: result.message });
      if (history.length > 50) {
        conversationHistory.set(userId, history.slice(-30));
      }
    }

    res.json({
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to process message' });
  }
});

router.post('/clear', authMiddleware, async (req: AuthRequest, res: Response) => {
  conversationHistory.delete(req.user!.id);
  res.json({ message: 'Conversation history cleared' });
});

export default router;