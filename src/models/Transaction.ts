import { Schema, model, Document, Types } from 'mongoose';

export const TXN_TYPES = ['credit', 'debit', 'adjustment'] as const;
export type TxnType = (typeof TXN_TYPES)[number];

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  wallet: Types.ObjectId;
  user: Types.ObjectId;
  type: TxnType;
  /** Signed amount in paise. Credits positive, debits negative. */
  amount: number;
  /** Wallet balance (paise) immediately after this transaction. */
  balanceAfter: number;
  reference?: string;
  reason: string;
  /** Idempotency key to prevent duplicate credits/debits for the same event. */
  idempotencyKey?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    wallet: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: TXN_TYPES, required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reference: { type: String, trim: true },
    reason: { type: String, required: true, trim: true },
    idempotencyKey: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Enforce idempotency where a key is supplied (sparse so nulls are allowed).
transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
