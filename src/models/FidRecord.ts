import { Schema, model, Document, Types } from 'mongoose';
import { Gender } from './Farmer';

/**
 * A generated FID card record. Stores a snapshot so re-printing reflects the
 * state at generation time, plus a reference to the master farmer profile.
 */
export interface IFidRecord extends Document {
  _id: Types.ObjectId;
  farmer: Types.ObjectId;
  name: string;
  gender: Gender;
  aadhaarLast4: string;
  fid: string;
  address?: string;
  photo?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fidRecordSchema = new Schema<IFidRecord>(
  {
    farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    gender: { type: String, required: true },
    aadhaarLast4: { type: String, required: true },
    fid: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true },
    photo: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const FidRecord = model<IFidRecord>('FidRecord', fidRecordSchema);
