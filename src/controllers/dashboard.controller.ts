import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as dashboardService from '../services/dashboard.service';

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboardStats(req.user!.id);
  res.json({ success: true, data });
});
