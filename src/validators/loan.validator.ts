import { z } from 'zod';
import { LOAN_TYPES } from '../models/LoanLead';
import { mobileField } from './common.validator';

const panField = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), 'Enter a PAN in the correct format, for example ABCDE1234F.')
  .optional()
  .or(z.literal('').transform(() => undefined));

const aadhaarField = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v === '' || v.length === 12, 'Enter a valid 12-digit Aadhaar number.')
  .transform((v) => (v === '' ? undefined : v))
  .optional();

export const createLoanSchema = z.object({
  applicantName: z.string().trim().min(2, "Please enter the applicant's name."),
  mobile: mobileField,
  pan: panField,
  aadhaar: aadhaarField,
  loanType: z.enum(LOAN_TYPES, { message: 'Please select a loan type.' }),
  loanAmount: z.coerce.number({ message: 'Enter a valid loan amount.' }).positive('Enter an amount greater than zero.'),
  farmer: z.string().trim().optional(),
  documents: z.array(z.string()).optional(),
});
// PAN/Aadhaar are immutable after creation here; omit them from updates.
export const updateLoanSchema = createLoanSchema.partial().omit({ pan: true, aadhaar: true });
