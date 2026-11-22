import { AuditLog } from '../models/AuditLog';
import { logger } from './logger';

interface AuditInput {
  actorId?: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Writes an audit entry. Never throws into the caller: an audit failure must not
 * break the underlying operation, but is logged for investigation.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      actor: input.actorId,
      actorName: input.actorName,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      meta: input.meta,
    });
  } catch (err) {
    logger.error('Failed to write audit log', err);
  }
}
