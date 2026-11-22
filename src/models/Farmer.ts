import { Schema, model, Document, Types } from 'mongoose';

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export interface IFarmer extends Document {
  _id: Types.ObjectId;
  name: string;
  gender: Gender;
  /** AES-256-GCM encrypted full Aadhaar (never returned to clients). */
  aadhaarEnc: string;
  /** Last 4 digits for masked display. */
  aadhaarLast4: string;
  /** Keyed blind index of the full Aadhaar for duplicate detection (unique). */
  aadhaarHash: string;
  fid: string;
  mobile?: string;
  address?: string;
  village?: string;
  taluk?: string;
  district?: string;
  /** Data URL or stored path to the farmer photo. */
  photo?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const farmerSchema = new Schema<IFarmer>(
  {
    name: { type: String, required: true, trim: true, index: true },
    gender: { type: String, enum: GENDERS, required: true },
    aadhaarEnc: { type: String, required: true, select: false },
    aadhaarLast4: { type: String, required: true },
    aadhaarHash: { type: String, required: true, unique: true, index: true },
    fid: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, trim: true, index: true },
    address: { type: String, trim: true },
    village: { type: String, trim: true },
    taluk: { type: String, trim: true },
    district: { type: String, trim: true },
    photo: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Never leak the encrypted Aadhaar through JSON serialisation.
farmerSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.aadhaarEnc;
    delete ret.aadhaarHash;
    delete ret.__v;
    return ret;
  },
});

export const Farmer = model<IFarmer>('Farmer', farmerSchema);
