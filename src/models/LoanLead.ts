import { Schema, model, Document } from 'mongoose';
import { commonApplicationFields, CommonApplicationDoc } from './common';

export const LOAN_TYPES = ['home', 'bike', 'vehicle', 'mortgage', 'other'] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

/**
 * Loan lead. PAN and Aadhaar are sensitive: they are stored AES-encrypted and
 * only ever surfaced masked. Last-4 fragments are kept for display/search.
 */
export interface ILoanLead extends Document, CommonApplicationDoc {
  applicantName: string;
  mobile: string;
  panEnc?: string;
  panLast4?: string;
  aadhaarEnc?: string;
  aadhaarLast4?: string;
  loanType: LoanType;
  loanAmount: number;
}

const schema = new Schema<ILoanLead>(
  {
    applicantName: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, trim: true, index: true },
    panEnc: { type: String, select: false },
    panLast4: { type: String },
    aadhaarEnc: { type: String, select: false },
    aadhaarLast4: { type: String },
    loanType: { type: String, enum: LOAN_TYPES, required: true },
    loanAmount: { type: Number, required: true, min: 1 },
    ...commonApplicationFields,
  },
  { timestamps: true },
);

schema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.panEnc;
    delete ret.aadhaarEnc;
    delete ret.__v;
    return ret;
  },
});

export const LoanLead = model<ILoanLead>('LoanLead', schema);
