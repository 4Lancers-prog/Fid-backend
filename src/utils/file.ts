/**
 * Validates a base64 image data URL (payment proof, QR image) by MIME type and
 * decoded byte size. Content-type is checked, not just an extension, per the
 * PRD security requirements. Larger deployments should stream to object storage
 * instead of embedding base64 — this keeps Phase 4 self-contained.
 */
const DATA_URL_RE = /^data:(image\/(png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/;

export interface ImageValidationResult {
  ok: boolean;
  message?: string;
  bytes?: number;
}

export function validateImageDataUrl(value: string, maxBytes = 3 * 1024 * 1024): ImageValidationResult {
  const match = DATA_URL_RE.exec(value || '');
  if (!match) {
    return { ok: false, message: 'This file format is not supported. Upload a JPG, JPEG, PNG or WEBP image.' };
  }
  const base64 = match[3];
  // Approx decoded size: 3 bytes per 4 base64 chars, minus padding.
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;
  if (bytes > maxBytes) {
    return { ok: false, message: 'The selected file exceeds the permitted size. Choose a smaller file and upload again.', bytes };
  }
  return { ok: true, bytes };
}
