/** Detect Supabase errors when backdoor migration has not been applied yet. */
export function isBackdoorSchemaMissing(error: { message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    (msg.includes("workspace_backdoor_access") && msg.includes("does not exist")) ||
    (msg.includes("is_platform_backdoor") && msg.includes("does not exist"))
  );
}

export const BACKDOOR_MIGRATION_FILE =
  "supabase/migrations/20260630120000_workspace_backdoor_access.sql";

export const BACKDOOR_MIGRATION_HINT =
  "Apply migration 20260630120000_workspace_backdoor_access.sql in the Supabase SQL editor (Dashboard → SQL → New query), then refresh this page.";
