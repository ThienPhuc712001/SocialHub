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
import { adminMiddleware } from './middleware/auth';
import errorHandler from './middleware/errorHandler';

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
const CLIENT_ORIGINS = [process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'http://localhost:5173', 'http://localhost:5174'];

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
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '1d' }));
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

io.on('connection', (socket: Socket) => {
  const userId = socket.data.userId;
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