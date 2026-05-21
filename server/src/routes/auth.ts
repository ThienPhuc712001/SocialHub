import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import PasswordReset from '../models/PasswordReset';
import { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation } from '../middleware/validation';
import { validate } from '../middleware/validation';

const router = express.Router();

const generateTokens = (userId: string) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });
  return { token, refreshToken };
};

router.post('/register', registerValidation, validate, async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    const user = new User({ username, email: normalizedEmail, password });
    await user.save();
    const { token, refreshToken } = generateTokens(user.id);
    await RefreshToken.create({ userId: user._id, token: refreshToken });
    res.status(201).json({
      token,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error: any) {
    res.status(400).json({ message: 'Registration failed' });
  }
});

router.post('/login', loginValidation, validate, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const { token, refreshToken } = generateTokens(user.id);
    await RefreshToken.create({ userId: user._id, token: refreshToken });
    res.json({
      token,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/forgot-password', forgotPasswordValidation, validate, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset token has been generated' });
    }

    await PasswordReset.deleteMany({ userId: user._id });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);
    await PasswordReset.create({ userId: user._id, token: hashedToken });

    res.json({ message: 'If an account with that email exists, a reset token has been generated' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to process reset request' });
  }
});

router.post('/reset-password', resetPasswordValidation, validate, async (req: Request, res: Response) => {
  try {
    const { token, userId, newPassword } = req.body;
    const resetRecord = await PasswordReset.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    if (resetRecord.expiresAt && new Date() > resetRecord.expiresAt) {
      await PasswordReset.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
      return res.status(400).json({ message: 'Reset token has expired' });
    }
    const isMatch = await bcrypt.compare(token, resetRecord.token);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    await PasswordReset.deleteMany({ userId: user._id });
    await RefreshToken.deleteMany({ userId: user._id });

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) return res.status(401).json({ message: 'Invalid refresh token' });
    if (storedToken.expiresAt && new Date() > storedToken.expiresAt) {
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { id: string };
    const { token: newToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);

    await RefreshToken.deleteOne({ token: refreshToken });
    await RefreshToken.create({ userId: decoded.id, token: newRefreshToken });

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try { await RefreshToken.deleteOne({ token: refreshToken }); } catch {}
  }
  res.json({ message: 'Logged out' });
});

export default router;