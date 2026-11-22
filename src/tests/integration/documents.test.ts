import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const dataUrl = (mime: string, bytes: number[]) =>
  `data:${mime};base64,` + Buffer.from([...bytes, ...new Array(40).fill(0)]).toString('base64');
const PNG = dataUrl('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_CLAIM_WITH_PDF_BYTES = dataUrl('image/png', [0x25, 0x50, 0x44, 0x46, 0x2d]);

describe('document scanner', () => {
  it('uploads a valid document and stores correct metadata', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app).post('/api/documents').set('Authorization', authHeader).send({ fileName: 'scan.png', data: PNG, category: 'Aadhaar' });
    expect(res.status).toBe(201);
    expect(res.body.data.mimeType).toBe('image/png');
    expect(res.body.data.sizeBytes).toBeGreaterThan(0);
    // The list view must never include the raw file data.
    expect(res.body.data.data).toBeUndefined();
  });

  it('rejects a file whose content does not match its type', async () => {
    const { authHeader } = await createUser('operator');
    const res = await request(app).post('/api/documents').set('Authorization', authHeader).send({ fileName: 'fake.png', data: PNG_CLAIM_WITH_PDF_BYTES });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DOCUMENT');
  });

  it('forbids a viewer from uploading', async () => {
    const { authHeader } = await createUser('viewer');
    const res = await request(app).post('/api/documents').set('Authorization', authHeader).send({ fileName: 'x.png', data: PNG });
    expect(res.status).toBe(403);
  });

  it('scopes listing: operators see only their own; admins see all', async () => {
    const a = await createUser('operator');
    const b = await createUser('operator');
    await request(app).post('/api/documents').set('Authorization', a.authHeader).send({ fileName: 'a.png', data: PNG });

    const bList = await request(app).get('/api/documents').set('Authorization', b.authHeader);
    expect(bList.body.data.total).toBe(0);

    const admin = await createUser('admin');
    const adminList = await request(app).get('/api/documents').set('Authorization', admin.authHeader);
    expect(adminList.body.data.total).toBe(1);
  });

  it('enforces ownership on fetch and delete', async () => {
    const a = await createUser('operator');
    const b = await createUser('operator');
    const created = await request(app).post('/api/documents').set('Authorization', a.authHeader).send({ fileName: 'a.png', data: PNG });
    const id = created.body.data.id;

    // Owner can fetch full data.
    const owner = await request(app).get(`/api/documents/${id}`).set('Authorization', a.authHeader);
    expect(owner.status).toBe(200);
    expect(owner.body.data.data).toContain('data:image/png;base64,');

    // Another operator cannot.
    const other = await request(app).get(`/api/documents/${id}`).set('Authorization', b.authHeader);
    expect(other.status).toBe(403);
    const otherDel = await request(app).delete(`/api/documents/${id}`).set('Authorization', b.authHeader);
    expect(otherDel.status).toBe(403);

    // Owner can delete.
    expect((await request(app).delete(`/api/documents/${id}`).set('Authorization', a.authHeader)).status).toBe(200);
  });
});
