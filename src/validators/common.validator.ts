import { z } from 'zod';

/** Shared list/query schema for application modules. */
export const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const mobileField = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.');

export const optionalMobileField = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit mobile number.');
