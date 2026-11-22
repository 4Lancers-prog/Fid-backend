import { z } from 'zod';
import { CERTIFICATE_TYPES } from '../models/TrailerApplication';
import { mobileField } from './common.validator';

export const createTrailerSchema = z.object({
  applicantName: z.string().trim().min(2, "Please enter the applicant's name."),
  mobile: mobileField,
  trailerRegistrationNumber: z.string().trim().optional(),
  trailerType: z.string().trim().optional(),
  chassisNumber: z.string().trim().optional(),
  certificateType: z.enum(CERTIFICATE_TYPES, { message: 'Please select a certificate type.' }),
  address: z.string().trim().optional(),
  additionalDetails: z.string().trim().optional(),
  farmer: z.string().trim().optional(),
});
export const updateTrailerSchema = createTrailerSchema.partial();
