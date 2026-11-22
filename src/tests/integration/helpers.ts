import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User, hashPassword, UserRole } from '../../models/User';
import { getOrCreateWallet } from '../../services/wallet.service';
import { signAccessToken } from '../../utils/jwt';

let mongo: MongoMemoryServer;

/**
 * Starts an in-memory MongoDB and connects mongoose.
 * NOTE: on first run this downloads a mongod binary from the MongoDB CDN, so it
 * requires network access. It is not runnable in a fully air-gapped sandbox.
 */
export async function startDb(): Promise<void> {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

export async function stopDb(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo.stop();
}

export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

/** Creates a user (with wallet) and returns the doc plus a ready Bearer header. */
export async function createUser(
  role: UserRole = 'operator',
  overrides: Partial<{ name: string; email: string; password: string }> = {},
) {
  const email = overrides.email ?? `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.local`;
  const user = await User.create({
    name: overrides.name ?? `${role} user`,
    email,
    passwordHash: await hashPassword(overrides.password ?? 'Password@123'),
    role,
  });
  await getOrCreateWallet(user.id);
  const token = signAccessToken({ sub: user.id, role: user.role, name: user.name });
  return { user, token, authHeader: `Bearer ${token}` };
}
