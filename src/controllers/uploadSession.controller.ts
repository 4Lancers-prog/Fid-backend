import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as svc from '../services/uploadSession.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: svc.createSession(req.user!.id) });
});

export const info = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.sessionInfo(req.params.token) });
});

export const upload = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: await svc.uploadViaToken(req.params.token, req.body) });
});
