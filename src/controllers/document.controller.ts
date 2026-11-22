import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as documentService from '../services/document.service';

const actor = (req: Request) => ({ id: req.user!.id, role: req.user!.role, name: req.user!.name });

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: await documentService.createDocument(req.body, actor(req)) });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { farmer, page, limit } = req.query as unknown as { farmer?: string; page: number; limit: number };
  res.json({ success: true, data: await documentService.listDocuments(actor(req), { farmer, page, limit }) });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await documentService.getDocument(req.params.id, actor(req)) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await documentService.deleteDocument(req.params.id, actor(req)) });
});
