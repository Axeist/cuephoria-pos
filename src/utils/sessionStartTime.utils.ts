/** Format for `<input type="datetime-local" />` (local timezone). */
export function toDatetimeLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseCustomSessionStartTime(
  input: string,
  now = new Date()
): { ok: true; date: Date } | { ok: false; message: string } {
  if (!input.trim()) {
    return { ok: false, message: 'Pick a start date and time.' };
  }

  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime())) {
    return { ok: false, message: 'Invalid start time.' };
  }

  if (parsed.getTime() > now.getTime()) {
    return { ok: false, message: 'Start time must be in the past (before now).' };
  }

  return { ok: true, date: parsed };
}

export function formatElapsedSinceStart(start: Date, now = new Date()): string {
  const ms = Math.max(0, now.getTime() - start.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
}
