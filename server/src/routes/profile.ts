import express, { Response } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import User from '../models/User';
import Post from '../models/Post';
import Comment from '../models/Comment';
import FriendRequest from '../models/Request';
import Block from '../models/Block';
import Bookmark from '../models/Bookmark';
import Message from '../models/Message';
import Notification from '../models/Notification';
import RefreshToken from '../models/RefreshToken';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { avatarUpload, coverUpload } from '../middleware/upload';
import { updateProfileValidation, followValidation, searchValidation, changePasswordValidation, deleteAccountValidation } from '../middleware/validation';

const router = express.Router();

import { escapeRegex } from '../utils/escapeRegex';

router.put('/', authMiddleware, updateProfileValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { bio, avatar } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    res.json(user);
  } catch {
    res.status(400).json({ message: 'Failed to update profile' });
  }
});

router.post('/avatar', authMiddleware, avatarUpload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.avatar = `/uploads/${req.file.filename}`;
    await user.save();
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

router.post('/cover-photo', authMiddleware, coverUpload.single('coverPhoto'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.coverPhoto = `/uploads/${req.file.filename}`;
    await user.save();
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to upload cover photo' });
  }
});

router.put('/privacy', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { isPrivate } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (typeof isPrivate === 'boolean') user.isPrivate = isPrivate;
    await user.save();
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to update privacy settings' });
  }
});

router.put('/notification-preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const prefs = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (prefs.likes !== undefined) user.notificationPreferences.likes = prefs.likes;
    if (prefs.comments !== undefined) user.notificationPreferences.comments = prefs.comments;
    if (prefs.follows !== undefined) user.notificationPreferences.follows = prefs.follows;
    if (prefs.messages !== undefined) user.notificationPreferences.messages = prefs.messages;
    if (prefs.bookmarks !== undefined) user.notificationPreferences.bookmarks = prefs.bookmarks;
    await user.save();
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to update notification preferences' });
  }
});

router.put('/change-password', authMiddleware, changePasswordValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to change password' });
  }
});

router.delete('/account', authMiddleware, deleteAccountValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { password } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Password is incorrect' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);

    await Post.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });
    await Bookmark.deleteMany({ user: userId });
    await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });
    await FriendRequest.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    await Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] });
    await RefreshToken.deleteMany({ userId });
    await User.findByIdAndDelete(req.user!.id);

    res.json({ message: 'Account deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

router.post('/block/:id', authMiddleware, followValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const targetId = req.params.id as string;
    if (targetId === req.user!.id) return res.status(400).json({ message: 'Cannot block yourself' });
    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const existing = await Block.findOne({
      blocker: new mongoose.Types.ObjectId(req.user!.id),
      blocked: new mongoose.Types.ObjectId(targetId),
    });
    if (existing) return res.status(400).json({ message: 'Already blocked' });

    const currentUser = await User.findById(req.user!.id);
    if (currentUser) {
      currentUser.following = currentUser.following.filter(id => !id.equals(new mongoose.Types.ObjectId(targetId)));
      currentUser.followers = currentUser.followers.filter(id => !id.equals(new mongoose.Types.ObjectId(targetId)));
      currentUser.blockedUsers.push(new mongoose.Types.ObjectId(targetId));
      await currentUser.save();
    }
    targetUser.following = targetUser.following.filter(id => !id.equals(new mongoose.Types.ObjectId(req.user!.id as string)));
    targetUser.followers = targetUser.followers.filter(id => !id.equals(new mongoose.Types.ObjectId(req.user!.id as string)));
    await targetUser.save();

    await FriendRequest.deleteOne({
      $or: [
        { from: new mongoose.Types.ObjectId(req.user!.id), to: new mongoose.Types.ObjectId(targetId) },
        { from: new mongoose.Types.ObjectId(targetId), to: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });

    await Block.create({
      blocker: new mongoose.Types.ObjectId(req.user!.id),
      blocked: new mongoose.Types.ObjectId(targetId),
    });

    res.json({ message: 'User blocked' });
  } catch {
    res.status(500).json({ message: 'Failed to block user' });
  }
});

router.post('/unblock/:id', authMiddleware, followValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const targetId = req.params.id as string;
    await Block.deleteOne({
      blocker: new mongoose.Types.ObjectId(req.user!.id),
      blocked: new mongoose.Types.ObjectId(targetId),
    });
    const currentUser = await User.findById(req.user!.id);
    if (currentUser) {
      currentUser.blockedUsers = currentUser.blockedUsers.filter(id => !id.equals(new mongoose.Types.ObjectId(targetId)));
      await currentUser.save();
    }
    res.json({ message: 'User unblocked' });
  } catch {
    res.status(500).json({ message: 'Failed to unblock user' });
  }
});

