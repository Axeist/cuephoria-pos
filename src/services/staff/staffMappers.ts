import type { StaffProfile } from '@/types/staff.types';

export type StaffNameFields = Pick<StaffProfile, 'username' | 'full_name' | 'email'> & {
  staff_name?: string | null;
};

/** Normalize profile PK — runtime uses user_id; stale types may expose id. */
export function staffProfileId(p: { user_id?: string; id?: string }): string {
  return p.user_id ?? p.id ?? '';
}

export function staffProfileIds(profiles: StaffProfile[]): string[] {
  return profiles.map((p) => staffProfileId(p)).filter(Boolean);
}

/** Primary label: full name, then legacy staff_name, then username. */
export function staffDisplayName(p: StaffNameFields): string {
  return p.full_name?.trim() || p.staff_name?.trim() || p.username?.trim() || p.email?.trim() || 'Staff';
}

/** Username shown beneath full name when it differs from the primary label. */
export function staffSecondaryUsername(p: StaffNameFields): string | null {
  const primary = staffDisplayName(p);
  const user = p.username?.trim();
  if (!user || user === primary) return null;
  return user;
}

export function staffInitials(p: StaffNameFields): string {
  const base = staffDisplayName(p);
  return base.charAt(0).toUpperCase();
}

/** Select / list option: "Full Name · username" or designation suffix. */
export function staffOptionLabel(
  p: StaffNameFields & { designation?: string | null },
  opts?: { withDesignation?: boolean },
): string {
  const name = staffDisplayName(p);
  const user = staffSecondaryUsername(p);
  let label = user ? `${name} · ${user}` : name;
  if (opts?.withDesignation && p.designation?.trim()) {
    label += ` — ${p.designation.trim()}`;
  }
  return label;
}
