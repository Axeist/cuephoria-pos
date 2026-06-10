import type { StaffProfile } from '@/types/staff.types';

/** Normalize profile PK — runtime uses user_id; stale types may expose id. */
export function staffProfileId(p: { user_id?: string; id?: string }): string {
  return p.user_id ?? p.id ?? '';
}

export function staffProfileIds(profiles: StaffProfile[]): string[] {
  return profiles.map((p) => staffProfileId(p)).filter(Boolean);
}

export function staffDisplayName(p: StaffProfile): string {
  return p.full_name?.trim() || p.username || p.email || 'Staff';
}

export function staffInitials(p: Pick<StaffProfile, 'username' | 'full_name' | 'email'>): string {
  const base = p.full_name?.trim() || p.username || p.email || '?';
  return base.charAt(0).toUpperCase();
}
