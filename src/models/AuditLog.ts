import { Schema, model, Document, Types } from 'mongoose';

/** Immutable record of a sensitive action, for accountability and review. */
export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actor?: Types.ObjectId;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorName: { type: String },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = model<IAuditLog>('AuditLog', schema);
