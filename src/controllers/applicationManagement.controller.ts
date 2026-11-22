import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { APPLICATION_STATUSES, ApplicationStatus } from '../constants/status';
import * as svc from '../services/applicationManagement.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { serviceType, status, search } = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));
  res.json({ success: true, data: await svc.listApplications({ serviceType, status, search, page, limit }) });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { serviceType, id } = req.params;
  const { status, remarks } = req.body as { status?: string; remarks?: string };
  if (!status || !APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
    throw AppError.badRequest('Please provide a valid status.', 'INVALID_STATUS', [{ field: 'status', message: 'Select a valid status.' }]);
  }
  const result = await svc.updateApplicationStatus(serviceType, id, status as ApplicationStatus, remarks, req.user!.id);
  res.json({ success: true, data: result });
});
