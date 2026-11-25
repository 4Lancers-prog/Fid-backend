import { Schema, Types } from 'mongoose';
import { APPLICATION_STATUSES } from '../constants/status';

/** Fields shared by every service-application model. Spread into each schema. */
export const commonApplicationFields = {
  status: { type: String, enum: APPLICATION_STATUSES, default: 'new', index: true },
  remarks: { type: String, trim: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  farmer: { type: Schema.Types.ObjectId, ref: 'Farmer' },
  documents: [{ type: Schema.Types.ObjectId, ref: 'DocumentFile' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
};

export interface CommonApplicationDoc {
  _id: Types.ObjectId;
  status: string;
  remarks?: string;
  assignedTo?: Types.ObjectId;
  farmer?: Types.ObjectId;
  documents?: Types.ObjectId[];
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
