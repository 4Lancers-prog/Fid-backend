import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const farmer = { name: 'Basavaraj', gender: 'male', aadhaarNumber: '123456789012', fid: 'FID9876543210', mobile: '9876543210' };

async function makeFarmer(authHeader: string) {
  const res = await request(app).post('/api/farmers').set('Authorization', authHeader).send(farmer);
  return res.body.data.id as string;
}

describe('farmer edit + change history', () => {
  it('records a create entry and update diffs', async () => {
    const { authHeader } = await createUser('operator');
    const id = await makeFarmer(authHeader);

    await request(app).patch(`/api/farmers/${id}`).set('Authorization', authHeader).send({ village: 'Sulla', mobile: '9999999999' });

    const hist = await request(app).get(`/api/farmers/${id}/history`).set('Authorization', authHeader);
    expect(hist.status).toBe(200);
    const actions = hist.body.data.map((h: { action: string }) => h.action);
    expect(actions).toContain('create');
    expect(actions).toContain('update');

    const update = hist.body.data.find((h: { action: string }) => h.action === 'update');
    const fields = update.changes.map((c: { field: string }) => c.field).sort();
    expect(fields).toContain('village');
    expect(fields).toContain('mobile');
    const mobileChange = update.changes.find((c: { field: string }) => c.field === 'mobile');
    expect(mobileChange.from).toBe('9876543210');
    expect(mobileChange.to).toBe('9999999999');
  });

  it('does not record history when nothing changes', async () => {
    const { authHeader } = await createUser('operator');
    const id = await makeFarmer(authHeader);
    await request(app).patch(`/api/farmers/${id}`).set('Authorization', authHeader).send({ name: 'Basavaraj' }); // same value
    const hist = await request(app).get(`/api/farmers/${id}/history`).set('Authorization', authHeader);
    const updates = hist.body.data.filter((h: { action: string }) => h.action === 'update');
    expect(updates.length).toBe(0);
  });

  it('forbids a viewer from editing', async () => {
    const op = await createUser('operator');
    const id = await makeFarmer(op.authHeader);
    const viewer = await createUser('viewer');
    const res = await request(app).patch(`/api/farmers/${id}`).set('Authorization', viewer.authHeader).send({ village: 'X' });
    expect(res.status).toBe(403);
  });
});

describe('assisted lookup by Aadhaar', () => {
  it('reports existence without exposing the full Aadhaar', async () => {
    const { authHeader } = await createUser('operator');
    await makeFarmer(authHeader);

    const found = await request(app).post('/api/farmers/lookup').set('Authorization', authHeader).send({ aadhaar: '1234-5678-9012' });
    expect(found.status).toBe(200);
    expect(found.body.data.exists).toBe(true);
    expect(found.body.data.farmer.aadhaarMasked).toBe('XXXX-XXXX-9012');
    expect(found.body.data.farmer.aadhaarNumber).toBeUndefined();

    const none = await request(app).post('/api/farmers/lookup').set('Authorization', authHeader).send({ aadhaar: '999999999999' });
    expect(none.body.data.exists).toBe(false);
    expect(none.body.data.farmer).toBeNull();
  });

  it('validates the Aadhaar format (422)', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app).post('/api/farmers/lookup').set('Authorization', authHeader).send({ aadhaar: '12' });
    expect(res.status).toBe(422);
  });
});
