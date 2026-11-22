import { Schema, model, Document, Types } from 'mongoose';

export interface IWallet extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** Balance in paise/smallest unit stored as a whole number to avoid float drift. */
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    // Stored in paise (integer). ₹1 = 100. Prevents floating-point rounding bugs.
    balance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export const Wallet = model<IWallet>('Wallet', walletSchema);
