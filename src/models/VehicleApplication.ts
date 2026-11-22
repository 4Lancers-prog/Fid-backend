import { Schema, model, Document } from 'mongoose';
import { commonApplicationFields, CommonApplicationDoc } from './common';

export const INSURANCE_TYPES = ['third_party', 'comprehensive', 'own_damage', 'renewal'] as const;
export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export interface IVehicleApplication extends Document, CommonApplicationDoc {
  ownerName: string;
  mobile: string;
  vehicleType: string;
  registrationNumber: string;
  insuranceType: InsuranceType;
  policyExpiryDate?: Date;
  vehicleMakeModel?: string;
  manufacturingYear?: number;
}

const schema = new Schema<IVehicleApplication>(
  {
    ownerName: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    vehicleType: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
    insuranceType: { type: String, enum: INSURANCE_TYPES, required: true },
    policyExpiryDate: { type: Date },
    vehicleMakeModel: { type: String, trim: true },
    manufacturingYear: { type: Number, min: 1950, max: 2100 },
    ...commonApplicationFields,
  },
  { timestamps: true },
);

export const VehicleApplication = model<IVehicleApplication>('VehicleApplication', schema);
