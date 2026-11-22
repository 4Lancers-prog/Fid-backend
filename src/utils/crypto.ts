import crypto from 'crypto';
import { env } from '../config/env';

/**
 * AES-256-GCM encryption for sensitive data at rest (e.g. Aadhaar numbers).
 * Format stored: iv:authTag:ciphertext (all hex).
 */
const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const key = Buffer.from(env.dataEncryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (64 hex characters).');
  }
  return key;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decrypt(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted payload format.');
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

/** Deterministic, keyed hash used for duplicate detection without storing plaintext. */
export function blindIndex(value: string): string {
  return crypto.createHmac('sha256', getKey()).update(value).digest('hex');
}
