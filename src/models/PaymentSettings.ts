import { Schema, model, Document, Types } from 'mongoose';

/** Singleton admin-managed payment configuration (QR + UPI details). */
export interface IPaymentSettings extends Document {
  _id: Types.ObjectId;
  qrImage?: string;
  upiId?: string;
  businessName?: string;
  instructions?: string;
  registrationFeePaise?: number;
  active: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPaymentSettings>(
  {
    qrImage: { type: String },
    upiId: { type: String, trim: true },
    businessName: { type: String, trim: true },
    instructions: { type: String, trim: true },
    registrationFeePaise: { type: Number },
    active: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const PaymentSettings = model<IPaymentSettings>('PaymentSettings', schema);
