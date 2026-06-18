const STORAGE_KEY = "cuephoria_staff_portal_unlock";

type UnlockRecord = {
  adminUserId: string;
  staffUserId: string;
  unlockedAt: number;
};

export function setStaffPortalUnlocked(adminUserId: string, staffUserId: string): void {
  const record: UnlockRecord = { adminUserId, staffUserId, unlockedAt: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function clearStaffPortalUnlock(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getStaffPortalUnlock(adminUserId: string): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnlockRecord;
    if (parsed.adminUserId !== adminUserId) return null;
    return parsed.staffUserId || null;
  } catch {
    return null;
  }
}
