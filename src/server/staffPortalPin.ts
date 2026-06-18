/** Generate a random 6-digit staff portal PIN (no leading-zero-only edge cases). */
export function generatePortalPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizePortalPin(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!/^\d{4,8}$/.test(raw)) return null;
  return raw;
}

export function portalPinsMatch(stored: string | null | undefined, entered: string): boolean {
  const norm = normalizePortalPin(entered);
  if (!norm || !stored) return false;
  return stored.trim() === norm;
}
