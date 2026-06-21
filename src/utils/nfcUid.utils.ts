/** Normalize NFC / wedge UID input to uppercase hex without separators. */
export function normalizeNfcUid(raw: string): string {
  let s = raw.trim().toUpperCase();
  if (s.startsWith('0X')) s = s.slice(2);
  s = s.replace(/[^0-9A-F]/g, '');
  return s;
}

export function isValidNfcUid(uid: string): boolean {
  const n = normalizeNfcUid(uid);
  return n.length >= 4 && n.length <= 32;
}
