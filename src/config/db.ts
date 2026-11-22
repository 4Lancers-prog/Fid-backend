import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';
import { detectTransactionSupport } from '../utils/transaction';

// Holds the in-memory server instance (dev convenience) so it can be stopped cleanly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let memoryServer: any = null;

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  let uri = env.mongoUri;

  if (env.useMemoryDb) {
    // Zero-install local mode: spin up an in-memory MongoDB. No Docker, no separate
    // database needed. Data is NOT persisted between restarts. First run downloads a
    // small mongod binary (needs internet once); subsequent runs work offline.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    logger.warn('USE_MEMORY_DB is on — running an in-memory MongoDB. Data will NOT persist between restarts.');
  }

  try {
    await mongoose.connect(uri);
    logger.info(`MongoDB connected${env.useMemoryDb ? ' (in-memory)' : ''}`);
    await detectTransactionSupport();
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    if (!env.useMemoryDb) {
      logger.error(
        'Tip: no database reachable. For a quick start without installing MongoDB or Docker, set USE_MEMORY_DB=true in backend/.env',
      );
    }
    throw error;
  }

  mongoose.connection.on('error', (err) => logger.error('MongoDB runtime error', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
