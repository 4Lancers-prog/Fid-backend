import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as svc from '../services/notification.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));
  res.json({ success: true, data: await svc.listForUser(req.user!.id, page, limit) });
});

export const read = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.markRead(req.params.id, req.user!.id) });
});

export const readAll = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.markAllRead(req.user!.id) });
});
