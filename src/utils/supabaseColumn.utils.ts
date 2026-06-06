/** Postgres undefined_column */
export function isMissingColumnError(
  error: { code?: string; message?: string } | null | undefined,
  column?: string
): boolean {
  if (!error || error.code !== '42703') return false;
  if (!column) return true;
  return (error.message ?? '').includes(column);
}
