import { describe, it, expect } from 'vitest';
import { maskAadhaar, maskPan } from '../../utils/mask';

describe('masking', () => {
  it('masks Aadhaar showing only last 4', () => {
    expect(maskAadhaar('9012')).toBe('XXXX-XXXX-9012');
    expect(maskAadhaar('123456789012')).toBe('XXXX-XXXX-9012');
  });

  it('pads short input safely', () => {
    expect(maskAadhaar('12')).toBe('XXXX-XXXX-XX12');
    expect(maskAadhaar('')).toBe('XXXX-XXXX-XXXX');
  });

  it('masks PAN showing only last 4', () => {
    expect(maskPan('ABCDE1234F')).toBe('XXXXXX234F');
    expect(maskPan('')).toBe('');
  });
});
