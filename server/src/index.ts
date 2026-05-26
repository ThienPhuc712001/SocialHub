import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import profileRoutes from './routes/profile';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import storyRoutes from './routes/stories';
import reportRoutes from './routes/reports';
import conversationRoutes from './routes/conversations';
import hashtagRoutes from './routes/hashtags';
import highlightRoutes from './routes/highlights';
import adminRoutes from './routes/admin';
import livestreamRoutes from './routes/livestreams';
import albumRoutes from './routes/albums';
import stickerRoutes from './routes/stickers';
import videocallRoutes from './routes/videocalls';
import chatbotRoutes from './routes/chatbot';
import LiveStream from './models/LiveStream';
import Post from './models/Post';
import StickerPack from './models/StickerPack';
import User from './models/User';
import { adminMiddleware } from './middleware/auth';
import errorHandler from './middleware/errorHandler';
import sanitize from './middleware/sanitize';
import fs from 'fs';

dotenv.config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

const app = express();
app.set('etag', false);
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGINS = [process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'http://localhost:5174'];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: 'Too many requests, please try again later',
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(cors({
  origin: CLIENT_ORIGINS,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(sanitize);
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '1d' }));

app.get('/health', (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', apiLimiter, postRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);
app.use('/api/messages', apiLimiter, messageRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/stories', apiLimiter, storyRoutes);
app.use('/api/reports', apiLimiter, reportRoutes);
app.use('/api/conversations', apiLimiter, conversationRoutes);
app.use('/api/hashtags', apiLimiter, hashtagRoutes);
app.use('/api/highlights', apiLimiter, highlightRoutes);
app.use('/api/livestreams', apiLimiter, livestreamRoutes);
app.use('/api/albums', apiLimiter, albumRoutes);
app.use('/api/stickers', apiLimiter, stickerRoutes);
app.use('/api/videocalls', apiLimiter, videocallRoutes);
app.use('/api/chatbot', apiLimiter, chatbotRoutes);
app.use('/api/admin', apiLimiter, adminMiddleware, adminRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log('MongoDB connected');
    seedDefaultStickerPacks();
  })
  .catch(err => { console.error(err); process.exit(1); });

const seedDefaultStickerPacks = async () => {
  const count = await StickerPack.countDocuments({ isDefault: true });
  if (count > 0) return;

  const defaultPacks = [
    {
      name: 'Smileys', description: 'Classic smiley faces', isDefault: true,
      stickers: [
        { id: 'smile', name: 'Smile', emoji: '😀', url: '' },
        { id: 'laugh', name: 'Laugh', emoji: '😂', url: '' },
        { id: 'wink', name: 'Wink', emoji: '😉', url: '' },
        { id: 'love', name: 'Love', emoji: '😍', url: '' },
        { id: 'cool', name: 'Cool', emoji: '😎', url: '' },
        { id: 'think', name: 'Think', emoji: '🤔', url: '' },
        { id: 'cry', name: 'Cry', emoji: '😢', url: '' },
        { id: 'angry', name: 'Angry', emoji: '😡', url: '' },
      ],
    },
    {
      name: 'Animals', description: 'Cute animal stickers', isDefault: true,
      stickers: [
        { id: 'dog', name: 'Dog', emoji: '🐶', url: '' },
        { id: 'cat', name: 'Cat', emoji: '🐱', url: '' },
        { id: 'bear', name: 'Bear', emoji: '🐻', url: '' },
        { id: 'rabbit', name: 'Rabbit', emoji: '🐰', url: '' },
        { id: 'panda', name: 'Panda', emoji: '🐼', url: '' },
        { id: 'unicorn', name: 'Unicorn', emoji: '🦄', url: '' },
      ],
    },
    {
      name: 'Gestures', description: 'Hand gestures and actions', isDefault: true,
      stickers: [
        { id: 'thumbsup', name: 'Thumbs Up', emoji: '👍', url: '' },
        { id: 'thumbsdown', name: 'Thumbs Down', emoji: '👎', url: '' },
        { id: 'clap', name: 'Clap', emoji: '👏', url: '' },
        { id: 'wave', name: 'Wave', emoji: '👋', url: '' },
        { id: 'fist', name: 'Fist', emoji: '✊', url: '' },
        { id: 'heart', name: 'Heart', emoji: '❤️', url: '' },
      ],
    },
    {
      name: 'Food', description: 'Food and drinks', isDefault: true,
      stickers: [
        { id: 'pizza', name: 'Pizza', emoji: '🍕', url: '' },
        { id: 'coffee', name: 'Coffee', emoji: '☕', url: '' },
        { id: 'cake', name: 'Cake', emoji: '🎂', url: '' },
        { id: 'burger', name: 'Burger', emoji: '🍔', url: '' },
        { id: 'beer', name: 'Beer', emoji: '🍺', url: '' },
        { id: 'icecream', name: 'Ice Cream', emoji: '🍦', url: '' },
      ],
    },
  ];

  await StickerPack.insertMany(defaultPacks);
  console.log('Default sticker packs seeded');
};

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map<string, Set<string>>();
const streamHosts = new Map<string, string>();
const streamViewers = new Map<string, Set<string>>();
const pendingViewers = new Map<string, { socketId: string; userId: string }[]>();

io.use((socket: Socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    socket.data.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket: Socket) => {
  const userId = socket.data.userId as string;
  if (!userId) return socket.disconnect();

  console.log('User connected:', userId);
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId)!.add(socket.id);
  socket.join(userId);
  io.emit('onlineUsers', Array.from(onlineUsers.keys()));

  socket.on('typing', (data: { to: string }) => {
    io.to(data.to).emit('typing', { from: userId });
  });

  socket.on('stopTyping', (data: { to: string }) => {
    io.to(data.to).emit('stopTyping', { from: userId });
  });

  socket.on('call:offer', (data: { to: string; offer: any; callType: string }) => {
    io.to(data.to).emit('call:offer', { from: userId, offer: data.offer, callType: data.callType });
  });

  socket.on('call:answer', (data: { to: string; answer: any }) => {
    io.to(data.to).emit('call:answer', { from: userId, answer: data.answer });
  });

  socket.on('call:ice-candidate', (data: { to: string; candidate: any }) => {
    io.to(data.to).emit('call:ice-candidate', { from: userId, candidate: data.candidate });
  });

  socket.on('call:start', (data: { to: string; callType: string }) => {
    io.to(data.to).emit('call:start', { from: userId, callType: data.callType });
  });

  socket.on('call:end', (data: { to: string }) => {
    io.to(data.to).emit('call:end', { from: userId });
  });

  socket.on('call:reject', (data: { to: string }) => {
    io.to(data.to).emit('call:reject', { from: userId });
  });

  socket.on('livestream:host-join', async (data: { streamId: string }) => {
    streamHosts.set(data.streamId, socket.id);
    socket.join(`livestream:${data.streamId}`);

    const pended = pendingViewers.get(data.streamId) || [];
    pendingViewers.delete(data.streamId);
    for (const viewer of pended) {
      io.to(socket.id).emit('livestream:viewer-joined', {
        streamId: data.streamId,
        viewerSocketId: viewer.socketId,
        viewerUserId: viewer.userId,
      });
    }
  });

  socket.on('livestream:viewer-join', async (data: { streamId: string }) => {
    socket.join(`livestream:${data.streamId}`);
    if (!streamViewers.has(data.streamId)) streamViewers.set(data.streamId, new Set());
    streamViewers.get(data.streamId)!.add(socket.id);

    const count = streamViewers.get(data.streamId)?.size || 0;
    await LiveStream.findByIdAndUpdate(data.streamId, {
      viewerCount: count,
      $max: { peakViewerCount: count },
    });

    io.to(`livestream:${data.streamId}`).emit('livestream:viewer-count', { streamId: data.streamId, count });

    const hostSocketId = streamHosts.get(data.streamId);
    if (hostSocketId) {
      io.to(hostSocketId).emit('livestream:viewer-joined', { streamId: data.streamId, viewerSocketId: socket.id, viewerUserId: userId });
    } else {
      const list = pendingViewers.get(data.streamId) || [];
      list.push({ socketId: socket.id, userId });
      pendingViewers.set(data.streamId, list);
    }
  });

  socket.on('livestream:viewer-leave', async (data: { streamId: string }) => {
    socket.leave(`livestream:${data.streamId}`);
    const viewers = streamViewers.get(data.streamId);
    if (viewers) {
      viewers.delete(socket.id);
      const count = viewers.size;
      await LiveStream.findByIdAndUpdate(data.streamId, { viewerCount: count });
      io.to(`livestream:${data.streamId}`).emit('livestream:viewer-count', { streamId: data.streamId, count });
      const hostSocketId = streamHosts.get(data.streamId);
      if (hostSocketId) {
        io.to(hostSocketId).emit('livestream:viewer-left', { streamId: data.streamId, viewerSocketId: socket.id });
      }
    }
  });

  socket.on('livestream:stream-chunk', (data: { streamId: string; chunk: Buffer }) => {
    socket.to(`livestream:${data.streamId}`).emit('livestream:stream-chunk', data);
  });

  socket.on('livestream:chat', async (data: { streamId: string; message: string }) => {
    const userDoc = await User.findById(userId).select('username');
    const username = userDoc?.username || 'Unknown';
    io.to(`livestream:${data.streamId}`).emit('livestream:chat', {
      streamId: data.streamId,
      userId,
      username,
      message: data.message,
      timestamp: new Date(),
    });
  });

  socket.on('livestream:like', async (data: { streamId: string }) => {
    await LiveStream.findByIdAndUpdate(data.streamId, { $inc: { likeCount: 1 } });
    const stream = await LiveStream.findById(data.streamId);
    io.to(`livestream:${data.streamId}`).emit('livestream:like', {
      streamId: data.streamId,
      userId,
      likeCount: stream?.likeCount || 0,
    });
  });

  socket.on('livestream:end', async (data: { streamId: string }) => {
    const stream = await LiveStream.findById(data.streamId);
    if (stream) {
      stream.status = 'ended';
      stream.endedAt = new Date();
      stream.duration = Math.floor((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000);
      stream.viewerCount = 0;
      await stream.save();
    }
    streamHosts.delete(data.streamId);
    streamViewers.delete(data.streamId);
    io.to(`livestream:${data.streamId}`).emit('livestream:ended', { streamId: data.streamId });
    const socketsInRoom = await io.in(`livestream:${data.streamId}`).fetchSockets();
    for (const s of socketsInRoom) {
      s.leave(`livestream:${data.streamId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', userId);
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
      }
    }
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

    for (const [streamId, list] of pendingViewers.entries()) {
      const filtered = list.filter(v => v.socketId !== socket.id);
      if (filtered.length === 0) pendingViewers.delete(streamId);
      else pendingViewers.set(streamId, filtered);
    }

    for (const [streamId, viewers] of streamViewers.entries()) {
      if (viewers.has(socket.id)) {
        viewers.delete(socket.id);
        const count = viewers.size;
        LiveStream.findByIdAndUpdate(streamId, { viewerCount: count }).exec();
        io.to(`livestream:${streamId}`).emit('livestream:viewer-count', { streamId, count });
        const hostSocketId = streamHosts.get(streamId);
        if (hostSocketId) {
          io.to(hostSocketId).emit('livestream:viewer-left', { streamId, viewerSocketId: socket.id });
        }
      }
    }

    for (const [streamId, hostSocketId] of streamHosts.entries()) {
      if (hostSocketId === socket.id) {
        streamHosts.delete(streamId);
        streamViewers.delete(streamId);
        LiveStream.findById(streamId).then(streamDoc => {
          if (streamDoc && streamDoc.status !== 'ended') {
            streamDoc.status = 'ended';
            streamDoc.endedAt = new Date();
            streamDoc.duration = Math.floor((streamDoc.endedAt.getTime() - streamDoc.startedAt.getTime()) / 1000);
            streamDoc.viewerCount = 0;
            streamDoc.save();
          }
        }).catch(() => {});
        io.to(`livestream:${streamId}`).emit('livestream:host-disconnected', { streamId });
      }
    }
  });
});

app.set('io', io);

const scheduleInterval = setInterval(async () => {
  try {
    const now = new Date();
    const scheduledPosts = await Post.find({ status: 'scheduled', scheduledAt: { $lte: now } });
    for (const post of scheduledPosts) {
      post.status = 'published';
      await post.save();
      await post.populate('author', 'username avatar');
      io.emit('newPost', post);
    }
  } catch (err) {
    console.error('Scheduled post check error:', err);
  }
}, 60000);

const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  clearInterval(scheduleInterval);
  server.close();
  mongoose.connection.close();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});