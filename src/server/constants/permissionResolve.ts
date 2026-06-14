/**
 * Legacy RBAC keys (settings.tournaments.*) ↔ granular tournaments.* keys.
 * Keeps existing role assignments working during soak.
 */

export const LEGACY_PERMISSION_GRANTS: Record<string, string[]> = {
  'tournaments.view': ['settings.tournaments.view'],
  'tournaments.create': ['settings.tournaments.manage'],
  'tournaments.edit': ['settings.tournaments.manage'],
  'tournaments.results': ['settings.tournaments.manage'],
  'tournaments.complete': ['settings.tournaments.manage'],
  'tournaments.delete': ['settings.tournaments.manage'],
  'tournaments.gallery': ['settings.tournaments.manage'],
  'tournaments.leaderboard.reset': ['settings.leaderboard.reset'],
};

export const LEGACY_KEY_EXPANSION: Record<string, string[]> = {
  'settings.tournaments.view': ['tournaments.view'],
  'settings.tournaments.manage': [
    'tournaments.create',
    'tournaments.edit',
    'tournaments.results',
    'tournaments.complete',
    'tournaments.delete',
    'tournaments.gallery',
  ],
  'settings.leaderboard.reset': ['tournaments.leaderboard.reset'],
};

export function hasWorkspacePermission(permissions: Iterable<string>, key: string): boolean {
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  if (set.has(key)) return true;

  const legacyForNew = LEGACY_PERMISSION_GRANTS[key];
  if (legacyForNew?.some((legacy) => set.has(legacy))) return true;

  const newForLegacy = LEGACY_KEY_EXPANSION[key];
  if (newForLegacy?.some((granular) => set.has(granular))) return true;

  return false;
}

/** Any write access to tournaments (create, edit, results, etc.). */
export function canOperateTournaments(check: (key: string) => boolean): boolean {
  return (
    check('tournaments.create') ||
    check('tournaments.edit') ||
    check('tournaments.results') ||
    check('tournaments.complete') ||
    check('tournaments.delete') ||
    check('tournaments.gallery') ||
    check('settings.tournaments.manage')
  );
}
