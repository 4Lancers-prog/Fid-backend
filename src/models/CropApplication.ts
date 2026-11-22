import { Schema, model, Document } from 'mongoose';
import { commonApplicationFields, CommonApplicationDoc } from './common';

export const SEASONS = ['kharif', 'rabi', 'summer'] as const;
export type Season = (typeof SEASONS)[number];

export interface ICropApplication extends Document, CommonApplicationDoc {
  farmerName: string;
  mobile: string;
  village?: string;
  taluk?: string;
  district?: string;
  cropName: string;
  landArea?: string;
  surveyNumber?: string;
  season: Season;
  additionalDetails?: string;
}

const schema = new Schema<ICropApplication>(
  {
    farmerName: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    village: { type: String, trim: true },
    taluk: { type: String, trim: true },
    district: { type: String, trim: true },
    cropName: { type: String, required: true, trim: true },
    landArea: { type: String, trim: true },
    surveyNumber: { type: String, trim: true },
    season: { type: String, enum: SEASONS, required: true },
    additionalDetails: { type: String, trim: true },
    ...commonApplicationFields,
  },
  { timestamps: true },
);

export const CropApplication = model<ICropApplication>('CropApplication', schema);
