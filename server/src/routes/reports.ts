import express, { Response } from 'express';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Report from '../models/Report';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import { reportValidation } from '../middleware/validation';

const router = express.Router();

router.post('/', authMiddleware, reportValidation, async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { targetId, targetType, reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ message: 'Invalid target ID' });
    }

    const existing = await Report.findOne({
      reporter: new mongoose.Types.ObjectId(req.user!.id),
      targetId: new mongoose.Types.ObjectId(targetId),
      targetType,
    });
    if (existing) return res.status(400).json({ message: 'Already reported' });

    await Report.create({
      reporter: new mongoose.Types.ObjectId(req.user!.id),
      targetId: new mongoose.Types.ObjectId(targetId),
      targetType,
      reason,
    });
    res.json({ message: 'Report submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;