import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('reports & analytics', () => {
  it('aggregates applications, payments and wallet movement', async () => {
    const op = await createUser('operator');
    const le = await createUser('loan_executive');
    const admin = await createUser('admin');

    // Seed applications: 2 crop, 1 loan.
    const cropA = await request(app).post('/api/crop-applications').set('Authorization', op.authHeader)
      .send({ farmerName: 'Asha', mobile: '9876543210', cropName: 'Paddy', season: 'kharif' });
    await request(app).post('/api/crop-applications').set('Authorization', op.authHeader)
      .send({ farmerName: 'Ravi', mobile: '9876543211', cropName: 'Ragi', season: 'rabi' });
    await request(app).post('/api/loan-leads').set('Authorization', le.authHeader)
      .send({ applicantName: 'Meena', mobile: '9876543212', loanType: 'home', loanAmount: 100000 });

    // Move one crop to completed.
    await request(app).patch(`/api/applications/crop/${cropA.body.data.id}/status`).set('Authorization', admin.authHeader)
      .send({ status: 'completed' });

    // Seed and approve a payment to exercise wallet/payment aggregation.
    const sub = await request(app).post('/api/manual-payments').set('Authorization', op.authHeader).send({ amountRupees: 500, utr: 'UTR-REPORT-1' });
    await request(app).patch(`/api/manual-payments/${sub.body.data.id}/approve`).set('Authorization', admin.authHeader).send({});

    const res = await request(app).get('/api/reports').set('Authorization', admin.authHeader);
    expect(res.status).toBe(200);
    const d = res.body.data;

    const byType = Object.fromEntries(d.applicationsByType.map((t: { type: string; total: number }) => [t.type, t.total]));
    expect(byType.crop).toBe(2);
    expect(byType.loan).toBe(1);
    expect(byType.vehicle).toBe(0);

    const statusSum = Object.values(d.applicationsByStatus as Record<string, number>).reduce((a, b) => a + b, 0);
    expect(statusSum).toBe(3);
    expect(d.applicationsByStatus.completed).toBe(1);

    expect(d.payments.counts.approved).toBe(1);
    expect(d.payments.approvedAmountPaise).toBe(50000);
    expect(d.wallet.creditedPaise).toBe(50000);
  });

  it('forbids non-admins', async () => {
    const op = await createUser('operator');
    expect((await request(app).get('/api/reports').set('Authorization', op.authHeader)).status).toBe(403);
  });
});
