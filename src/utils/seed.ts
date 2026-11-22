import { User, hashPassword } from '../models/User';
import { getOrCreateWallet } from '../services/wallet.service';
import { env } from '../config/env';
import { logger } from './logger';

/** Idempotently creates the seed Super Admin. Safe to call on every startup. */
export async function ensureSeedAdmin(): Promise<void> {
  const existing = await User.findOne({ email: env.seed.email });
  if (existing) {
    logger.info(`Super Admin already exists: ${env.seed.email}`);
    return;
  }
  const passwordHash = await hashPassword(env.seed.password);
  const admin = await User.create({
    name: env.seed.name,
    email: env.seed.email,
    passwordHash,
    role: 'super_admin',
  });
  await getOrCreateWallet(admin.id);
  logger.info(`Seeded Super Admin: ${env.seed.email} / ${env.seed.password}`);
  logger.warn('Change the seeded password immediately after first login.');
}
