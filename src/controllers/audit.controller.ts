import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AuditLog } from '../models/AuditLog';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));
  const filter: Record<string, unknown> = {};
  if (req.query.action) filter.action = req.query.action;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('actor', 'name email'),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, total, page, limit } });
});
