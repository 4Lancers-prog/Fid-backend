import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('auth flow', () => {
  it('logs in with valid credentials and returns an access token', async () => {
    await createUser('operator', { email: 'op@test.local', password: 'Password@123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'op@test.local', password: 'Password@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('op@test.local');
    // Password hash must never be leaked.
    expect(res.body.data.user.passwordHash).toBeUndefined();
    // Refresh token is delivered as an httpOnly cookie.
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.join()).toMatch(/refreshToken=.*HttpOnly/i);
  });

  it('rejects invalid credentials with a friendly message', async () => {
    await createUser('operator', { email: 'op@test.local', password: 'Password@123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'op@test.local', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 422 field errors for an invalid email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope', password: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.map((f: { field: string }) => f.field)).toContain('email');
  });

  it('protects /auth/me and returns the current user when authorised', async () => {
    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);

    const { authHeader } = await createUser('admin');
    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('only admins may register new users', async () => {
    const operator = await createUser('operator');
    const forbidden = await request(app)
      .post('/api/auth/register')
      .set('Authorization', operator.authHeader)
      .send({ name: 'New User', email: 'new@test.local', password: 'Password@123' });
    expect(forbidden.status).toBe(403);

    const admin = await createUser('admin');
    const ok = await request(app)
      .post('/api/auth/register')
      .set('Authorization', admin.authHeader)
      .send({ name: 'New User', email: 'new2@test.local', password: 'Password@123', role: 'viewer' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.user.role).toBe('viewer');
  });
});
