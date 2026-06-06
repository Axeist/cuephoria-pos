/** Postgres undefined_column or PostgREST schema-cache column miss */
export function isMissingColumnError(
  error: { code?: string; message?: string } | null | undefined,
  column?: string
): boolean {
  if (!error) return false;

  const message = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';

  const isColumnError =
    code === '42703' ||
    code === 'PGRST204' ||
    (message.includes('does not exist') && message.includes('column')) ||
    (message.includes('schema cache') && message.includes('column'));

  if (!isColumnError) return false;
  if (!column) return true;
  return message.includes(column.toLowerCase());
}

/** Extract column name from Postgres / PostgREST missing-column messages */
export function parseMissingColumnName(
  error: { message?: string } | null | undefined
): string | null {
  if (!error?.message) return null;

  let match = error.message.match(/column\s+(?:[\w.]+\.)?(\w+)\s+does not exist/i);
  if (match) return match[1];

  match = error.message.match(/could not find the ['"](\w+)['"] column/i);
  if (match) return match[1];

  return null;
}

export function stripColumnFromSelect(select: string, column: string): string {
  return select
    .split(',')
    .map((field) => field.trim())
    .filter((field) => field !== column)
    .join(',');
}
