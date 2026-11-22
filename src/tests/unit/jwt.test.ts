import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  process.env.DATA_ENCRYPTION_KEY = 'ab'.repeat(32);
});

describe('jwt utils', () => {
  it('signs and verifies an access token with its claims', async () => {
    const { signAccessToken, verifyAccessToken } = await import('../../utils/jwt');
    const token = signAccessToken({ sub: 'u1', role: 'operator', name: 'Asha' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.role).toBe('operator');
    expect(payload.name).toBe('Asha');
  });

  it('signs and verifies a refresh token with tokenVersion', async () => {
    const { signRefreshToken, verifyRefreshToken } = await import('../../utils/jwt');
    const token = signRefreshToken({ sub: 'u1', tokenVersion: 3 });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.tokenVersion).toBe(3);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const { verifyAccessToken } = await import('../../utils/jwt');
    const forged = jwt.sign({ sub: 'x', role: 'admin', name: 'Mallory' }, 'wrong_secret');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects an expired token', async () => {
    const { verifyAccessToken } = await import('../../utils/jwt');
    const expired = jwt.sign({ sub: 'u1', role: 'viewer', name: 'X' }, 'test_access_secret', { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow();
  });
});
