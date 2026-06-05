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
): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = deriveStaffUsername(base, i);
    const { data } = await supabase
      .from("staff_profiles")
      .select("user_id")
      .eq("username", candidate)
      .maybeSingle();
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
  const username = await pickUniqueUsername(supabase, usernameBase);

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
  };

  const { data, error } = await supabase
    .from("staff_profiles")
    .insert(record)
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { profile: data as StaffProfileRow, portalPin };
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
