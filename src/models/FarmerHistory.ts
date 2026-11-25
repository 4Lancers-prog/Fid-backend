import { Schema, model, Document, Types } from 'mongoose';

export interface IFarmerChange {
  field: string;
  from?: string;
  to?: string;
}

/** Immutable record of an edit to a farmer profile (field-level diff). */
export interface IFarmerHistory extends Document {
  _id: Types.ObjectId;
  farmer: Types.ObjectId;
  changedBy?: Types.ObjectId;
  changedByName?: string;
  action: 'create' | 'update';
  changes: IFarmerChange[];
  createdAt: Date;
}

const schema = new Schema<IFarmerHistory>(
  {
    farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', required: true, index: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedByName: { type: String },
    action: { type: String, enum: ['create', 'update'], required: true },
    changes: [{ field: String, from: String, to: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// History is retained for 24 hours only (auto-deleted by MongoDB TTL).
schema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const FarmerHistory = model<IFarmerHistory>('FarmerHistory', schema);
