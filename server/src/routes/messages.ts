import express, { Response } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message';
import User from '../models/User';
import Block from '../models/Block';
import Notification from '../models/Notification';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { messageValidation } from '../middleware/validation';
import { audioUpload, fileUpload, chatImageUpload } from '../middleware/upload';

const router = express.Router();

import { escapeRegex } from '../utils/escapeRegex';

router.get('/search/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId as string;
    const query = req.query.q as string;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Invalid user ID' });
    if (!query) return res.status(400).json({ message: 'Search query required' });

    const currentUserId = new mongoose.Types.ObjectId(req.user!.id);
    const otherUserId = new mongoose.Types.ObjectId(targetUserId);
    const escapedQuery = escapeRegex(query);

    const messages = await Message.find({
      $or: [{ sender: currentUserId, receiver: otherUserId }, { sender: otherUserId, receiver: currentUserId }],
      content: { $regex: escapedQuery, $options: 'i' },
    }).populate('sender', 'username avatar').populate('receiver', 'username avatar')
      .sort({ createdAt: -1 }).limit(50);

    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/conversations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const blocks = await Block.find({
      $or: [{ blocker: userId }, { blocked: userId }],
    });
    const blockedIds = blocks.map(b => b.blocked);
    const blockedByIds = blocks.map(b => b.blocker);
    const allBlockedIds = [...blockedIds, ...blockedByIds].filter(id => !id.equals(userId));

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
      sender: { $nin: allBlockedIds },
      receiver: { $nin: allBlockedIds },
    }).populate('sender', 'username avatar').populate('receiver', 'username avatar');

    const users = new Map();
    messages.forEach((msg: any) => {
      const other = msg.sender._id.toString() === req.user!.id ? msg.receiver : msg.sender;
      if (!users.has(other._id.toString())) {
        users.set(other._id.toString(), { ...other.toObject(), lastMessage: msg.content || `[${msg.messageType}]`, lastMessageTime: msg.createdAt });
      } else {
        const existing = users.get(other._id.toString());
        if (msg.createdAt > existing.lastMessageTime) {
          users.set(other._id.toString(), { ...other.toObject(), lastMessage: msg.content || `[${msg.messageType}]`, lastMessageTime: msg.createdAt });
        }
      }
    });

    const unreadCounts = new Map();
    messages.forEach((msg: any) => {
      if (!msg.read && msg.receiver._id.toString() === req.user!.id) {
        const otherId = msg.sender._id.toString();
        unreadCounts.set(otherId, (unreadCounts.get(otherId) || 0) + 1);
      }
    });

    const conversations = Array.from(users.values()).map((user: any) => ({
      ...user,
      unreadCount: unreadCounts.get(user._id.toString()) || 0,
    }));

    conversations.sort((a: any, b: any) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const currentUserId = new mongoose.Types.ObjectId(req.user!.id);
    const otherUserId = new mongoose.Types.ObjectId(targetUserId);

    const blockExists = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: otherUserId },
        { blocker: otherUserId, blocked: currentUserId },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot message this user' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    });

    const msgs = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    }).populate('sender', 'username avatar').populate('receiver', 'username avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, read: false },
      { read: true }
    );

    const io = req.app.get('io');
    io.to(targetUserId).emit('messagesRead', { readBy: req.user!.id });

    res.json({ messages: msgs, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:userId', authMiddleware, messageValidation, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const { content, messageType, stickerId } = req.body;
    const msgType = messageType || 'text';

    if (msgType === 'text' && (!content || !content.trim())) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    if (msgType === 'sticker' && !stickerId) {
      return res.status(400).json({ message: 'Sticker ID is required' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(targetUserId) },
        { blocker: new mongoose.Types.ObjectId(targetUserId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot message this user' });

    const messageData: any = {
      sender: new mongoose.Types.ObjectId(req.user!.id),
      receiver: new mongoose.Types.ObjectId(targetUserId),
      messageType: msgType,
    };
    if (msgType === 'text') messageData.content = content;
    if (msgType === 'sticker') { messageData.stickerId = stickerId; messageData.content = stickerId; }

    const message = new Message(messageData);
    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(targetUserId),
      sender: new mongoose.Types.ObjectId(req.user!.id),
      type: 'message',
      content: msgType === 'text' ? content.substring(0, 50) : `[${msgType}]`,
    });

    const io = req.app.get('io');
    io.to(targetUserId).emit('newMessage', message);
    io.to(targetUserId).emit('notification', { type: 'message', senderId: req.user!.id });

    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to send message' });
  }
});

router.post('/:userId/voice', authMiddleware, audioUpload.single('audio'), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Invalid user ID' });
    if (!req.file) return res.status(400).json({ message: 'Audio file is required' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(targetUserId) },
        { blocker: new mongoose.Types.ObjectId(targetUserId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot message this user' });

    const audioUrl = `/uploads/${req.file.filename}`;
    const message = new Message({
      sender: new mongoose.Types.ObjectId(req.user!.id),
      receiver: new mongoose.Types.ObjectId(targetUserId),
      messageType: 'voice',
      content: 'Voice message',
      audioUrl,
    });
    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(targetUserId),
      sender: new mongoose.Types.ObjectId(req.user!.id),
      type: 'message',
      content: '[Voice message]',
    });

    const io = req.app.get('io');
    io.to(targetUserId).emit('newMessage', message);
    io.to(targetUserId).emit('notification', { type: 'message', senderId: req.user!.id });

    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to send voice message' });
  }
});

router.post('/:userId/file', authMiddleware, fileUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Invalid user ID' });
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(targetUserId) },
        { blocker: new mongoose.Types.ObjectId(targetUserId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot message this user' });

    const fileUrl = `/uploads/${req.file.filename}`;
    const message = new Message({
      sender: new mongoose.Types.ObjectId(req.user!.id),
      receiver: new mongoose.Types.ObjectId(targetUserId),
      messageType: 'file',
      content: req.file.originalname || 'File',
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    });
    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(targetUserId),
      sender: new mongoose.Types.ObjectId(req.user!.id),
      type: 'message',
      content: `[File: ${req.file.originalname}]`,
    });

    const io = req.app.get('io');
    io.to(targetUserId).emit('newMessage', message);
    io.to(targetUserId).emit('notification', { type: 'message', senderId: req.user!.id });

    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to send file' });
  }
});

router.post('/:userId/image', authMiddleware, chatImageUpload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Invalid user ID' });
    if (!req.file) return res.status(400).json({ message: 'Image is required' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(targetUserId) },
        { blocker: new mongoose.Types.ObjectId(targetUserId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot message this user' });

    const imageUrl = `/uploads/${req.file.filename}`;
    const message = new Message({
      sender: new mongoose.Types.ObjectId(req.user!.id),
      receiver: new mongoose.Types.ObjectId(targetUserId),
      messageType: 'image',
      content: 'Image',
      imageUrl,
    });
    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(targetUserId),
      sender: new mongoose.Types.ObjectId(req.user!.id),
      type: 'message',
      content: '[Image]',
    });

    const io = req.app.get('io');
    io.to(targetUserId).emit('newMessage', message);
    io.to(targetUserId).emit('notification', { type: 'message', senderId: req.user!.id });

    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to send image' });
  }
});

router.delete('/:userId/messages/:messageId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const messageId = req.params.messageId as string;
    const targetUserId = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user!.id) {
      return res.status(403).json({ message: 'Cannot delete others\' messages' });
    }
    await Message.deleteOne({ _id: message._id });

    const io = req.app.get('io');
    io.to(targetUserId).emit('messageDeleted', { messageId: message._id });

    res.json({ message: 'Message deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;