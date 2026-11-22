import { z } from 'zod';
import { USER_ROLES } from '../models/User';

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter the user's name."),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/\d/, 'Password must contain at least one number.'),
  role: z.enum(USER_ROLES).optional(),
});

export const publicRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/\d/, 'Password must contain at least one number.'),
  // Registration-fee payment captured on the last signup step (after scanning the admin QR).
  paymentUtr: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,32}$/, 'Enter the payment reference / UTR (6–32 letters or digits).')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  paymentAmountRupees: z.coerce.number().positive('Enter the amount you paid.').max(1000000).optional(),
  paymentProof: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
