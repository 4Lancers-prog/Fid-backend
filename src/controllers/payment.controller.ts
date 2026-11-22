import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as paymentService from '../services/payment.service';

// ---- Settings ----
export const getActiveQr = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await paymentService.getActiveSettings() });
});

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await paymentService.getSettings() });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await paymentService.upsertSettings(req.body, req.user!.id);
  res.json({ success: true, data: settings });
});

// ---- Manual payments ----
export const create = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.createManualPayment(req.user!.id, req.body);
  res.status(201).json({ success: true, data: payment });
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) ?? '1', 10);
  const limit = parseInt((req.query.limit as string) ?? '20', 10);
  res.json({ success: true, data: await paymentService.listMyPayments(req.user!.id, page, limit) });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { status, page, limit } = req.query as unknown as { status?: 'pending' | 'approved' | 'rejected'; page: number; limit: number };
  res.json({ success: true, data: await paymentService.listPayments({ status, page, limit }) });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.approvePayment(req.params.id, req.user!.id, req.body?.remarks);
  res.json({ success: true, data: payment });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.rejectPayment(req.params.id, req.user!.id, req.body.reason);
  res.json({ success: true, data: payment });
});
