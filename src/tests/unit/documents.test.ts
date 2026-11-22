import { describe, it, expect } from 'vitest';
import { validateDocumentDataUrl } from '../../utils/documentValidation';

const toDataUrl = (mime: string, bytes: number[]) =>
  `data:${mime};base64,` + Buffer.from([...bytes, ...new Array(40).fill(0)]).toString('base64');

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

describe('validateDocumentDataUrl (content sniffing)', () => {
  it('accepts a PNG whose bytes match its type', () => {
    const r = validateDocumentDataUrl(toDataUrl('image/png', PNG_MAGIC));
    expect(r.ok).toBe(true);
    expect(r.mime).toBe('image/png');
  });

  it('accepts a JPEG and normalises image/jpg to image/jpeg', () => {
    expect(validateDocumentDataUrl(toDataUrl('image/jpeg', JPEG_MAGIC)).ok).toBe(true);
    const jpg = validateDocumentDataUrl(toDataUrl('image/jpg', JPEG_MAGIC));
    expect(jpg.ok).toBe(true);
    expect(jpg.mime).toBe('image/jpeg');
  });

  it('accepts a PDF whose bytes match its type', () => {
    expect(validateDocumentDataUrl(toDataUrl('application/pdf', PDF_MAGIC)).ok).toBe(true);
  });

  it('REJECTS a file whose content does not match the claimed type', () => {
    // Claims PNG but carries PDF bytes — the classic renamed-file attack.
    const r = validateDocumentDataUrl(toDataUrl('image/png', PDF_MAGIC));
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/content doesn't match|corrupted or renamed/i);
  });

  it('rejects a disallowed MIME type', () => {
    expect(validateDocumentDataUrl(toDataUrl('application/x-msdownload', PNG_MAGIC)).ok).toBe(false);
  });

  it('rejects a malformed data URL', () => {
    expect(validateDocumentDataUrl('not-a-data-url').ok).toBe(false);
  });

  it('rejects an oversized file', () => {
    const big = 'data:application/pdf;base64,' + Buffer.from([...PDF_MAGIC, ...new Array(2048).fill(0)]).toString('base64');
    expect(validateDocumentDataUrl(big, 512).ok).toBe(false);
  });
});
