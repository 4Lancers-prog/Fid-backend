import { describe, it, expect } from 'vitest';
import { adminCreateUserSchema, updateUserSchema } from '../../validators/user.validator';

describe('admin create user validator', () => {
  it('accepts a valid user with a role', () => {
    expect(
      adminCreateUserSchema.safeParse({ name: 'Asha', email: 'a@b.com', password: 'Secret123', role: 'operator' }).success,
    ).toBe(true);
  });
  it('rejects a weak password and an invalid role', () => {
    const r = adminCreateUserSchema.safeParse({ name: 'Asha', email: 'a@b.com', password: 'short', role: 'king' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = r.error.issues.map((i) => i.path[0]);
      expect(f).toContain('password');
      expect(f).toContain('role');
    }
  });
});

describe('update user validator', () => {
  it('requires at least one field', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateUserSchema.safeParse({ role: 'viewer' }).success).toBe(true);
  });
});
