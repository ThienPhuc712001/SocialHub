import express, { Response } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Bookmark from '../models/Bookmark';
import User from '../models/User';
import Block from '../models/Block';
import Notification from '../models/Notification';
import Message from '../models/Message';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { postUpload } from '../middleware/upload';
import { createPostValidation, updatePostValidation, commentValidation, replyValidation } from '../middleware/validation';

const router = express.Router();

import { extractHashtags } from '../utils/hashtags';
import { escapeRegex } from '../utils/escapeRegex';

router.get('/suggestions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const followingIds = user.following.map(id => new mongoose.Types.ObjectId(id.toString()));
    const excludedIds = [...followingIds, userId];

    const suggestedUsers = await User.find({ _id: { $nin: excludedIds }, isPrivate: false })
      .select('username avatar bio')
      .limit(5);

    const suggestedPosts = await Post.find({
      author: { $nin: excludedIds },
      visibility: 'public',
    })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ users: suggestedUsers, posts: suggestedPosts });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/reels', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;

    const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(req.user!.id) });
    const blockedIds = blocks.map(b => b.blocked);

    const filter: any = { image: { $exists: true, $ne: null }, author: { $nin: blockedIds }, visibility: 'public' };
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .populate('author', 'username avatar isVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/hashtags/:tag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tag = (req.params.tag as string).toLowerCase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(req.user!.id) });
    const blockedIds = blocks.map(b => b.blocked);

    const total = await Post.countDocuments({ hashtags: tag, author: { $nin: blockedIds } });
    const postList = await Post.find({ hashtags: tag, author: { $nin: blockedIds } })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ posts: postList, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const queryStr = (req.query.q as string) || '';
    if (!queryStr.trim()) return res.json({ posts: [], total: 0, page: 1, pages: 0 });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(req.user!.id) });
    const blockedIds = blocks.map(b => b.blocked);
    const escapedQuery = escapeRegex(queryStr);

    const searchFilter = {
      $or: [
        { content: { $regex: escapedQuery, $options: 'i' } },
        { title: { $regex: escapedQuery, $options: 'i' } },
        { hashtags: { $regex: escapedQuery, $options: 'i' } },
      ],
      author: { $nin: blockedIds },
    };

    const total = await Post.countDocuments(searchFilter);
    const postList = await Post.find(searchFilter)
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ posts: postList, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/bookmarks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const total = await Bookmark.countDocuments({ user: new mongoose.Types.ObjectId(req.user!.id) });
    const bookmarks = await Bookmark.find({ user: new mongoose.Types.ObjectId(req.user!.id) })
      .populate({
        path: 'post',
        populate: { path: 'author', select: 'username avatar' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const bookmarkedPosts = bookmarks
      .filter(b => b.post)
      .map(b => b.post);

    res.json({ posts: bookmarkedPosts, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/bookmark', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const existing = await Bookmark.findOne({ user: userId, post: post._id });
    if (existing) return res.status(400).json({ message: 'Already bookmarked' });

    await Bookmark.create({ user: userId, post: post._id });
    res.json({ message: 'Post bookmarked' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/bookmark', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    await Bookmark.deleteOne({ user: userId, post: new mongoose.Types.ObjectId(postId) });
    res.json({ message: 'Bookmark removed' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/share-to-chat', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    const { targetUserId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) return res.status(400).json({ message: 'Invalid target user ID' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: new mongoose.Types.ObjectId(targetUserId) },
        { blocker: new mongoose.Types.ObjectId(targetUserId), blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot share to this user' });

    const shareContent = `Shared a post: "${post.title || post.content.substring(0, 100)}" - /posts/${post._id}`;
    const message = new Message({
      sender: new mongoose.Types.ObjectId(req.user!.id),
      receiver: new mongoose.Types.ObjectId(targetUserId),
      content: shareContent,
    });
    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    const io = req.app.get('io');
    io.to(targetUserId).emit('newMessage', message);

    res.json({ message: 'Post shared to chat', data: message });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const post = await Post.findById(postId);
    if (!post || post.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Post not found' });

    await Post.updateOne({ author: new mongoose.Types.ObjectId(req.user!.id), pinned: true }, { pinned: false });
    post.pinned = true;
    await post.save();
    await post.populate('author', 'username avatar');
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const post = await Post.findById(postId);
    if (!post || post.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Post not found' });
    post.pinned = false;
    await post.save();
    await post.populate('author', 'username avatar');
    res.json(post);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userIdStr = req.params.userId as string;
    if (!mongoose.Types.ObjectId.isValid(userIdStr)) return res.status(400).json({ message: 'Invalid user ID' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const userId = new mongoose.Types.ObjectId(userIdStr);

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: userId },
        { blocker: userId, blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot view this user\'s posts' });

    const total = await Post.countDocuments({ author: userId });
    const userPosts = await Post.find({ author: userId })
      .populate('author', 'username avatar')
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ posts: userPosts, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const sort = (req.query.sort as string) || 'latest';

    const user = await User.findById(req.user!.id);
    const followingIds = user?.following || [];
    const authorFilter = [req.user!.id, ...followingIds];

    const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(req.user!.id) });
    const blockedIds = blocks.map(b => b.blocked);
    const filteredAuthors = authorFilter.filter(id => !blockedIds.some(bId => bId.equals(new mongoose.Types.ObjectId(id as string))));

    const total = await Post.countDocuments({ author: { $in: filteredAuthors } });

    let sortObj: { pinned: number; createdAt: number } | { pinned: number; 'likes.length': number; createdAt: number } = { pinned: -1, createdAt: -1 };
    if (sort === 'popular') {
      sortObj = { pinned: -1, 'likes.length': -1, createdAt: -1 };
    }

    const postList = await Post.find({ author: { $in: filteredAuthors } })
      .populate('author', 'username avatar')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.json({ posts: postList, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authMiddleware, postUpload.single('image'), createPostValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, content } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;
    const hashtags = extractHashtags(content);
    const post = new Post({ title, content, image, hashtags, author: new mongoose.Types.ObjectId(req.user!.id) });
    await post.save();
    await post.populate('author', 'username avatar');
    const io = req.app.get('io');
    io.emit('newPost', post);
    res.status(201).json(post);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to create post' });
  }
});

router.post('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const blockExists = await Block.findOne({
      $or: [
        { blocker: new mongoose.Types.ObjectId(req.user!.id), blocked: post.author },
        { blocker: post.author, blocked: new mongoose.Types.ObjectId(req.user!.id) },
      ],
    });
    if (blockExists) return res.status(403).json({ message: 'Cannot interact with this post' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    if (post.likes.some(like => like.equals(userId))) return res.status(400).json({ message: 'Already liked' });
    post.likes.push(userId);
    await post.save();

    if (post.author.toString() !== req.user!.id) {
      await Notification.deleteOne({ recipient: post.author, sender: userId, type: 'like', post: post._id });
      await Notification.create({ recipient: post.author, sender: userId, type: 'like', post: post._id });
      const io = req.app.get('io');
      io.to(post.author.toString()).emit('notification', { type: 'like', postId: post._id, senderId: req.user!.id });
    }

    res.json({ likes: post.likes.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    post.likes = post.likes.filter(id => !id.equals(userId));
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', authMiddleware, updatePostValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const post = await Post.findById(postId);
    if (!post || post.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Post not found' });
    post.title = req.body.title || post.title;
    post.content = req.body.content || post.content;
    post.hashtags = extractHashtags(post.content);
    post.editedAt = new Date();
    await post.save();
    await post.populate('author', 'username avatar');
    res.json(post);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to update post' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const post = await Post.findById(postId);
    if (!post || post.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Post not found' });
    await Post.deleteOne({ _id: post._id });
    await Comment.deleteMany({ post: post._id });
    await Bookmark.deleteMany({ post: post._id });

    const io = req.app.get('io');
    io.emit('postDeleted', post._id);

    res.json({ message: 'Post deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const total = await Comment.countDocuments({ post: new mongoose.Types.ObjectId(postId), parentComment: { $exists: false } });
    const commentList = await Comment.find({ post: new mongoose.Types.ObjectId(postId), parentComment: { $exists: false } })
      .populate('author', 'username avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const commentsWithReplies = await Promise.all(commentList.map(async (comment) => {
      const replies = await Comment.find({ parentComment: comment._id })
        .populate('author', 'username avatar')
        .sort({ createdAt: 1 });
      return { ...comment.toObject(), replies };
    }));

    res.json({ comments: commentsWithReplies, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/comments', authMiddleware, commentValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });
    const { content, parentCommentId } = req.body;
    const comment = new Comment({
      content,
      author: new mongoose.Types.ObjectId(req.user!.id),
      post: new mongoose.Types.ObjectId(postId),
      parentComment: parentCommentId ? new mongoose.Types.ObjectId(parentCommentId) : undefined,
    });
    await comment.save();
    await comment.populate('author', 'username avatar');

    const post = await Post.findById(postId);
    const recipientId = parentCommentId ? (await Comment.findById(parentCommentId))?.author : post?.author;
    if (recipientId && recipientId.toString() !== req.user!.id) {
      await Notification.create({
        recipient: recipientId,
        sender: new mongoose.Types.ObjectId(req.user!.id),
        type: 'comment',
        post: new mongoose.Types.ObjectId(postId),
        content: content.substring(0, 50),
      });
      const io = req.app.get('io');
      io.to(recipientId.toString()).emit('notification', { type: 'comment', postId, senderId: req.user!.id });
    }

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(400).json({ message: 'Failed to add comment' });
  }
});

router.post('/:id/comments/:commentId/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    if (!mongoose.Types.ObjectId.isValid(commentId)) return res.status(400).json({ message: 'Invalid comment ID' });
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    if (comment.likes.some(id => id.equals(userId))) return res.status(400).json({ message: 'Already liked' });
    comment.likes.push(userId);
    await comment.save();
    res.json({ likes: comment.likes.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/comments/:commentId/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    if (!mongoose.Types.ObjectId.isValid(commentId)) return res.status(400).json({ message: 'Invalid comment ID' });
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    comment.likes = comment.likes.filter(id => !id.equals(userId));
    await comment.save();
    res.json({ likes: comment.likes.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = req.params.commentId as string;
    if (!mongoose.Types.ObjectId.isValid(commentId)) return res.status(400).json({ message: 'Invalid comment ID' });
    const comment = await Comment.findById(commentId);
    if (!comment || comment.author.toString() !== req.user!.id) return res.status(404).json({ message: 'Comment not found' });
    const replyCount = await Comment.countDocuments({ parentComment: comment._id });
    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();
    await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -(1 + replyCount) } });
    res.json({ message: 'Comment deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/repost', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });

    const originalPost = await Post.findById(postId);
    if (!originalPost) return res.status(404).json({ message: 'Original post not found' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    if (originalPost.author.equals(userId)) return res.status(400).json({ message: 'Cannot repost your own post' });

    const existingRepost = await Post.findOne({ originalPost: postId, isRepost: true, author: userId });
    if (existingRepost) return res.status(400).json({ message: 'Already reposted' });

    const { repostComment } = req.body;
    const repost = new Post({
      content: repostComment || '',
      isRepost: true,
      originalPost: new mongoose.Types.ObjectId(postId),
      author: userId,
      hashtags: originalPost.hashtags,
      visibility: 'public',
    });
    await repost.save();
    await repost.populate('author', 'username avatar');
    await repost.populate('originalPost');
    res.status(201).json(repost);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/reactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });

    const { type } = req.body;
    const allowedReactions = ['like', 'love', 'laugh', 'sad', 'angry', 'wow', 'fire', 'clap'];
    if (!type || !allowedReactions.includes(type)) return res.status(400).json({ message: `Reaction type must be one of: ${allowedReactions.join(', ')}` });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const reactions = post.reactions as Map<string, mongoose.Types.ObjectId[]> || new Map();

    for (const [reactionType, users] of reactions) {
      const idx = users.findIndex(id => id.equals(userId));
      if (idx !== -1) {
        users.splice(idx, 1);
        if (users.length === 0) reactions.delete(reactionType);
      }
    }

    if (!reactions.has(type)) reactions.set(type, []);
    reactions.get(type)!.push(userId);
    post.reactions = reactions;
    await post.save();
    res.json({ reactions: Object.fromEntries(post.reactions) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/reactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const reactions = post.reactions as Map<string, mongoose.Types.ObjectId[]> || new Map();

    for (const [reactionType, users] of reactions) {
      const idx = users.findIndex(id => id.equals(userId));
      if (idx !== -1) {
        users.splice(idx, 1);
        if (users.length === 0) reactions.delete(reactionType);
      }
    }

    post.reactions = reactions;
    await post.save();
    res.json({ reactions: Object.fromEntries(post.reactions) });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/view', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.viewCount || !Array.isArray(post.viewers)) {
      await Post.updateOne({ _id: postId }, { $inc: { viewCount: 1 }, $addToSet: { viewers: userId } });
    }
    const updatedPost = await Post.findById(postId);
    res.json({ viewCount: updatedPost?.viewCount || 0 });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/poll/vote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(postId)) return res.status(400).json({ message: 'Invalid post ID' });

    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number' || optionIndex < 0) return res.status(400).json({ message: 'Invalid option index' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!post.poll) return res.status(400).json({ message: 'Post does not have a poll' });
    if (post.poll.expiresAt && new Date() > post.poll.expiresAt) return res.status(400).json({ message: 'Poll has expired' });

    const userId = new mongoose.Types.ObjectId(req.user!.id);
    for (const option of post.poll.options) {
      const alreadyVoted = option.votes.some(id => id.equals(userId));
      if (alreadyVoted) return res.status(400).json({ message: 'Already voted' });
    }

    if (optionIndex >= post.poll.options.length) return res.status(400).json({ message: 'Invalid option index' });

    post.poll.options[optionIndex].votes.push(userId);
    await post.save();
    res.json({ poll: post.poll });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;