import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();
const XRW = { 'X-Requested-With': 'XMLHttpRequest' };

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const reg = { name: 'Customer One', email: 'cust1@test.local', mobile: '9876543210', password: 'Password@123' };

describe('public self-registration + admin approval', () => {
  it('registers a pending account that cannot log in yet', async () => {
    const r = await request(app).post('/api/auth/register-request').set(XRW).send(reg);
    expect(r.status).toBe(201);
    expect(r.body.data.user.approvalStatus).toBe('pending');
    expect(r.body.data.user.passwordHash).toBeUndefined();

    // Correct password, but still pending -> 403 with a clear message.
    const login = await request(app).post('/api/auth/login').set(XRW).send({ email: reg.email, password: reg.password });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('PENDING_APPROVAL');
  });

  it('rejects duplicate email and validates fields', async () => {
    await request(app).post('/api/auth/register-request').set(XRW).send(reg);
    const dup = await request(app).post('/api/auth/register-request').set(XRW).send(reg);
    expect(dup.status).toBe(409);
    const bad = await request(app).post('/api/auth/register-request').set(XRW).send({ ...reg, email: 'nope', mobile: '12' });
    expect(bad.status).toBe(422);
  });

  it('lets an admin approve, after which the customer can log in', async () => {
    const admin = await createUser('admin');
    const reqRes = await request(app).post('/api/auth/register-request').set(XRW).send(reg);
    const userId = reqRes.body.data.user.id;

    // Admin sees it in the pending list.
    const pending = await request(app).get('/api/users?approvalStatus=pending').set(XRW).set('Authorization', admin.authHeader);
    expect(pending.body.data.items.some((u: { id: string }) => u.id === userId)).toBe(true);

    // Approve.
    const appr = await request(app).patch(`/api/users/${userId}/approve`).set(XRW).set('Authorization', admin.authHeader).send({});
    expect(appr.status).toBe(200);
    expect(appr.body.data.approvalStatus).toBe('approved');

    // Now login works.
    const login = await request(app).post('/api/auth/login').set(XRW).send({ email: reg.email, password: reg.password });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();
  });

  it('lets an admin reject, blocking login', async () => {
    const admin = await createUser('admin');
    const reqRes = await request(app).post('/api/auth/register-request').set(XRW).send(reg);
    const userId = reqRes.body.data.user.id;
    await request(app).patch(`/api/users/${userId}/reject`).set(XRW).set('Authorization', admin.authHeader).send({});
    const login = await request(app).post('/api/auth/login').set(XRW).send({ email: reg.email, password: reg.password });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('REGISTRATION_REJECTED');
  });

  it('forbids non-admins from approving', async () => {
    const op = await createUser('operator');
    const reqRes = await request(app).post('/api/auth/register-request').set(XRW).send(reg);
    const res = await request(app).patch(`/api/users/${reqRes.body.data.user.id}/approve`).set(XRW).set('Authorization', op.authHeader).send({});
    expect(res.status).toBe(403);
  });
});

describe('registration with fee payment', () => {
  const payReg = { name: 'Paid Customer', email: 'paid@test.local', mobile: '9876543211', password: 'Password@123', paymentUtr: 'UTR-REG-1', paymentAmountRupees: 100, paymentProof: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' };

  it('accepts a registration with UTR + amount + proof, and admin can view the proof', async () => {
    const r = await request(app).post('/api/auth/register-request').set(XRW).send(payReg);
    expect(r.status).toBe(201);
    const userId = r.body.data.user.id;

    const admin = await createUser('admin');
    const list = await request(app).get('/api/users?approvalStatus=pending').set(XRW).set('Authorization', admin.authHeader);
    const row = list.body.data.items.find((u: { id: string }) => u.id === userId);
    expect(row.registrationPaymentUtr).toBe('UTR-REG-1');
    expect(row.registrationPaymentAmountRupees).toBe(100);
    expect(row.registrationPaymentProof).toBeUndefined(); // not in list

    const detail = await request(app).get(`/api/users/${userId}`).set(XRW).set('Authorization', admin.authHeader);
    expect(detail.body.data.registrationPaymentProof).toContain('data:image/png;base64,');
  });

  it('rejects a duplicate UTR', async () => {
    await request(app).post('/api/auth/register-request').set(XRW).send(payReg);
    const dup = await request(app).post('/api/auth/register-request').set(XRW).send({ ...payReg, email: 'other@test.local', mobile: '9876500000' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_UTR');
  });

  it('exposes the active QR publicly for the signup page', async () => {
    const admin = await createUser('admin');
    await request(app).put('/api/payment-settings/qr').set(XRW).set('Authorization', admin.authHeader)
      .send({ upiId: 'reg@upi', businessName: 'Council', registrationFeeRupees: 100, active: true });
    const qr = await request(app).get('/api/auth/registration-qr'); // NO auth
    expect(qr.status).toBe(200);
    expect(qr.body.data.active).toBe(true);
    expect(qr.body.data.upiId).toBe('reg@upi');
    expect(qr.body.data.registrationFeeRupees).toBe(100);
  });
});
