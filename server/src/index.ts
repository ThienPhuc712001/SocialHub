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
import LiveStream from './models/LiveStream';
import User from './models/User';
import { adminMiddleware } from './middleware/auth';
import errorHandler from './middleware/errorHandler';
import sanitize from './middleware/sanitize';

dotenv.config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
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

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
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
app.use('/api/auth/login', loginLimiter);
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
app.use('/api/admin', apiLimiter, adminMiddleware, adminRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });

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

  socket.on('livestream:host-join', async (data: { streamId: string }) => {
    streamHosts.set(data.streamId, socket.id);
    socket.join(`livestream:${data.streamId}`);
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

  socket.on('livestream:offer', (data: { streamId: string; targetSocketId: string; offer: any }) => {
    io.to(data.targetSocketId).emit('livestream:offer', { streamId: data.streamId, hostSocketId: socket.id, offer: data.offer });
  });

  socket.on('livestream:answer', (data: { streamId: string; hostSocketId: string; answer: any }) => {
    io.to(data.hostSocketId).emit('livestream:answer', { streamId: data.streamId, viewerSocketId: socket.id, answer: data.answer });
  });

  socket.on('livestream:ice-candidate', (data: { streamId: string; targetSocketId: string; candidate: any }) => {
    io.to(data.targetSocketId).emit('livestream:ice-candidate', { streamId: data.streamId, fromSocketId: socket.id, candidate: data.candidate });
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
        LiveStream.findByIdAndUpdate(streamId, {
          status: 'ended',
          endedAt: new Date(),
          viewerCount: 0,
          $set: {
            duration: Math.floor((Date.now() - (streamId ? 0 : Date.now())) / 1000),
          },
        }).exec();
        io.to(`livestream:${streamId}`).emit('livestream:host-disconnected', { streamId });
      }
    }
  });
});

app.set('io', io);

const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close();
  mongoose.connection.close();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});