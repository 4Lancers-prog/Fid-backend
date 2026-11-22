import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';
import * as walletService from '../../services/wallet.service';
import { Transaction } from '../../models/Transaction';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const farmerPayload = {
  name: 'Basavaraj Patil',
  gender: 'male',
  aadhaarNumber: '123456789012',
  fid: 'FID9876543210',
};

async function makeFarmer(authHeader: string) {
  const res = await request(app).post('/api/farmers').set('Authorization', authHeader).send(farmerPayload);
  return res.body.data.id as string;
}

describe('FID generation + wallet', () => {
  it('charges the wallet ₹5 and stores an FID record', async () => {
    const { user, authHeader } = await createUser('operator');
    await walletService.credit(user.id, 1000, { reason: 'test topup' }); // ₹10
    const farmerId = await makeFarmer(authHeader);

    const res = await request(app).post('/api/fid').set('Authorization', authHeader).send({ farmerId });
    expect(res.status).toBe(201);
    expect(res.body.data.fid).toBe('FID9876543210');

    const wallet = await walletService.getWalletSummary(user.id);
    expect(wallet.balance).toBe(500); // ₹10 - ₹5
  });

  it('refuses generation on insufficient balance with the PRD message and makes no record', async () => {
    const { user, authHeader } = await createUser('operator');
    await walletService.credit(user.id, 100, { reason: 'test topup' }); // ₹1 only
    const farmerId = await makeFarmer(authHeader);

    const res = await request(app).post('/api/fid').set('Authorization', authHeader).send({ farmerId });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
    expect(res.body.error.message).toMatch(/recharge your wallet/i);

    const list = await request(app).get('/api/fid').set('Authorization', authHeader);
    expect(list.body.data.total).toBe(0); // nothing stored
    const wallet = await walletService.getWalletSummary(user.id);
    expect(wallet.balance).toBe(100); // unchanged
  });
});

describe('wallet integrity', () => {
  it('never goes negative under concurrent debits', async () => {
    const { user } = await createUser('operator');
    await walletService.credit(user.id, 600, { reason: 'seed' }); // ₹6 => room for exactly 6 x ₹1 debits

    const attempts = Array.from({ length: 10 }, (_, i) =>
      walletService.debit(user.id, 100, { reason: `concurrent ${i}`, idempotencyKey: `c-${i}` }),
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    expect(ok).toBe(6);
    expect(failed).toBe(4);
    const wallet = await walletService.getWalletSummary(user.id);
    expect(wallet.balance).toBe(0); // never negative
  });

  it('is idempotent: a repeated credit key does not double-credit', async () => {
    const { user } = await createUser('operator');
    const key = 'payment-xyz';
    await walletService.credit(user.id, 500, { reason: 'manual payment', idempotencyKey: key });
    await walletService.credit(user.id, 500, { reason: 'manual payment', idempotencyKey: key }); // retry

    const wallet = await walletService.getWalletSummary(user.id);
    expect(wallet.balance).toBe(500); // credited once
    const count = await Transaction.countDocuments({ idempotencyKey: key });
    expect(count).toBe(1);
  });

  it('enforces RBAC on admin wallet adjustments', async () => {
    const operator = await createUser('operator');
    const forbidden = await request(app)
      .post('/api/wallet/admin-adjustment')
      .set('Authorization', operator.authHeader)
      .send({ userId: operator.user.id, amountRupees: 50, type: 'credit', reason: 'bonus' });
    expect(forbidden.status).toBe(403);

    const admin = await createUser('admin');
    const ok = await request(app)
      .post('/api/wallet/admin-adjustment')
      .set('Authorization', admin.authHeader)
      .send({ userId: admin.user.id, amountRupees: 50, type: 'credit', reason: 'bonus' });
    expect(ok.status).toBe(201);
    const wallet = await walletService.getWalletSummary(admin.user.id);
    expect(wallet.balance).toBe(5000); // ₹50
  });
});
