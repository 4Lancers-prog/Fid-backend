import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getReports } from '../services/reports.service';

export const reports = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await getReports() });
});
