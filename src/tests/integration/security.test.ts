import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();
const XRW = { 'X-Requested-With': 'XMLHttpRequest' };

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('CSRF protection on the refresh flow', () => {
  async function loginCookie() {
    await createUser('operator', { email: 'csrf@test.local', password: 'Password@123' });
    const res = await request(app).post('/api/auth/login').set(XRW).send({ email: 'csrf@test.local', password: 'Password@123' });
    return res.headers['set-cookie'] as unknown as string[];
  }

  it('rejects a refresh without the custom header (simulated CSRF)', async () => {
    const cookie = await loginCookie();
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie); // no X-Requested-With
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_BLOCKED');
  });

  it('allows a refresh with the custom header and a valid cookie', async () => {
    const cookie = await loginCookie();
    const res = await request(app).post('/api/auth/refresh').set(XRW).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('handles a proxied request with X-Forwarded-For without a 500 (rate-limit/trust-proxy regression)', async () => {
    const cookie = await loginCookie();
    // Simulate the Vite dev proxy / a reverse proxy adding the header.
    const res = await request(app).post('/api/auth/refresh').set(XRW).set('X-Forwarded-For', '127.0.0.1').set('Cookie', cookie);
    expect(res.status).toBe(200);
    // And an unauthenticated one should be a clean 401, never a 500.
    const res2 = await request(app).post('/api/auth/refresh').set(XRW).set('X-Forwarded-For', '10.0.0.5');
    expect(res2.status).toBe(401);
    expect(res2.status).not.toBe(500);
  });

  it('does not 500 when the Origin header differs (CORS must deny, not throw)', async () => {
    // A browser behind the Vite proxy may send 127.0.0.1 or the proxy origin.
    for (const origin of ['http://127.0.0.1:5173', 'http://localhost:5000', 'http://localhost:5173']) {
      const res = await request(app).post('/api/auth/refresh').set(XRW).set('Origin', origin);
      expect(res.status).not.toBe(500);
      expect(res.status).toBe(401); // clean "no cookie" response
    }
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/health').set(XRW);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('end-to-end interlock journey', () => {
  it('admin provisions an operator who registers a farmer, then wallet gates FID generation', async () => {
    const admin = await createUser('admin');

    // 1. Admin creates an operator.
    const created = await request(app).post('/api/users').set(XRW).set('Authorization', admin.authHeader)
      .send({ name: 'Field Operator', email: 'journey-op@test.local', password: 'Password@123', role: 'operator' });
    expect(created.status).toBe(201);

    // 2. Operator logs in.
    const login = await request(app).post('/api/auth/login').set(XRW).send({ email: 'journey-op@test.local', password: 'Password@123' });
    expect(login.status).toBe(200);
    const opAuth = `Bearer ${login.body.data.accessToken}`;
    const opId = login.body.data.user.id;

    // 3. Operator registers a farmer.
    const farmer = await request(app).post('/api/farmers').set(XRW).set('Authorization', opAuth)
      .send({ name: 'Basavaraj', gender: 'male', aadhaarNumber: '123456789012', fid: 'FID9876543210', mobile: '9876543210' });
    expect(farmer.status).toBe(201);
    const farmerId = farmer.body.data.id;

    // 4. FID generation fails on an empty wallet.
    const broke = await request(app).post('/api/fid').set(XRW).set('Authorization', opAuth).send({ farmerId });
    expect(broke.status).toBe(402);
    expect(broke.body.error.code).toBe('INSUFFICIENT_BALANCE');

    // 5. Admin tops up the operator's wallet.
    const topup = await request(app).post('/api/wallet/admin-adjustment').set(XRW).set('Authorization', admin.authHeader)
      .send({ userId: opId, amountRupees: 20, type: 'credit', reason: 'Initial float' });
    expect(topup.status).toBe(201);

    // 6. FID generation now succeeds and debits the wallet.
    const ok = await request(app).post('/api/fid').set(XRW).set('Authorization', opAuth).send({ farmerId });
    expect(ok.status).toBe(201);

    const wallet = await request(app).get('/api/wallet').set(XRW).set('Authorization', opAuth);
    expect(wallet.body.data.balanceRupees).toBe(15); // ₹20 − ₹5
  });
});
