import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import * as walletService from '../services/wallet.service';
import { audit } from '../utils/audit';

export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  const { balance } = await walletService.getWalletSummary(req.user!.id);
  res.json({ success: true, data: { balancePaise: balance, balanceRupees: balance / 100 } });
});

export const transactions = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) ?? '1', 10);
  const limit = parseInt((req.query.limit as string) ?? '20', 10);
  const result = await walletService.listTransactions(req.user!.id, page, limit);
  res.json({ success: true, data: result });
});

/** Admin-only manual credit/debit adjustment with a mandatory reason. */
export const adminAdjustment = asyncHandler(async (req: Request, res: Response) => {
  const { userId, amountRupees, type, reason } = req.body as {
    userId?: string;
    amountRupees?: number;
    type?: 'credit' | 'debit';
    reason?: string;
  };
  if (!userId || !amountRupees || amountRupees <= 0 || !reason || !type) {
    throw AppError.badRequest('Provide userId, a positive amount, a type (credit/debit) and a reason.', 'INVALID_ADJUSTMENT');
  }
  const amountPaise = Math.round(amountRupees * 100);
  const txn =
    type === 'credit'
      ? await walletService.credit(userId, amountPaise, { reason, createdBy: req.user!.id })
      : await walletService.debit(userId, amountPaise, { reason });
  await audit({ actorId: req.user!.id, actorName: req.user!.name, action: 'wallet.adjustment', targetType: 'User', targetId: userId, meta: { type, amountPaise, reason } });
  res.status(201).json({ success: true, data: txn });
});
