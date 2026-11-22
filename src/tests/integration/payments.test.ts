import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';
import * as walletService from '../../services/wallet.service';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

async function submit(authHeader: string, utr: string, amountRupees = 500) {
  return request(app).post('/api/manual-payments').set('Authorization', authHeader).send({ amountRupees, utr });
}

describe('manual payments — submission', () => {
  it('does NOT credit the wallet on submission (stays pending)', async () => {
    const { user, authHeader } = await createUser('operator');
    const res = await submit(authHeader, 'UTR-AUTO-1');
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    const wallet = await walletService.getWalletSummary(user.id);
    expect(wallet.balance).toBe(0); // no auto-credit
  });

  it('blocks a duplicate UTR with a 409', async () => {
    const { authHeader } = await createUser('operator');
    await submit(authHeader, 'UTR-DUP-1');
    const dup = await submit(authHeader, 'UTR-DUP-1');
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_UTR');
  });

  it('validates amount and UTR (422)', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app).post('/api/manual-payments').set('Authorization', authHeader).send({ amountRupees: 0, utr: '12' });
    expect(res.status).toBe(422);
  });
});

describe('manual payments — verification', () => {
  it('credits the wallet exactly once on approval, even if approved twice', async () => {
    const payer = await createUser('operator');
    const admin = await createUser('admin');
    const sub = await submit(payer.authHeader, 'UTR-APPROVE-1', 750);
    const id = sub.body.data.id;

    const first = await request(app).patch(`/api/manual-payments/${id}/approve`).set('Authorization', admin.authHeader).send({});
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('approved');

    const second = await request(app).patch(`/api/manual-payments/${id}/approve`).set('Authorization', admin.authHeader).send({});
    expect(second.status).toBe(409); // already approved

    const wallet = await walletService.getWalletSummary(payer.user.id);
    expect(wallet.balance).toBe(75000); // ₹750 credited once
  });

  it('does not credit on rejection', async () => {
    const payer = await createUser('operator');
    const admin = await createUser('admin');
    const sub = await submit(payer.authHeader, 'UTR-REJECT-1', 300);
    const id = sub.body.data.id;

    const res = await request(app)
      .patch(`/api/manual-payments/${id}/reject`)
      .set('Authorization', admin.authHeader)
      .send({ reason: 'UTR not found in bank statement' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');

    const wallet = await walletService.getWalletSummary(payer.user.id);
    expect(wallet.balance).toBe(0);
  });

  it('enforces RBAC: operators cannot approve or list all requests', async () => {
    const payer = await createUser('operator');
    const other = await createUser('operator');
    const sub = await submit(payer.authHeader, 'UTR-RBAC-1');
    const id = sub.body.data.id;

    const approve = await request(app).patch(`/api/manual-payments/${id}/approve`).set('Authorization', other.authHeader).send({});
    expect(approve.status).toBe(403);

    const listAll = await request(app).get('/api/manual-payments').set('Authorization', other.authHeader);
    expect(listAll.status).toBe(403);
  });
});

describe('payment settings', () => {
  it('admins update settings; everyone sees the active QR view', async () => {
    const admin = await createUser('admin');
    const operator = await createUser('operator');

    const update = await request(app)
      .put('/api/payment-settings/qr')
      .set('Authorization', admin.authHeader)
      .send({ upiId: 'shop@upi', businessName: 'Agri Services', active: true });
    expect(update.status).toBe(200);

    const forbidden = await request(app).put('/api/payment-settings/qr').set('Authorization', operator.authHeader).send({ active: false });
    expect(forbidden.status).toBe(403);

    const qr = await request(app).get('/api/payment-settings/qr').set('Authorization', operator.authHeader);
    expect(qr.status).toBe(200);
    expect(qr.body.data.active).toBe(true);
    expect(qr.body.data.upiId).toBe('shop@upi');
  });
});
