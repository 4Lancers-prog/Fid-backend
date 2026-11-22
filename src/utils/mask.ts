/** Returns an Aadhaar display string revealing only the last 4 digits. */
export function maskAadhaar(last4: string): string {
  const safe = (last4 || '').replace(/\D/g, '').slice(-4).padStart(4, 'X');
  return `XXXX-XXXX-${safe}`;
}

/** Returns a PAN display string revealing only the last 4 characters. */
export function maskPan(pan: string): string {
  if (!pan) return '';
  const tail = pan.slice(-4);
  return `XXXXXX${tail}`;
}
