const STORAGE_KEY = "cuephoria_staff_portal_unlock";

type UnlockRecord = {
  adminUserId: string;
  staffUserId: string;
  portalSessionToken?: string;
  profile?: Record<string, unknown>;
  unlockedAt: number;
};

export function setStaffPortalUnlocked(
  adminUserId: string,
  staffUserId: string,
  portalSessionToken?: string,
  profile?: Record<string, unknown>,
): void {
  const record: UnlockRecord = {
    adminUserId,
    staffUserId,
    portalSessionToken,
    profile,
    unlockedAt: Date.now(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function clearStaffPortalUnlock(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getStaffPortalUnlock(adminUserId: string): {
  staffUserId: string;
  portalSessionToken: string | null;
  profile: Record<string, unknown> | null;
} | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnlockRecord;
    if (parsed.adminUserId !== adminUserId) return null;
    if (!parsed.staffUserId) return null;
    return {
      staffUserId: parsed.staffUserId,
      portalSessionToken: parsed.portalSessionToken ?? null,
      profile: parsed.profile ?? null,
    };
  } catch {
    return null;
  }
}

export function getStaffPortalSessionToken(adminUserId: string): string | null {
  return getStaffPortalUnlock(adminUserId)?.portalSessionToken ?? null;
}
