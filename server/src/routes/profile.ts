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

router.get('/search-mention', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (!q.trim()) return res.json([]);
    const users = await User.find({ username: { $regex: escapeRegex(q), $options: 'i' } })
      .select('_id username')
      .limit(10);
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Search failed' });
  }
});

router.get('/search-mention', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const queryStr = (req.query.q as string) || '';
    if (!queryStr.trim()) return res.json([]);
    const users = await User.find({ username: { $regex: escapeRegex(queryStr), $options: 'i' } })
      .select('_id username avatar').limit(10);
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const queryStr = (req.query.q as string) || '';
    if (!queryStr.trim()) return res.json({ users: [], total: 0, page: 1, pages: 0 });
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

router.get('/close-friends', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).populate('closeFriends', 'username avatar bio');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.closeFriends);
  } catch {
    res.status(500).json({ message: 'Failed to fetch close friends' });
  }
});

router.post('/close-friends/:id', authMiddleware, followValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const targetId = req.params.id as string;
    if (targetId === req.user!.id) return res.status(400).json({ message: 'Cannot add yourself as close friend' });
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const oid = new mongoose.Types.ObjectId(targetId);
    if (user.closeFriends.some(id => id.equals(oid))) return res.status(400).json({ message: 'Already a close friend' });
    user.closeFriends.push(oid);
    await user.save();
    res.json({ message: 'Added to close friends' });
  } catch {
    res.status(500).json({ message: 'Failed to add close friend' });
  }
});

router.delete('/close-friends/:id', authMiddleware, followValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const targetId = req.params.id as string;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const oid = new mongoose.Types.ObjectId(targetId);
    user.closeFriends = user.closeFriends.filter(id => !id.equals(oid));
    await user.save();
    res.json({ message: 'Removed from close friends' });
  } catch {
    res.status(500).json({ message: 'Failed to remove close friend' });
  }
});

router.put('/privacy-settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const settings = req.body;
    if (settings.postsVisibility) user.privacySettings.postsVisibility = settings.postsVisibility;
    if (settings.messagesFrom) user.privacySettings.messagesFrom = settings.messagesFrom;
    if (settings.storiesVisibility) user.privacySettings.storiesVisibility = settings.storiesVisibility;
    if (settings.profileVisibility) user.privacySettings.profileVisibility = settings.profileVisibility;
    if (typeof settings.activityStatus === 'boolean') user.privacySettings.activityStatus = settings.activityStatus;
    if (typeof settings.dataSharing === 'boolean') user.privacySettings.dataSharing = settings.dataSharing;
    await user.save();
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to update privacy settings' });
  }
});

router.put('/monetization-settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const settings = req.body;
    if (typeof settings.allowAds === 'boolean') user.monetizationSettings.allowAds = settings.allowAds;
    if (typeof settings.creatorSubscriptions === 'boolean') user.monetizationSettings.creatorSubscriptions = settings.creatorSubscriptions;
    if (typeof settings.subscriptionPrice === 'number') user.monetizationSettings.subscriptionPrice = settings.subscriptionPrice;
    if (settings.adsFrequency) user.monetizationSettings.adsFrequency = settings.adsFrequency;
    await user.save();
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to update monetization settings' });
  }
});

router.get('/analytics', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const timeRange = (req.query.timeRange as string) || '30d';

    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case 'all': startDate = new Date(0); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    }

    const totalPosts = await Post.countDocuments({ author: userId, createdAt: { $gte: startDate } });
    const userPosts = await Post.find({ author: userId, createdAt: { $gte: startDate } }).select('likes commentCount viewCount createdAt');
    const totalLikes = userPosts.reduce((sum, p) => sum + p.likes.length, 0);
    const totalComments = userPosts.reduce((sum, p) => sum + p.commentCount, 0);
    const totalViews = userPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

    const allTimePosts = await Post.countDocuments({ author: userId });
    const allTimeLikes = (await Post.find({ author: userId }).select('likes')).reduce((sum, p) => sum + p.likes.length, 0);

    const user = await User.findById(userId);
    const followersCount = user?.followers.length || 0;
    const followingCount = user?.following.length || 0;
    const engagementRate = totalPosts > 0 && followersCount > 0
      ? ((totalLikes + totalComments) / followersCount / totalPosts) * 100
      : 0;

    const topPosts = await Post.find({ author: userId })
      .select('content likes commentCount viewCount createdAt')
      .sort({ viewCount: -1 })
      .limit(5);

    const topPostsFormatted = topPosts.map(p => ({
      _id: p._id,
      content: p.content,
      likes: p.likes.length,
      comments: p.commentCount,
      views: p.viewCount || 0,
      createdAt: p.createdAt,
    }));

    const monthlyStats = await Post.aggregate([
      { $match: { author: userId, createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        posts: { $sum: 1 },
        likes: { $sum: { $size: '$likes' } },
        comments: { $sum: '$commentCount' },
      }},
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);
    const monthlyStatsFormatted = monthlyStats.map(m => ({
      month: m._id,
      posts: m.posts,
      likes: m.likes,
      comments: m.comments,
    }));

    const recentActivityDocs = await Notification.find({ recipient: userId })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentActivity = recentActivityDocs.map(n => {
      const senderName = (n.sender as any)?.username || 'Someone';
      const descriptions: Record<string, string> = {
        like: `${senderName} liked your post`,
        comment: `${senderName} commented on your post`,
        follow: `${senderName} followed you`,
        message: `${senderName} sent you a message`,
        bookmark: `${senderName} bookmarked your post`,
      };
      return {
        type: n.type === 'bookmark' ? 'post' : n.type === 'message' ? 'comment' : n.type,
        description: descriptions[n.type] || `${senderName} interacted with you`,
        timestamp: n.createdAt,
      };
    });

    res.json({
      totalPosts: allTimePosts,
      totalLikes: allTimeLikes,
      totalComments,
      totalViews,
      followersCount,
      followingCount,
      engagementRate: Math.round(engagementRate * 10) / 10,
      topPosts: topPostsFormatted,
      monthlyStats: monthlyStatsFormatted,
      recentActivity,
    });
  } catch {
    res.status(500).json({ message: 'Failed to fetch analytics' });
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