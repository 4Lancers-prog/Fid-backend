import mongoose, { ClientSession } from 'mongoose';
import { logger } from './logger';

/**
 * Multi-document atomicity helper. MongoDB transactions require a replica set or
 * mongos; on a standalone server they are unavailable. We detect support once at
 * startup and, when it's absent, run the callback WITHOUT a session — which is
 * exactly the previously-verified behavior. When support is present, the callback
 * runs inside a transaction so grouped writes commit or roll back together.
 */
let supported = false;

export function setTransactionsSupported(value: boolean): void {
  supported = value;
}
export function transactionsSupported(): boolean {
  return supported;
}

/** Probes the connected server and records whether transactions are available. */
export async function detectTransactionSupport(): Promise<void> {
  try {
    const admin = mongoose.connection.db?.admin();
    const hello = admin ? await admin.command({ hello: 1 }) : undefined;
    supported = !!(hello && (hello.setName || hello.msg === 'isdbgrid'));
    logger.info(`MongoDB transactions ${supported ? 'enabled (replica set / mongos)' : 'unavailable (standalone) — using atomic document guards'}`);
  } catch {
    supported = false;
  }
}

export async function withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
  if (!supported) {
    return fn(undefined);
  }
  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}
