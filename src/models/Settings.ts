import { Schema, model, Document, Types } from 'mongoose';

export interface IServiceSettings extends Document {
  _id: Types.ObjectId;
  enabledServices: { crop: boolean; vehicle: boolean; trailer: boolean; loan: boolean };
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IServiceSettings>(
  {
    // Which application types customers are allowed to create.
    enabledServices: {
      crop: { type: Boolean, default: true },
      vehicle: { type: Boolean, default: true },
      trailer: { type: Boolean, default: true },
      loan: { type: Boolean, default: true },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const ServiceSettings = model<IServiceSettings>('ServiceSettings', schema);
