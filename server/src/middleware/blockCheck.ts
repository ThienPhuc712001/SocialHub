import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Block from '../models/Block';
import { AuthRequest } from './auth';

export const checkBlock = async (userId1: string, userId2: string): Promise<boolean> => {
  const blockExists = await Block.findOne({
    $or: [
      { blocker: new mongoose.Types.ObjectId(userId1), blocked: new mongoose.Types.ObjectId(userId2) },
      { blocker: new mongoose.Types.ObjectId(userId2), blocked: new mongoose.Types.ObjectId(userId1) },
    ],
  });
  return !!blockExists;
};

export const getBlockedIds = async (userId: string): Promise<mongoose.Types.ObjectId[]> => {
  const blocks = await Block.find({ blocker: new mongoose.Types.ObjectId(userId) });
  return blocks.map(b => b.blocked);
};

export const blockCheckMiddleware = (targetIdParam: string = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const targetId = req.params[targetIdParam] || req.body.targetUserId;
      if (!targetId || !req.user?.id) return next();
      const isBlocked = await checkBlock(req.user.id, targetId);
      if (isBlocked) return res.status(403).json({ message: 'Cannot interact with this user' });
      next();
    } catch {
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};