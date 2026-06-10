import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePortalPin } from "./staffPortalPin";

export type StaffProfileRow = Record<string, unknown> & {
  user_id: string;
  username: string;
  full_name: string | null;
  designation: string;
  email: string | null;
  portal_pin: string | null;
  admin_user_id: string;
  location_id: string;
};

function deriveStaffUsername(base: string, attempt: number): string {
  const cleaned = base.trim().slice(0, 80) || "staff";
  return attempt === 0 ? cleaned : `${cleaned}-${attempt}`;
}

async function pickUniqueUsername(
  supabase: SupabaseClient,
  base: string,
  organizationId?: string | null,
): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = deriveStaffUsername(base, i);
    let q = supabase.from("staff_profiles").select("user_id").eq("username", candidate);
    if (organizationId) {
      q = q.eq("organization_id", organizationId);
    }
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

export async function createStaffProfileForLoginUser(
  supabase: SupabaseClient,
  opts: {
    adminUserId: string;
    email: string;
    loginUsername: string;
    displayName: string;
    designation: string;
    locationId: string;
    portalPin?: string;
  },
): Promise<{ profile: StaffProfileRow; portalPin: string } | { error: string }> {
  const portalPin = opts.portalPin ?? generatePortalPin();
  const fullName = opts.displayName.trim() || opts.loginUsername.trim();
  const designation = opts.designation.trim() || "Staff";
  const usernameBase = opts.loginUsername.trim() || opts.email.split("@")[0] || "staff";
  let organizationId: string | null = null;
  const { data: locRow } = await supabase
    .from("locations")
    .select("organization_id")
    .eq("id", opts.locationId)
    .maybeSingle();
  organizationId = locRow?.organization_id ?? null;

  const username = await pickUniqueUsername(supabase, usernameBase, organizationId);

  const record = {
    admin_user_id: opts.adminUserId,
    portal_pin: portalPin,
    username,
    full_name: fullName,
    designation,
    email: opts.email.trim().toLowerCase(),
    phone: null,
    monthly_salary: 0,
    hourly_rate: 0,
    default_shift_hours: 12,
    shift_start_time: "11:00:00",
    shift_end_time: "23:00:00",
    joining_date: new Date().toISOString().slice(0, 10),
    role: "staff",
    is_active: true,
    location_id: opts.locationId,
    organization_id: organizationId,
  };

  const { data, error } = await supabase
    .from("staff_profiles")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  const profile = data as StaffProfileRow;
  const scheduleRows = Array.from({ length: 7 }, (_, day) => ({
    staff_id: profile.user_id,
    day_of_week: day,
    shift_start: record.shift_start_time,
    shift_end: record.shift_end_time,
    is_active: true,
    location_id: opts.locationId,
  }));
  await supabase.from("staff_work_schedules").insert(scheduleRows);

  return { profile, portalPin };
}

export async function syncStaffProfileFromAdminUser(
  supabase: SupabaseClient,
  adminUserId: string,
  fields: { displayName?: string | null; designation?: string | null; email?: string | null },
): Promise<void> {
  const update: Record<string, string | null> = {};
  if (typeof fields.displayName === "string") {
    const v = fields.displayName.trim();
    update.full_name = v.length ? v : null;
  }
  if (typeof fields.designation === "string") {
    const v = fields.designation.trim();
    update.designation = v.length ? v : "Staff";
  }
  if (typeof fields.email === "string" && fields.email.trim()) {
    update.email = fields.email.trim().toLowerCase();
  }
  if (Object.keys(update).length === 0) return;

  await supabase.from("staff_profiles").update(update).eq("admin_user_id", adminUserId);
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeStaffEmail(raw: unknown, username: string): string | null {
  const explicit = typeof raw === "string" ? raw.trim() : "";
  const candidate = explicit || username.trim();
  if (!candidate.includes("@")) return null;
  const lower = candidate.toLowerCase();
  return SIMPLE_EMAIL.test(lower) ? lower : null;
}

/** Creates a staff_profiles row + portal PIN when missing (staff accounts only). */
export async function ensureStaffProfileForLoginUser(
  supabase: SupabaseClient,
  opts: {
    adminUserId: string;
    organizationId: string;
    locationId?: string | null;
  },
): Promise<{ portalPin: string; created: boolean } | { error: string }> {
  const { data: existing } = await supabase
    .from("staff_profiles")
    .select("portal_pin")
    .eq("admin_user_id", opts.adminUserId)
    .maybeSingle();

  if (existing?.portal_pin) {
    return { portalPin: String(existing.portal_pin), created: false };
  }

  const { data: adminUser, error: auErr } = await supabase
    .from("admin_users")
    .select("username, email, display_name, designation, is_admin, is_super_admin")
    .eq("id", opts.adminUserId)
    .maybeSingle();
  if (auErr || !adminUser) return { error: auErr?.message ?? "User not found." };
  if (adminUser.is_admin || adminUser.is_super_admin) {
    return { error: "Set role to Staff to create a portal PIN." };
  }

  let locationId = opts.locationId ?? null;
  if (!locationId) {
    const { data: link } = await supabase
      .from("admin_user_locations")
      .select("location_id")
      .eq("admin_user_id", opts.adminUserId)
      .limit(1)
      .maybeSingle();
    locationId = link?.location_id ?? null;
  }
  if (!locationId) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", opts.organizationId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    locationId = loc?.id ?? null;
  }
  if (!locationId) {
    return { error: "Assign at least one branch before creating a portal PIN." };
  }

  const email = normalizeStaffEmail(adminUser.email, adminUser.username);
  if (!email) return { error: "User needs a valid email before creating a portal PIN." };

  const created = await createStaffProfileForLoginUser(supabase, {
    adminUserId: opts.adminUserId,
    email,
    loginUsername: adminUser.username,
    displayName: String(adminUser.display_name || adminUser.username),
    designation: String(adminUser.designation || "Staff"),
    locationId,
  });
  if ("error" in created) return created;
  return { portalPin: created.portalPin, created: true };
}

export async function regenerateStaffPortalPin(
  supabase: SupabaseClient,
  adminUserId: string,
): Promise<{ portalPin: string } | { error: string }> {
  const portalPin = generatePortalPin();
  const { data, error } = await supabase
    .from("staff_profiles")
    .update({ portal_pin: portalPin })
    .eq("admin_user_id", adminUserId)
    .select("portal_pin")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data?.portal_pin) return { error: "No staff profile linked to this account." };
  return { portalPin: String(data.portal_pin) };
}
