import { z } from 'zod';
import { INSURANCE_TYPES } from '../models/VehicleApplication';
import { mobileField } from './common.validator';

export const createVehicleSchema = z.object({
  ownerName: z.string().trim().min(2, "Please enter the owner's name."),
  mobile: mobileField,
  vehicleType: z.string().trim().min(2, 'Please enter the vehicle type.'),
  registrationNumber: z.string().trim().min(4, 'Please enter a valid registration number.'),
  insuranceType: z.enum(INSURANCE_TYPES, { message: 'Please select an insurance type.' }),
  policyExpiryDate: z.coerce.date().optional(),
  vehicleMakeModel: z.string().trim().optional(),
  manufacturingYear: z.coerce.number().int().min(1950).max(2100).optional(),
  farmer: z.string().trim().optional(),
  documents: z.array(z.string()).optional(),
});
export const updateVehicleSchema = createVehicleSchema.partial();
