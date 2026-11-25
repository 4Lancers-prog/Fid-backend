import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = ['super_admin', 'admin', 'operator', 'loan_executive', 'viewer', 'customer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  mobile?: string;
  registrationPaymentUtr?: string;
  registrationPaymentAmount?: number; // paise
  registrationPaymentProof?: string;  // data URL (hidden from list queries)
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'operator', required: true },
    isActive: { type: Boolean, default: true },
    // Admin-created and seeded users are approved by default; public self-registrations
    // start as 'pending' and cannot sign in until an admin approves them.
    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: 'approved', index: true },
    mobile: { type: String, trim: true },
    registrationPaymentUtr: { type: String, trim: true },
    registrationPaymentAmount: { type: Number },
    registrationPaymentProof: { type: String, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.set('toJSON', {
  virtuals: true, // exposes the `id` virtual
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id?.toString?.() ?? ret.id;
    delete ret._id;
    delete ret.passwordHash;
    delete ret.tokenVersion;
    delete ret.__v;
    return ret;
  },
});

userSchema.index({ registrationPaymentUtr: 1 }, { unique: true, sparse: true });

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

export const User = model<IUser>('User', userSchema);
