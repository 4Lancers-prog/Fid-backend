import { z } from 'zod';
import { GENDERS } from '../models/Farmer';

const aadhaar = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v.length === 12, 'Enter a valid 12-digit Aadhaar number.');

const mobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createFarmerSchema = z.object({
  name: z.string().trim().min(2, "Please enter the farmer's name."),
  gender: z.enum(GENDERS, { message: 'Please select a gender.' }),
  aadhaarNumber: aadhaar,
  fid: z.string().trim().min(3, 'Please enter a valid FID number.'),
  mobile,
  address: z.string().trim().optional(),
  village: z.string().trim().optional(),
  taluk: z.string().trim().optional(),
  district: z.string().trim().optional(),
  photo: z.string().optional(),
});

export const updateFarmerSchema = createFarmerSchema.partial().omit({ aadhaarNumber: true });

export const listFarmersSchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateFarmerInput = z.infer<typeof createFarmerSchema>;
export type UpdateFarmerInput = z.infer<typeof updateFarmerSchema>;

export const lookupAadhaarSchema = z.object({
  aadhaar: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 12, 'Enter a valid 12-digit Aadhaar number.'),
});
