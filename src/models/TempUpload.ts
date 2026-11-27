import { Schema, model, Document, Types } from 'mongoose';

// Temporary uploads for the QR "upload & print" flow. NOT part of the permanent
// document library. Auto-removed after 2 hours (TTL) and can be cleared on demand.
export interface ITempUpload extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  fileName: string;
  data: string;
  category?: string;
  createdAt: Date;
}

const schema = new Schema<ITempUpload>(
  {
    sessionId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    data: { type: String, required: true },
    category: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 60 * 60 });

export const TempUpload = model<ITempUpload>('TempUpload', schema);
