import { z } from 'zod';

export const createFidSchema = z.object({
  farmerId: z.string().trim().min(1, 'A farmer must be selected.'),
  /** Optional data URL photo override for the card. */
  photo: z.string().optional(),
});

export const listFidSchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFidInput = z.infer<typeof createFidSchema>;
