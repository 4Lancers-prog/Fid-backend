import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';
import { ensureSeedAdmin } from './utils/seed';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  // With the in-memory DB (or when AUTO_SEED is on), create the admin so the app
  // is usable immediately without a separate seed step.
  if (env.useMemoryDb || env.autoSeed) {
    await ensureSeedAdmin();
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
