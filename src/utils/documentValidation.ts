/**
 * Validates an uploaded document supplied as a base64 data URL. Critically, it
 * checks the actual file *content* (magic bytes) against the claimed MIME type,
 * satisfying the PRD requirement to "validate uploaded file content, not only
 * file extensions". Supports JPG/JPEG, PNG and PDF.
 */
const DATA_URL_RE = /^data:([a-zA-Z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/;

export const ALLOWED_DOC_MIMES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type AllowedDocMime = (typeof ALLOWED_DOC_MIMES)[number];

export interface DocValidationResult {
  ok: boolean;
  message?: string;
  mime?: AllowedDocMime;
  bytes?: number;
}

function matchesMagic(buf: Buffer, mime: string): boolean {
  if (mime === 'image/png') {
    return buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  }
  if (mime === 'image/jpeg') {
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === 'application/pdf') {
    // %PDF-
    return buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d;
  }
  return false;
}

export function validateDocumentDataUrl(value: string, maxBytes = 8 * 1024 * 1024): DocValidationResult {
  const match = DATA_URL_RE.exec(value || '');
  if (!match) {
    return { ok: false, message: 'This file format is not supported. Upload a JPG, JPEG, PNG or PDF file.' };
  }
  let mime = match[1].toLowerCase();
  if (mime === 'image/jpg') mime = 'image/jpeg';

  if (!ALLOWED_DOC_MIMES.includes(mime as AllowedDocMime)) {
    return { ok: false, message: 'This file format is not supported. Upload a JPG, JPEG, PNG or PDF file.' };
  }

  const base64 = match[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;
  if (bytes > maxBytes) {
    return { ok: false, message: 'The selected file exceeds the permitted size. Choose a smaller file and upload again.', bytes };
  }

  // Decode just the header to verify the content matches the claimed type.
  const header = Buffer.from(base64.slice(0, 32), 'base64');
  if (!matchesMagic(header, mime)) {
    return { ok: false, message: "The file content doesn't match its type. The file may be corrupted or renamed. Upload a valid JPG, JPEG, PNG or PDF." };
  }

  return { ok: true, mime: mime as AllowedDocMime, bytes };
}
