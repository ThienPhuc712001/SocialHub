import express, { Response } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username avatar')
      .populate('creator', 'username avatar')
      .sort({ lastMessageTime: -1 });

    const result = await Promise.all(conversations.map(async (conv) => {
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        sender: { $ne: userId },
        read: false,
      });

      const lastMsg = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'username avatar');

      return {
        ...conv.toObject(),
        lastMessage: lastMsg ? { content: lastMsg.content, sender: lastMsg.sender, createdAt: lastMsg.createdAt } : null,
        unreadCount,
      };
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, participantIds } = req.body;
    if (!name || !participantIds || !Array.isArray(participantIds) || participantIds.length < 1) {
      return res.status(400).json({ message: 'Name and at least one participant required' });
    }

    for (const pid of participantIds) {
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        return res.status(400).json({ message: 'Invalid participant ID' });
      }
    }

    const allParticipants = [new mongoose.Types.ObjectId(req.user!.id), ...participantIds.map((pid: string) => new mongoose.Types.ObjectId(pid))];

    const conversation = new Conversation({
      name,
      participants: allParticipants,
      isGroup: true,
      creator: new mongoose.Types.ObjectId(req.user!.id),
    });
    await conversation.save();
    await conversation.populate('participants', 'username avatar');
    await conversation.populate('creator', 'username avatar');

    res.status(201).json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid conversation ID' });

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group conversation not found' });
    if (conversation.creator?.toString() !== req.user!.id) return res.status(403).json({ message: 'Only creator can update group name' });

    conversation.name = req.body.name || conversation.name;
    await conversation.save();
    await conversation.populate('participants', 'username avatar');
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/add-member', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid conversation ID' });

    const { userId } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group conversation not found' });
    if (conversation.creator?.toString() !== req.user!.id) return res.status(403).json({ message: 'Only creator can add members' });

    if (conversation.participants.some((p: any) => p.toString() === userId)) {
      return res.status(400).json({ message: 'User already in group' });
    }

    conversation.participants.push(new mongoose.Types.ObjectId(userId));
    await conversation.save();
    await conversation.populate('participants', 'username avatar');
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/remove-member', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid conversation ID' });

    const { userId } = req.body;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group conversation not found' });
    if (conversation.creator?.toString() !== req.user!.id) return res.status(403).json({ message: 'Only creator can remove members' });

    if (userId === conversation.creator?.toString()) {
      return res.status(400).json({ message: 'Cannot remove creator from group' });
    }

    conversation.participants = conversation.participants.filter((p: any) => p.toString() !== userId);
    await conversation.save();
    await conversation.populate('participants', 'username avatar');
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid conversation ID' });

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group conversation not found' });
    if (conversation.creator?.toString() !== req.user!.id) return res.status(403).json({ message: 'Only creator can delete group' });

    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.deleteOne({ _id: conversation._id });

    res.json({ message: 'Group conversation deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid conversation ID' });

    const conversation = await Conversation.findById(id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!conversation.participants.some((p: any) => p.toString() === req.user!.id)) {
      return res.status(403).json({ message: 'Not a participant in this conversation' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({ conversationId: new mongoose.Types.ObjectId(id) });
    const messages = await Message.find({ conversationId: new mongoose.Types.ObjectId(id) })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    await Message.updateMany(
      { conversationId: new mongoose.Types.ObjectId(id), sender: { $ne: new mongoose.Types.ObjectId(req.user!.id) }, read: false },
      { read: true }
    );

    res.json({ messages, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid conversation ID' });

    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Content is required' });

    const conversation = await Conversation.findById(id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    if (!conversation.participants.some((p: any) => p.toString() === req.user!.id)) {
      return res.status(403).json({ message: 'Not a participant in this conversation' });
    }

    const senderId = new mongoose.Types.ObjectId(req.user!.id);
    const otherParticipants = conversation.participants.filter((p: any) => p.toString() !== req.user!.id);

    const message = new Message({
      sender: senderId,
      receiver: otherParticipants[0] || senderId,
      content,
      conversationId: conversation._id,
    });
    await message.save();
    await message.populate('sender', 'username avatar');

    conversation.lastMessage = content;
    conversation.lastMessageTime = new Date();
    await conversation.save();

    const io = req.app.get('io');
    for (const participantId of otherParticipants) {
      io.to(participantId.toString()).emit('newMessage', message);
    }

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;