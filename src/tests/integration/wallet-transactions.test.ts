import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { detectTransactionSupport, transactionsSupported } from '../../utils/transaction';
import { User, hashPassword } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import * as walletService from '../../services/wallet.service';

/**
 * Verifies the transaction-backed wallet path on a replica set. Requires a
 * downloadable mongod binary, so it runs in CI, not in an air-gapped sandbox.
 */
let replset: MongoMemoryReplSet;

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri());
  await detectTransactionSupport();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

async function makeUser() {
  const u = await User.create({ name: 'Txn User', email: `txn_${Date.now()}@test.local`, passwordHash: await hashPassword('Password@123'), role: 'operator' });
  await walletService.getOrCreateWallet(u.id);
  return u;
}

describe('wallet transactions (replica set)', () => {
  it('detects transaction support on a replica set', () => {
    expect(transactionsSupported()).toBe(true);
  });

  it('credits and debits with a matching ledger entry, never negative', async () => {
    const u = await makeUser();
    await walletService.credit(u.id, 1000, { reason: 'topup' });
    const afterCredit = await walletService.getWalletSummary(u.id);
    expect(afterCredit.balance).toBe(1000);

    await walletService.debit(u.id, 400, { reason: 'fee', idempotencyKey: `d-${u.id}` });
    const afterDebit = await walletService.getWalletSummary(u.id);
    expect(afterDebit.balance).toBe(600);

    // Insufficient funds are refused and leave the balance unchanged.
    await expect(walletService.debit(u.id, 10000, { reason: 'too much' })).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    const unchanged = await walletService.getWalletSummary(u.id);
    expect(unchanged.balance).toBe(600);

    // Every balance change has a ledger row.
    const wallet = await walletService.getOrCreateWallet(u.id);
    const count = await Transaction.countDocuments({ wallet: wallet._id });
    expect(count).toBe(2); // one credit, one debit
  });

  it('is idempotent under a repeated credit key (single ledger row)', async () => {
    const u = await makeUser();
    await walletService.credit(u.id, 500, { reason: 'manual', idempotencyKey: 'k1' });
    await walletService.credit(u.id, 500, { reason: 'manual', idempotencyKey: 'k1' });
    const summary = await walletService.getWalletSummary(u.id);
    expect(summary.balance).toBe(500);
    expect(await Transaction.countDocuments({ idempotencyKey: 'k1' })).toBe(1);
  });
});
