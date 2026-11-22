import { Schema, model, Document, Types } from 'mongoose';

export const PAYMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * A manual (admin-verified) wallet recharge request. The wallet is NEVER
 * credited automatically on submission — only on explicit admin approval.
 */
export interface IManualPayment extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  amount: number; // paise
  utr: string;
  proof?: string;
  status: PaymentStatus;
  remarks?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  creditTransaction?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IManualPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    utr: { type: String, required: true, trim: true },
    proof: { type: String },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    remarks: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    creditTransaction: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true },
);

// A UTR may be submitted only once across the system.
schema.index({ utr: 1 }, { unique: true });

export const ManualPayment = model<IManualPayment>('ManualPayment', schema);
