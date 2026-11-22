import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('crop applications', () => {
  const payload = { farmerName: 'Asha', mobile: '9876543210', cropName: 'Paddy', season: 'kharif', district: 'Mysuru' };

  it('operator creates and lists; status filter works', async () => {
    const { authHeader } = await createUser('operator');
    const created = await request(app).post('/api/crop-applications').set('Authorization', authHeader).send(payload);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('new');

    const list = await request(app).get('/api/crop-applications?status=new').set('Authorization', authHeader);
    expect(list.body.data.total).toBe(1);
    const none = await request(app).get('/api/crop-applications?status=completed').set('Authorization', authHeader);
    expect(none.body.data.total).toBe(0);
  });

  it('rejects invalid input with a 422 field error', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app)
      .post('/api/crop-applications')
      .set('Authorization', authHeader)
      .send({ ...payload, season: 'winter' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields.some((f: { field: string }) => f.field === 'season')).toBe(true);
  });

  it('forbids a viewer from creating (RBAC)', async () => {
    const { authHeader } = await createUser('viewer');
    const res = await request(app).post('/api/crop-applications').set('Authorization', authHeader).send(payload);
    expect(res.status).toBe(403);
  });

  it('updates status with remarks', async () => {
    const { authHeader } = await createUser('operator');
    const created = await request(app).post('/api/crop-applications').set('Authorization', authHeader).send(payload);
    const id = created.body.data.id ?? created.body.data._id;
    const res = await request(app)
      .patch(`/api/crop-applications/${id}/status`)
      .set('Authorization', authHeader)
      .send({ status: 'completed', remarks: 'Approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.remarks).toBe('Approved');
  });
});

describe('loan leads (sensitive data)', () => {
  const payload = {
    applicantName: 'Meena',
    mobile: '9876543210',
    loanType: 'home',
    loanAmount: 500000,
    pan: 'ABCDE1234F',
    aadhaar: '123456789012',
  };

  it('stores PAN/Aadhaar encrypted and returns only masked values', async () => {
    const { authHeader } = await createUser('loan_executive');
    const res = await request(app).post('/api/loan-leads').set('Authorization', authHeader).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.panMasked).toBe('XXXXXX234F');
    expect(res.body.data.aadhaarMasked).toBe('XXXX-XXXX-9012');
    // Raw and encrypted fields must never be exposed.
    expect(res.body.data.pan).toBeUndefined();
    expect(res.body.data.aadhaar).toBeUndefined();
    expect(res.body.data.panEnc).toBeUndefined();
    expect(res.body.data.aadhaarEnc).toBeUndefined();
  });

  it('forbids an operator from creating loan leads (RBAC)', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app).post('/api/loan-leads').set('Authorization', authHeader).send(payload);
    expect(res.status).toBe(403);
  });
});
