import { describe, it, expect } from 'vitest';
import { validateImageDataUrl } from '../../utils/file';
import { createManualPaymentSchema, rejectSchema } from '../../validators/payment.validator';

// 1x1 transparent PNG data URL.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('validateImageDataUrl', () => {
  it('accepts a small valid PNG data URL', () => {
    const r = validateImageDataUrl(PNG);
    expect(r.ok).toBe(true);
    expect(r.bytes).toBeGreaterThan(0);
  });
  it('rejects a non-image / malformed string', () => {
    expect(validateImageDataUrl('not-a-data-url').ok).toBe(false);
    expect(validateImageDataUrl('data:application/pdf;base64,AAAA').ok).toBe(false);
  });
  it('rejects an oversized image', () => {
    const big = 'data:image/png;base64,' + 'A'.repeat(5 * 1024 * 1024);
    const r = validateImageDataUrl(big, 1024 * 1024);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/exceeds the permitted size/i);
  });
});

describe('manual payment validator', () => {
  it('accepts a valid recharge request', () => {
    expect(createManualPaymentSchema.safeParse({ amountRupees: '500', utr: 'ABC123456', proof: PNG }).success).toBe(true);
  });
  it('rejects a non-positive amount and a short UTR', () => {
    const r = createManualPaymentSchema.safeParse({ amountRupees: 0, utr: '123' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const f = Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
      expect(f.amountRupees).toMatch(/greater than zero/);
      expect(f.utr).toMatch(/at least 6/);
    }
  });
  it('requires a reason to reject', () => {
    expect(rejectSchema.safeParse({ reason: '' }).success).toBe(false);
    expect(rejectSchema.safeParse({ reason: 'UTR not found' }).success).toBe(true);
  });
});
