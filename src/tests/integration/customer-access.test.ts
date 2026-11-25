import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();
const XRW = { 'X-Requested-With': 'XMLHttpRequest' };
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(40).fill(0)]).toString('base64');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('customer role access', () => {
  it('a customer cannot use the FRUITS lookup, FID maker or farmer DB', async () => {
    const { authHeader } = await createUser('customer');
    expect((await request(app).post('/api/farmers/lookup').set(XRW).set('Authorization', authHeader).send({ aadhaar: '123456789012' })).status).toBe(403);
    expect((await request(app).post('/api/fid').set(XRW).set('Authorization', authHeader).send({ farmerId: 'x' })).status).toBe(403);
    expect((await request(app).post('/api/farmers').set(XRW).set('Authorization', authHeader).send({ name: 'X', gender: 'male', aadhaarNumber: '123456789012', fid: 'FID1' })).status).toBe(403);
  });

  it('an operator is also blocked from the lookup (admin-only)', async () => {
    const { authHeader } = await createUser('operator');
    expect((await request(app).post('/api/farmers/lookup').set(XRW).set('Authorization', authHeader).send({ aadhaar: '123456789012' })).status).toBe(403);
    // admins can still use it
    const admin = await createUser('admin');
    expect((await request(app).post('/api/farmers/lookup').set(XRW).set('Authorization', admin.authHeader).send({ aadhaar: '123456789012' })).status).toBe(200);
  });

  it('a customer CAN use documents, wallet and payments', async () => {
    const { authHeader } = await createUser('customer');
    expect((await request(app).post('/api/documents').set(XRW).set('Authorization', authHeader).send({ fileName: 'a.png', data: PNG })).status).toBe(201);
    expect((await request(app).get('/api/wallet').set(XRW).set('Authorization', authHeader)).status).toBe(200);
    expect((await request(app).get('/api/payment-settings/qr').set(XRW).set('Authorization', authHeader)).status).toBe(200);
  });
});

describe('customer service applications (enabled gate + owner scope)', () => {
  const crop = { farmerName: 'Asha', mobile: '9876543210', cropName: 'Paddy', season: 'kharif' };

  it('a customer can create an enabled service and only sees their own', async () => {
    const admin = await createUser('admin');
    await request(app).put('/api/service-settings').set(XRW).set('Authorization', admin.authHeader).send({ enabledServices: { crop: true } });
    const custA = await createUser('customer');
    const custB = await createUser('customer');
    const created = await request(app).post('/api/crop-applications').set(XRW).set('Authorization', custA.authHeader).send(crop);
    expect(created.status).toBe(201);
    // B does not see A's application (owner-scoped)
    const listB = await request(app).get('/api/crop-applications').set(XRW).set('Authorization', custB.authHeader);
    expect(listB.body.data.total).toBe(0);
    // Admin sees it
    const listAdmin = await request(app).get('/api/crop-applications').set(XRW).set('Authorization', admin.authHeader);
    expect(listAdmin.body.data.total).toBe(1);
  });

  it('a customer cannot create a disabled service (SERVICE_DISABLED)', async () => {
    const admin = await createUser('admin');
    await request(app).put('/api/service-settings').set(XRW).set('Authorization', admin.authHeader).send({ enabledServices: { crop: false } });
    const cust = await createUser('customer');
    const res = await request(app).post('/api/crop-applications').set(XRW).set('Authorization', cust.authHeader).send(crop);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SERVICE_DISABLED');
    // operators are not gated
    const op = await createUser('operator');
    expect((await request(app).post('/api/crop-applications').set(XRW).set('Authorization', op.authHeader).send(crop)).status).toBe(201);
  });
});
