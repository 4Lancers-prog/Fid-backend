import { z } from 'zod';
import { SEASONS } from '../models/CropApplication';
import { mobileField } from './common.validator';

export const createCropSchema = z.object({
  farmerName: z.string().trim().min(2, "Please enter the farmer's name."),
  mobile: mobileField,
  village: z.string().trim().optional(),
  taluk: z.string().trim().optional(),
  district: z.string().trim().optional(),
  cropName: z.string().trim().min(2, 'Please enter the crop name.'),
  landArea: z.string().trim().optional(),
  surveyNumber: z.string().trim().optional(),
  season: z.enum(SEASONS, { message: 'Please select a season.' }),
  additionalDetails: z.string().trim().optional(),
  farmer: z.string().trim().optional(),
  documents: z.array(z.string()).optional(),
});
export const updateCropSchema = createCropSchema.partial();
