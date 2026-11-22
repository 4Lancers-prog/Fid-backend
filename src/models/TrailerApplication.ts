import { Schema, model, Document } from 'mongoose';
import { commonApplicationFields, CommonApplicationDoc } from './common';

export const CERTIFICATE_TYPES = ['new_registration', 'rc', 'renewal', 'duplicate', 'other'] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export interface ITrailerApplication extends Document, CommonApplicationDoc {
  applicantName: string;
  mobile: string;
  trailerRegistrationNumber?: string;
  trailerType?: string;
  chassisNumber?: string;
  certificateType: CertificateType;
  address?: string;
  additionalDetails?: string;
}

const schema = new Schema<ITrailerApplication>(
  {
    applicantName: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    trailerRegistrationNumber: { type: String, trim: true, uppercase: true, index: true },
    trailerType: { type: String, trim: true },
    chassisNumber: { type: String, trim: true },
    certificateType: { type: String, enum: CERTIFICATE_TYPES, required: true },
    address: { type: String, trim: true },
    additionalDetails: { type: String, trim: true },
    ...commonApplicationFields,
  },
  { timestamps: true },
);

export const TrailerApplication = model<ITrailerApplication>('TrailerApplication', schema);
