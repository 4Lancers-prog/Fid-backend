import { describe, it, expect } from 'vitest';
import { createFarmerSchema } from '../../validators/farmer.validator';
import { loginSchema, registerSchema } from '../../validators/auth.validator';

describe('farmer validator', () => {
  it('accepts a valid farmer and normalises dashed Aadhaar to 12 digits', () => {
    const r = createFarmerSchema.safeParse({
      name: 'Basavaraj',
      gender: 'male',
      aadhaarNumber: '1234-5678-9012',
      fid: 'FID9876543210',
      mobile: '9876543210',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.aadhaarNumber).toBe('123456789012');
  });

  it('rejects a short Aadhaar with the PRD message', () => {
    const r = createFarmerSchema.safeParse({ name: 'Ab', gender: 'male', aadhaarNumber: '12', fid: 'FID1' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = r.error.issues.find((i) => i.path[0] === 'aadhaarNumber')?.message;
      expect(msg).toBe('Enter a valid 12-digit Aadhaar number.');
    }
  });

  it('rejects an invalid gender and missing name', () => {
    const r = createFarmerSchema.safeParse({ name: 'A', gender: 'x', aadhaarNumber: '123456789012', fid: 'FID1' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = r.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('gender');
      expect(fields).toContain('name');
    }
  });

  it('rejects an invalid mobile number', () => {
    const r = createFarmerSchema.safeParse({
      name: 'Valid Name',
      gender: 'female',
      aadhaarNumber: '123456789012',
      fid: 'FID1234',
      mobile: '12345',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.find((i) => i.path[0] === 'mobile')?.message).toBe('Enter a valid 10-digit mobile number.');
    }
  });
});

describe('auth validators', () => {
  it('login requires a valid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('register enforces password complexity', () => {
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.com', password: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Al', email: 'a@b.com', password: 'abcd1234' }).success).toBe(true);
  });
});
