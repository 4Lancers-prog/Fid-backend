import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as userService from '../services/user.service';

const actor = (req: Request) => ({ id: req.user!.id, role: req.user!.role, name: req.user!.name });

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { search, role, approvalStatus, page, limit } = req.query as unknown as { search?: string; role?: never; approvalStatus?: never; page: number; limit: number };
  res.json({ success: true, data: await userService.listUsers({ search, role, approvalStatus, page, limit }) });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await userService.getUser(req.params.id) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: await userService.adminCreateUser(actor(req), req.body) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await userService.updateUser(actor(req), req.params.id, req.body) });
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await userService.approveUser(actor(req), req.params.id, req.body?.role) });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await userService.rejectUser(actor(req), req.params.id) });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await userService.resetUserPassword(actor(req), req.params.id, req.body.password) });
});
