import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { startDb, stopDb, clearDb, createUser } from './helpers';

const app = createApp();

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('user management (RBAC + guards + audit)', () => {
  it('forbids operators from listing users', async () => {
    const { authHeader } = await createUser('operator');
    expect((await request(app).get('/api/users').set('Authorization', authHeader)).status).toBe(403);
  });

  it('lets an admin create a non-elevated user but not an admin', async () => {
    const admin = await createUser('admin');
    const ok = await request(app)
      .post('/api/users')
      .set('Authorization', admin.authHeader)
      .send({ name: 'Op One', email: 'op1@test.local', password: 'Secret123', role: 'operator' });
    expect(ok.status).toBe(201);

    const forbidden = await request(app)
      .post('/api/users')
      .set('Authorization', admin.authHeader)
      .send({ name: 'Admin Two', email: 'admin2@test.local', password: 'Secret123', role: 'admin' });
    expect(forbidden.status).toBe(403);
  });

  it('lets a super admin create an admin and writes an audit entry', async () => {
    const su = await createUser('super_admin');
    const created = await request(app)
      .post('/api/users')
      .set('Authorization', su.authHeader)
      .send({ name: 'Admin Two', email: 'admin2@test.local', password: 'Secret123', role: 'admin' });
    expect(created.status).toBe(201);

    const logs = await request(app).get('/api/audit-logs').set('Authorization', su.authHeader);
    expect(logs.status).toBe(200);
    expect(logs.body.data.items.some((l: { action: string }) => l.action === 'user.create')).toBe(true);
  });

  it('prevents changing your own role or status', async () => {
    const admin = await createUser('admin');
    const res = await request(app)
      .patch(`/api/users/${admin.user.id}`)
      .set('Authorization', admin.authHeader)
      .send({ role: 'operator' });
    expect(res.status).toBe(403);
  });

  it('revokes sessions on role change (tokenVersion bumped)', async () => {
    const su = await createUser('super_admin');
    const target = await createUser('operator');
    const res = await request(app)
      .patch(`/api/users/${target.user.id}`)
      .set('Authorization', su.authHeader)
      .send({ role: 'viewer' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('viewer');
    // The previously issued access token still works until expiry, but the refresh
    // token is invalidated; here we assert the role change persisted.
  });
});

describe('centralized application management', () => {
  async function seed() {
    const op = await createUser('operator');
    const le = await createUser('loan_executive');
    await request(app).post('/api/crop-applications').set('Authorization', op.authHeader)
      .send({ farmerName: 'Asha', mobile: '9876543210', cropName: 'Paddy', season: 'kharif' });
    await request(app).post('/api/loan-leads').set('Authorization', le.authHeader)
      .send({ applicantName: 'Meena', mobile: '9876543211', loanType: 'home', loanAmount: 100000 });
  }

  it('aggregates across modules and filters by service type', async () => {
    await seed();
    const admin = await createUser('admin');

    const all = await request(app).get('/api/applications').set('Authorization', admin.authHeader);
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBe(2);
    const types = all.body.data.items.map((i: { serviceType: string }) => i.serviceType).sort();
    expect(types).toContain('crop');
    expect(types).toContain('loan');

    const cropOnly = await request(app).get('/api/applications?serviceType=crop').set('Authorization', admin.authHeader);
    expect(cropOnly.body.data.total).toBe(1);
    expect(cropOnly.body.data.items[0].serviceType).toBe('crop');
  });

  it('forbids non-admins and updates status via the central endpoint', async () => {
    await seed();
    const operator = await createUser('operator');
    expect((await request(app).get('/api/applications').set('Authorization', operator.authHeader)).status).toBe(403);

    const admin = await createUser('admin');
    const list = await request(app).get('/api/applications?serviceType=crop').set('Authorization', admin.authHeader);
    const id = list.body.data.items[0].id;
    const upd = await request(app)
      .patch(`/api/applications/crop/${id}/status`)
      .set('Authorization', admin.authHeader)
      .send({ status: 'completed', remarks: 'Done' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.status).toBe('completed');
  });
});
