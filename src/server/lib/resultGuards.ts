/** Narrow discriminated `{ ok: true } | { ok: false; … }` results under Vercel's strict TS check. */

export function isDenied<T extends { ok: boolean }>(
  result: T,
): result is Extract<T, { ok: false }> {
  return result.ok === false;
}
