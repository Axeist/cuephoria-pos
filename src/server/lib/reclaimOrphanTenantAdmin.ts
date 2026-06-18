import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantSignupEmailGateResult =
  | { ok: true }
  | { ok: false; reason: "active_tenant" | "super_admin" | "db_error" };

/**
 * Ensures `normalizedEmail` is free for tenant self-signup:
 * - No `admin_users` row → ok
 * - Orphan row (no org_memberships, not super_admin) → hard-deleted, then ok
 * - Otherwise → blocked (real account still exists)
 */
export async function ensureTenantSignupEmailAvailable(
  supabase: SupabaseClient,
  normalizedEmail: string,
  logLabel = "tenant-signup-email",
): Promise<TenantSignupEmailGateResult> {
  const { data: row, error: selErr } = await supabase
    .from("admin_users")
    .select("id, is_super_admin")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (selErr) {
    console.warn(`${logLabel}: lookup failed`, selErr.message);
    return { ok: false, reason: "db_error" };
  }
  if (!row) return { ok: true };

  if (row.is_super_admin) {
    return { ok: false, reason: "super_admin" };
  }

  const { count, error: memErr } = await supabase
    .from("org_memberships")
    .select("id", { count: "exact", head: true })
    .eq("admin_user_id", row.id);

  if (memErr) {
    console.warn(`${logLabel}: membership count failed`, memErr.message);
    return { ok: false, reason: "db_error" };
  }
  if ((count ?? 0) > 0) {
    return { ok: false, reason: "active_tenant" };
  }

  await supabase.from("cafe_settlements").update({ confirmed_by: null }).eq("confirmed_by", row.id);

  const { error: delErr } = await supabase.from("admin_users").delete().eq("id", row.id);
  if (delErr) {
    console.warn(`${logLabel}: orphan delete failed`, delErr.message);
    return { ok: false, reason: "db_error" };
  }

  console.warn(`${logLabel}: reclaimed orphan admin_user id=${row.id} email=${normalizedEmail}`);
  return { ok: true };
}
