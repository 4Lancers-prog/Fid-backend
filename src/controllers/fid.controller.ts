import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as fidService from '../services/fid.service';

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const record = await fidService.generateFid(req.body.farmerId, req.user!.id, req.body.photo);
  res.status(201).json({ success: true, data: record });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { search, page, limit } = req.query as unknown as { search?: string; page: number; limit: number };
  const result = await fidService.listFid({ search, page, limit });
  res.json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const record = await fidService.getFid(req.params.id);
  res.json({ success: true, data: record });
});

export const fee = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: { feePaise: fidService.FID_CARD_FEE_PAISE, feeRupees: fidService.FID_CARD_FEE_PAISE / 100 } });
});
