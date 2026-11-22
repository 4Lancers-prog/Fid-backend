import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const validFarmer = {
  name: 'Basavaraj Patil',
  gender: 'male',
  aadhaarNumber: '1234-5678-9012',
  fid: 'FID9876543210',
  mobile: '9876543210',
  village: 'Sulla',
  district: 'Dharwad',
};

describe('farmers', () => {
  it('creates a farmer and returns only masked Aadhaar', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app).post('/api/farmers').set('Authorization', authHeader).send(validFarmer);
    expect(res.status).toBe(201);
    expect(res.body.data.aadhaarMasked).toBe('XXXX-XXXX-9012');
    // Full Aadhaar and encrypted/hash fields must never be returned.
    expect(res.body.data.aadhaarNumber).toBeUndefined();
    expect(res.body.data.aadhaarEnc).toBeUndefined();
    expect(res.body.data.aadhaarHash).toBeUndefined();
  });

  it('blocks a duplicate Aadhaar with a 409 and actionable message', async () => {
    const { authHeader } = await createUser('operator');
    await request(app).post('/api/farmers').set('Authorization', authHeader).send(validFarmer);
    const dup = await request(app)
      .post('/api/farmers')
      .set('Authorization', authHeader)
      .send({ ...validFarmer, fid: 'FID0000000001' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('FARMER_DUPLICATE');
    expect(dup.body.error.message).toMatch(/already associated/i);
  });

  it('rejects an invalid Aadhaar with a 422 field error', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app)
      .post('/api/farmers')
      .set('Authorization', authHeader)
      .send({ ...validFarmer, aadhaarNumber: '12' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields[0].field).toBe('aadhaarNumber');
  });

  it('forbids a viewer from creating farmers (RBAC)', async () => {
    const { authHeader } = await createUser('viewer');
    const res = await request(app).post('/api/farmers').set('Authorization', authHeader).send(validFarmer);
    expect(res.status).toBe(403);
  });

  it('searches and paginates', async () => {
    const { authHeader } = await createUser('operator');
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/farmers')
        .set('Authorization', authHeader)
        .send({ ...validFarmer, name: `Farmer ${i}`, fid: `FID100${i}`, aadhaarNumber: `12345678900${i}` });
    }
    const all = await request(app).get('/api/farmers?limit=2&page=1').set('Authorization', authHeader);
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBe(3);
    expect(all.body.data.items).toHaveLength(2);

    const search = await request(app).get('/api/farmers?search=Farmer 1').set('Authorization', authHeader);
    expect(search.body.data.items.some((f: { name: string }) => f.name === 'Farmer 1')).toBe(true);
  });
});
