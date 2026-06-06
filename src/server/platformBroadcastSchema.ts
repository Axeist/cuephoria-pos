/** Detect Supabase errors when platform broadcast migration has not been applied yet. */
export function isPlatformBroadcastSchemaMissing(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  const code = (error?.code ?? "").toUpperCase();

  if (code === "42P01" && msg.includes("platform_broadcasts")) return true;
  if (msg.includes("platform_broadcasts") && msg.includes("does not exist")) return true;
  if (msg.includes("could not find the table") && msg.includes("platform_broadcasts")) return true;

  if (
    msg.includes("staff_notifications_kind_check") ||
    (msg.includes("staff_notifications") && msg.includes("kind") && msg.includes("check"))
  ) {
    return true;
  }

  return false;
}

export const PLATFORM_BROADCAST_MIGRATION_FILE =
  "supabase/migrations/20260808120000_platform_broadcast_notifications.sql";

export const PLATFORM_BROADCAST_MIGRATION_HINT =
  "Apply migration 20260808120000_platform_broadcast_notifications.sql in the Supabase SQL editor (Dashboard → SQL → New query), then refresh this page.";
