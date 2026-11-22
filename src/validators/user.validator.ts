import { z } from 'zod';
import { USER_ROLES, APPROVAL_STATUSES } from '../models/User';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
  .regex(/\d/, 'Password must contain at least one number.');

export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2, "Please enter the user's name."),
  email: z.string().trim().email('Enter a valid email address.'),
  password,
  role: z.enum(USER_ROLES, { message: 'Please select a role.' }),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter the user's name.").optional(),
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.role !== undefined || v.isActive !== undefined, {
    message: 'Provide at least one field to update.',
  });

export const resetPasswordSchema = z.object({ password });

export const listUsersSchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(USER_ROLES).optional(),
  approvalStatus: z.enum(APPROVAL_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const approveUserSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
});
