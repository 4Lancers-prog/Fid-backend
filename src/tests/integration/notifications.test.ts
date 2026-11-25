import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();
const XRW = { 'X-Requested-With': 'XMLHttpRequest' };

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('in-app notifications', () => {
  it('notifies a customer when their registration is approved', async () => {
    const reg = { name: 'Cust', email: 'cust@test.local', mobile: '9876543210', password: 'Password@123' };
    const reqRes = await request(app).post('/api/auth/register-request').set(XRW).send(reg);
    const userId = reqRes.body.data.user.id;

    const admin = await createUser('admin');
    await request(app).patch(`/api/users/${userId}/approve`).set(XRW).set('Authorization', admin.authHeader).send({});

    // Customer logs in (now approved) and checks notifications.
    const login = await request(app).post('/api/auth/login').set(XRW).send({ email: reg.email, password: reg.password });
    const auth = `Bearer ${login.body.data.accessToken}`;
    const notifs = await request(app).get('/api/notifications').set(XRW).set('Authorization', auth);
    expect(notifs.status).toBe(200);
    expect(notifs.body.data.unread).toBe(1);
    expect(notifs.body.data.items[0].type).toBe('registration_approved');

    // Mark all read.
    await request(app).patch('/api/notifications/read-all').set(XRW).set('Authorization', auth);
    const after = await request(app).get('/api/notifications').set(XRW).set('Authorization', auth);
    expect(after.body.data.unread).toBe(0);
  });

  it("only shows a user their own notifications", async () => {
    const a = await createUser('operator');
    const b = await createUser('operator');
    // No notifications for b
    const res = await request(app).get('/api/notifications').set(XRW).set('Authorization', b.authHeader);
    expect(res.body.data.total).toBe(0);
    expect(a.user.id).not.toBe(b.user.id);
  });
});
