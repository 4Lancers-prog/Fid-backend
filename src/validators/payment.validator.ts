import { z } from 'zod';

export const updateSettingsSchema = z.object({
  qrImage: z.string().optional(),
  upiId: z.string().trim().max(100).optional(),
  businessName: z.string().trim().max(120).optional(),
  instructions: z.string().trim().max(1000).optional(),
  registrationFeeRupees: z.coerce.number().min(0).max(1000000).optional(),
  active: z.boolean().optional(),
});

export const createManualPaymentSchema = z.object({
  amountRupees: z.coerce
    .number({ message: 'Enter a valid amount.' })
    .positive('Enter an amount greater than zero.')
    .max(1000000, 'Amount exceeds the permitted limit.'),
  utr: z
    .string()
    .trim()
    .min(6, 'Enter a valid UTR / transaction reference (at least 6 characters).')
    .max(40, 'The UTR / transaction reference is too long.'),
  proof: z.string().optional(),
});

export const listPaymentsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const rejectSchema = z.object({
  reason: z.string().trim().min(3, 'Please provide a reason for rejection.'),
});

export type CreateManualPaymentInput = z.infer<typeof createManualPaymentSchema>;
