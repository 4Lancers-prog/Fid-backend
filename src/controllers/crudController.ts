import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { APPLICATION_STATUSES, ApplicationStatus } from '../constants/status';
import type { CrudService } from '../services/crudFactory';

/** Produces thin Express handlers bound to a CRUD service. */
export function makeCrudController(service: CrudService) {
  const create = asyncHandler(async (req: Request, res: Response) => {
    const doc = await service.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: doc });
  });

  const list = asyncHandler(async (req: Request, res: Response) => {
    const { search, status, page, limit } = req.query as unknown as {
      search?: string;
      status?: string;
      page: number;
      limit: number;
    };
    const result = await service.list({ search, status, page, limit });
    res.json({ success: true, data: result });
  });

  const getOne = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await service.getOne(req.params.id) });
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await service.update(req.params.id, req.body, req.user!.id) });
  });

  const updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status, remarks } = req.body as { status?: string; remarks?: string };
    if (!status || !APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
      throw AppError.badRequest('Please provide a valid status.', 'INVALID_STATUS', [
        { field: 'status', message: 'Select a valid status.' },
      ]);
    }
    const doc = await service.updateStatus(req.params.id, status as ApplicationStatus, remarks, req.user!.id);
    res.json({ success: true, data: doc });
  });

  return { create, list, getOne, update, updateStatus };
}
