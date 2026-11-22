import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as farmerService from '../services/farmer.service';

const actor = (req: Request) => ({ id: req.user!.id, name: req.user!.name });

export const create = asyncHandler(async (req: Request, res: Response) => {
  const farmer = await farmerService.createFarmer(req.body, actor(req));
  res.status(201).json({ success: true, data: farmer });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { search, page, limit } = req.query as unknown as { search?: string; page: number; limit: number };
  res.json({ success: true, data: await farmerService.listFarmers({ search, page, limit }) });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await farmerService.getFarmer(req.params.id) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await farmerService.updateFarmer(req.params.id, req.body, actor(req)) });
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await farmerService.getFarmerHistory(req.params.id) });
});

export const lookup = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await farmerService.lookupByAadhaar(req.body.aadhaar) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await farmerService.deleteFarmer(req.params.id) });
});
