import { Schema, model, Document, Types } from 'mongoose';

/**
 * An uploaded document (scan/photo/PDF). File bytes are stored as a validated
 * base64 data URL to keep the module self-contained; production deployments
 * should stream to object storage and keep only metadata + a reference here.
 */
export interface IDocumentFile extends Document {
  _id: Types.ObjectId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category?: string;
  farmer?: Types.ObjectId;
  data: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDocumentFile>(
  {
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    category: { type: String, trim: true },
    farmer: { type: Schema.Types.ObjectId, ref: 'Farmer', index: true },
    data: { type: String, required: true, select: false }, // excluded from list queries
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

export const DocumentFile = model<IDocumentFile>('DocumentFile', schema);
