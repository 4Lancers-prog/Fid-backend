import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { APPLICATION_STATUSES, ApplicationStatus } from '../constants/status';
import type { CrudService } from '../services/crudFactory';
import { getServiceSettings } from '../services/settings.service';
import { notify, notifyAdmins } from '../services/notification.service';

/** Produces thin Express handlers bound to a CRUD service. */
export function makeCrudController(service: CrudService, serviceType?: string) {
  const create = asyncHandler(async (req: Request, res: Response) => {
    // Customers may only create application types an admin has enabled.
    if (serviceType && req.user!.role === 'customer') {
      const { enabledServices } = await getServiceSettings();
      if (!enabledServices[serviceType]) {
        throw AppError.forbidden('This service is not currently available for new applications.', 'SERVICE_DISABLED');
      }
    }
    const doc = await service.create(req.body, req.user!.id);
    if (serviceType) {
      const labels: Record<string, string> = { crop: 'Crop insurance', vehicle: 'Vehicle insurance', trailer: 'Usha tailoring certificate', loan: 'Loan' };
      const label = labels[serviceType] ?? serviceType;
      if (req.user!.role === 'customer') {
        await notify({ userId: req.user!.id, type: 'application_created', title: 'Application received', message: `Your ${label} application has been submitted and is awaiting review.` });
        await notifyAdmins({ type: 'application_new', title: 'New application', message: `${req.user!.name} submitted a new ${label} application to review.` });
      }
    }
    res.status(201).json({ success: true, data: doc });
  });

  const list = asyncHandler(async (req: Request, res: Response) => {
    const { search, status, page, limit } = req.query as unknown as {
      search?: string;
      status?: string;
      page: number;
      limit: number;
    };
    // Customers only see their own applications.
    const restrictToUserId = req.user!.role === 'customer' ? req.user!.id : undefined;
    const result = await service.list({ search, status, page, limit, restrictToUserId });
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
    if (serviceType) {
      const labels: Record<string, string> = { crop: 'Crop insurance', vehicle: 'Vehicle insurance', trailer: 'Usha tailoring certificate', loan: 'Loan' };
      const createdBy = (doc as { createdBy?: { toString(): string } }).createdBy?.toString?.();
      if (createdBy && createdBy !== req.user!.id) {
        await notify({
          userId: createdBy,
          type: 'application_status',
          title: 'Application updated',
          message: `Your ${labels[serviceType] ?? serviceType} application is now "${status.replace('_', ' ')}".`,
        });
      }
    }
    res.json({ success: true, data: doc });
  });

  return { create, list, getOne, update, updateStatus };
}
