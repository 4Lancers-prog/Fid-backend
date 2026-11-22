import { describe, it, expect, beforeAll } from 'vitest';

// Deterministic 32-byte key for tests.
beforeAll(() => {
  process.env.DATA_ENCRYPTION_KEY = 'ab'.repeat(32);
});

describe('crypto (AES-256-GCM + blind index)', () => {
  it('encrypts and decrypts round-trip', async () => {
    const { encrypt, decrypt } = await import('../../utils/crypto');
    const plain = '123456789012';
    const enc = encrypt(plain);
    expect(enc).not.toBe(plain);
    expect(enc.split(':')).toHaveLength(3); // iv:tag:data
    expect(decrypt(enc)).toBe(plain);
  });

  it('produces different ciphertext each time (random IV)', async () => {
    const { encrypt } = await import('../../utils/crypto');
    expect(encrypt('123456789012')).not.toBe(encrypt('123456789012'));
  });

  it('blind index is deterministic and keyed', async () => {
    const { blindIndex } = await import('../../utils/crypto');
    const a = blindIndex('123456789012');
    const b = blindIndex('123456789012');
    const c = blindIndex('999999999999');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64); // sha256 hex
  });

  it('rejects a tampered payload', async () => {
    const { encrypt, decrypt } = await import('../../utils/crypto');
    const enc = encrypt('secret');
    const [iv, tag, data] = enc.split(':');
    const tampered = `${iv}:${tag}:${data.slice(0, -2)}ff`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
