/**
 * Standalone seed command (`npm run seed`). Connects, ensures the admin exists,
 * then disconnects. Kept separate from seed.ts so importing ensureSeedAdmin never
 * triggers the CLI — works the same under any runner (tsx, node, ts-node).
 */
import { connectDatabase, disconnectDatabase } from '../config/db';
import { ensureSeedAdmin } from './seed';
import { logger } from './logger';

async function run(): Promise<void> {
  await connectDatabase();
  await ensureSeedAdmin();
  await disconnectDatabase();
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
