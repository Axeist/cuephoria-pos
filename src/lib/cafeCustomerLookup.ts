/**
 * Match customers from the central DB by phone. Do not filter by cafe location —
 * customers may be registered under main or another branch.
 */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Last 10 digits (Indian mobile core). */
export function normalizeIndianMobile10(input: string): string | null {
  const d = digitsOnly(input);
  if (d.length < 10) return null;
  if (d.length === 10) return d;
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  if (d.length === 12 && d.startsWith('91')) return d.slice(2);
  if (d.length > 10) return d.slice(-10);
  return null;
}

/** Variants stored in DB for the same subscriber number. */
export function phoneMatchVariants(core10: string): string[] {
  if (core10.length !== 10) return [];
  const s = new Set<string>();
  s.add(core10);
  s.add(`91${core10}`);
  s.add(`+91${core10}`);
  s.add(`0${core10}`);
  return [...s];
}
