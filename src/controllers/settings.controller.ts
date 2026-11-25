import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as settingsService from '../services/settings.service';

export const get = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await settingsService.getServiceSettings() });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const enabled = (req.body?.enabledServices ?? {}) as Record<string, boolean>;
  res.json({ success: true, data: await settingsService.updateServiceSettings(enabled, req.user!.id) });
});