router.get('/blocked', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(req.user!.id) })
      .populate('blocked', 'username avatar bio');
    const blockedUsers = blocks.map(b => b.blocked);
    res.json(blockedUsers);
  } catch {
    res.status(500).json({ message: 'Failed to fetch blocked users' });
  }
});

router.get('/block-status/:id', authMiddleware, followValidation, async (req: AuthRequest, res: Response) => {
  try {
    const targetId = req.params.id as string;
    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(targetId) },
        { blocker: new mongoose.Types.ObjectId(targetId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    res.json({ isBlocked: !!blockExists, blockedByMe: blockExists?.blocker.toString() === req.user!.id });
  } catch {
    res.status(500).json({ message: 'Failed to check block status' });
  }
});

router.post('/follow/:id', authMiddleware, followValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const targetId = req.params.id as string;
    if (targetId === req.user!.id) return res.status(400).json({ message: 'Cannot follow yourself' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(targetId) },
        { blocker: new mongoose.Types.ObjectId(targetId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot follow blocked user' });

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: new mongoose.Types.ObjectId(req.user!.id), to: new mongoose.Types.ObjectId(targetId) },
        { from: new mongoose.Types.ObjectId(targetId), to: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (existingRequest) return res.status(400).json({ message: 'Request already exists' });

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const request = new FriendRequest({ from: new mongoose.Types.ObjectId(req.user!.id), to: new mongoose.Types.ObjectId(targetId) });
    await request.save();

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(targetId),
      sender: new mongoose.Types.ObjectId(req.user!.id),
      type: 'follow',
    });

    const io = req.app.get('io');
    io.to(targetId).emit('notification', { type: 'follow', senderId: req.user!.id });

    res.json({ message: 'Request sent' });
  } catch {
    res.status(500).json({ message: 'Failed to send request' });
  }
});

router.post('/unfollow/:id', authMiddleware, followValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const targetId = req.params.id as string;
    const userToUnfollow = await User.findById(targetId);
    const currentUser = await User.findById(req.user!.id);
    if (!userToUnfollow || !currentUser) return res.status(404).json({ message: 'User not found' });

    const unfollowId = new mongoose.Types.ObjectId(targetId);
    const currentUserId = new mongoose.Types.ObjectId(req.user!.id);
    currentUser.following = currentUser.following.filter(id => !id.equals(unfollowId));
    userToUnfollow.followers = userToUnfollow.followers.filter(id => !id.equals(currentUserId));

    await FriendRequest.deleteOne({
      $or: [
        { from: currentUserId, to: unfollowId },
        { from: unfollowId, to: currentUserId },
      ],
    });

    await currentUser.save();
    await userToUnfollow.save();
    res.json({ message: 'Unfollowed successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to unfollow' });
  }
});

router.get('/search/:query', authMiddleware, searchValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const queryStr = req.params.query as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(req.user!.id) });
    const blockedIds = blocks.map(b => b.blocked);

    const searchFilter = { username: { $regex: escapeRegex(queryStr), $options: 'i' }, _id: { $nin: blockedIds } };
    const total = await User.countDocuments(searchFilter);
    const users = await User.find(searchFilter).select('username avatar bio coverPhoto').skip(skip).limit(limit);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: 'Search failed' });
  }
});

router.get('/requests', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await FriendRequest.find({ to: new mongoose.Types.ObjectId(req.user!.id), status: 'pending' }).populate('from', 'username avatar');
    res.json(requests);
  } catch {
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

router.get('/requests/count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const count = await FriendRequest.countDocuments({ to: new mongoose.Types.ObjectId(req.user!.id), status: 'pending' });
    res.json({ count });
  } catch {
    res.status(500).json({ count: 0 });
  }
});

router.post('/accept/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const requestId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ message: 'Invalid request ID' });
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== req.user!.id) return res.status(404).json({ message: 'Request not found' });
    request.status = 'accepted';
    await request.save();

    const currentUser = await User.findById(req.user!.id);
    const otherUser = await User.findById(request.from);
    if (currentUser && otherUser) {
      currentUser.followers.push(new mongoose.Types.ObjectId(request.from));
      otherUser.following.push(new mongoose.Types.ObjectId(req.user!.id));
      await currentUser.save();
      await otherUser.save();
    }
    res.json({ message: 'Accepted' });
  } catch {
    res.status(500).json({ message: 'Failed to accept request' });
  }
});

router.post('/decline/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const requestId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(400).json({ message: 'Invalid request ID' });
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== req.user!.id) return res.status(404).json({ message: 'Request not found' });
    request.status = 'declined';
    await request.save();
    res.json({ message: 'Declined' });
  } catch {
    res.status(500).json({ message: 'Failed to decline request' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(userId) },
        { blocker: new mongoose.Types.ObjectId(userId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });

    res.json({ ...user.toObject(), isBlocked: !!blockExists, blockedByMe: blockExists?.blocker.toString() === req.user!.id });
  } catch {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

export default router;