import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(400, errors.array()[0].msg));
  }
  next();
};

export const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
];

export const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('New password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('New password must contain a number'),
];

export const deleteAccountValidation = [
  body('password').notEmpty().withMessage('Password is required to delete account'),
];

export const createPostValidation = [
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters'),
  body('title').optional().trim().isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
];

export const updatePostValidation = [
  body('content').optional().trim().isLength({ min: 1, max: 5000 }).withMessage('Content must be 1-5000 characters'),
  body('title').optional().trim().isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
];

export const commentValidation = [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters'),
  body('parentCommentId').optional().isMongoId().withMessage('Invalid parent comment ID'),
];

export const replyValidation = [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Reply must be 1-1000 characters'),
  body('parentCommentId').isMongoId().withMessage('Parent comment ID is required'),
];

export const messageValidation = [
  body('content').optional().trim().isLength({ max: 2000 }).withMessage('Message must be at most 2000 characters'),
];

export const stickerMessageValidation = [
  body('stickerId').notEmpty().withMessage('Sticker ID is required'),
  body('messageType').equals('sticker').withMessage('Message type must be sticker'),
];

export const voiceMessageValidation = [
  body('messageType').equals('voice').withMessage('Message type must be voice'),
];

export const fileMessageValidation = [
  body('messageType').equals('file').withMessage('Message type must be file'),
];

export const updateProfileValidation = [
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be at most 500 characters'),
  body('avatar')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      // Allow uploaded relative paths (from POST /profile/avatar)
      if (value.startsWith('/uploads/')) return true;
      // Allow full URLs (legacy manual entry)
      if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return true;
      throw new Error('Avatar must be a valid URL or an uploaded file path');
    })
    .withMessage('Avatar must be a valid URL or an uploaded file path'),
];

export const followValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
];

export const searchValidation = [
  param('query').trim().isLength({ min: 1 }).withMessage('Search query is required'),
];

export const storyValidation = [
  body('content').optional().trim().isLength({ max: 500 }).withMessage('Story content must be at most 500 characters'),
];

export const reportValidation = [
  body('targetId').isMongoId().withMessage('Invalid target ID'),
  body('targetType').isIn(['post', 'comment', 'user', 'story']).withMessage('Invalid target type'),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
];