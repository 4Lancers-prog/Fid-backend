import { z } from 'zod';

export const createDocumentSchema = z.object({
  fileName: z.string().trim().min(1, 'A file name is required.').max(200),
  data: z.string().min(1, 'Please select a file to upload.'),
  category: z.string().trim().max(60).optional(),
  farmer: z.string().trim().optional(),
});

export const listDocumentsSchema = z.object({
  farmer: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
