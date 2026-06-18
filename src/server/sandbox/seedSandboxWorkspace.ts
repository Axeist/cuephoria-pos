/**
 * Seed a demo sandbox workspace with Pro-shaped sample data.
 * Idempotent — skips when organizations.sandbox_seeded_at is already set.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { hashPassword } from "../passwordUtils.js";
import { createStaffProfileForLoginUser } from "../staffProfileSync.js";

const DEMO_STATIONS = [
  { name: "PS5 Alpha", type: "ps5", hourlyRate: 150 },
  { name: "PS5 Beta", type: "ps5", hourlyRate: 150 },
  { name: "Xbox Series X", type: "xbox", hourlyRate: 140 },
  { name: "PC Rig 1", type: "pc", hourlyRate: 120 },
  { name: "PC Rig 2", type: "pc", hourlyRate: 120 },
  { name: "VR Pod", type: "vr", hourlyRate: 200 },
  { name: "Pool Table", type: "pool", hourlyRate: 100 },
  { name: "Snooker Table", type: "snooker", hourlyRate: 110 },
];

const DEMO_PRODUCTS = [
  { name: "Cold Coffee", category: "beverages", price: 120, stock: 50 },
  { name: "French Fries", category: "snacks", price: 90, stock: 40 },
  { name: "Veg Burger", category: "snacks", price: 150, stock: 30 },
  { name: "Energy Drink", category: "beverages", price: 80, stock: 60 },
  { name: "Nachos", category: "snacks", price: 110, stock: 35 },
  { name: "1hr PS5 Pass", category: "gaming", price: 150, stock: 999 },
];

const DEMO_CUSTOMERS = [
  { name: "Arjun Mehta", phone: "9876543210" },
  { name: "Priya Sharma", phone: "9876543211" },
  { name: "Rahul Verma", phone: "9876543212" },
  { name: "Sneha Patel", phone: "9876543213" },
  { name: "Vikram Singh", phone: "9876543214" },
];

function customerCode(): string {
  return `CUE${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type SeedSandboxResult = {
  seeded: boolean;
  skipped: boolean;
  locationId?: string;
  stationIds?: string[];
  customerIds?: string[];
};

export async function seedSandboxWorkspace(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<SeedSandboxResult> {
  const { data: org } = await supabase
    .from("organizations")
    .select("sandbox_seeded_at, slug")
    .eq("id", organizationId)
    .maybeSingle();

  if (org?.sandbox_seeded_at) {
    return { seeded: false, skipped: true };
  }

  const { data: locationRow } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!locationRow?.id) {
    throw new Error("Sandbox org has no active location.");
  }
  const locationId = locationRow.id;

  const categories = ["beverages", "snacks", "gaming", "uncategorized"];
  const { data: existingCategories } = await supabase
    .from("categories")
    .select("name")
    .eq("location_id", locationId);
  const catExisting = new Set((existingCategories ?? []).map((r) => String(r.name).toLowerCase()));
  const catRows = categories
    .filter((name) => !catExisting.has(name))
    .map((name) => ({ name, location_id: locationId, organization_id: organizationId }));
  if (catRows.length) {
    await supabase.from("categories").insert(catRows);
  }

  const { data: existingStations } = await supabase
    .from("stations")
    .select("name")
    .eq("location_id", locationId);
  const stExisting = new Set((existingStations ?? []).map((r) => String(r.name).toLowerCase()));
  const stationRows = DEMO_STATIONS.filter((s) => !stExisting.has(s.name.toLowerCase())).map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    type: s.type,
    hourly_rate: s.hourlyRate,
    is_occupied: false,
    event_enabled: true,
    slot_duration: s.type === "vr" ? 15 : 60,
    location_id: locationId,
    organization_id: organizationId,
  }));
  if (stationRows.length) {
    await supabase.from("stations").insert(stationRows);
  }

  const { data: allStations } = await supabase
    .from("stations")
    .select("id, name, type, slot_duration")
    .eq("location_id", locationId);
  const stationIds = (allStations ?? []).map((s) => s.id);

  const { data: existingProducts } = await supabase
    .from("products")
    .select("name")
    .eq("location_id", locationId);
  const prodExisting = new Set((existingProducts ?? []).map((r) => String(r.name).toLowerCase()));
  const productRows = DEMO_PRODUCTS.filter((p) => !prodExisting.has(p.name.toLowerCase())).map((p) => ({
    id: crypto.randomUUID(),
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    location_id: locationId,
    organization_id: organizationId,
  }));
  if (productRows.length) {
    await supabase.from("products").insert(productRows);
  }

  const customerIds: string[] = [];
  for (const c of DEMO_CUSTOMERS) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("location_id", locationId)
      .eq("phone", c.phone)
      .maybeSingle();
    if (existing?.id) {
      customerIds.push(existing.id);
      continue;
    }
    const code = customerCode();
    const { data: inserted } = await supabase
      .from("customers")
      .insert({
        name: c.name,
        phone: c.phone,
        custom_id: code,
        customer_id: code,
        is_member: false,
        loyalty_points: Math.floor(Math.random() * 200),
        total_spent: Math.floor(Math.random() * 5000),
        total_play_time: 0,
        location_id: locationId,
        organization_id: organizationId,
      })
      .select("id")
      .single();
    if (inserted?.id) customerIds.push(inserted.id);
  }

  if (stationIds.length >= 2 && customerIds.length >= 2) {
    const ps5 = (allStations ?? []).find((s) => s.type === "ps5");
    const pc = (allStations ?? []).find((s) => s.type === "pc");
    const today = addDays(0);
    const tomorrow = addDays(1);
    const sampleBookings = [
      {
        station_id: ps5?.id ?? stationIds[0],
        customer_id: customerIds[0],
        location_id: locationId,
        organization_id: organizationId,
        booking_date: today,
        start_time: "14:00",
        end_time: "15:00",
        duration: 60,
        status: "confirmed",
        original_price: 150,
        final_price: 150,
        payment_mode: "venue",
        player_count: 1,
      },
      {
        station_id: pc?.id ?? stationIds[1],
        customer_id: customerIds[1],
        location_id: locationId,
        organization_id: organizationId,
        booking_date: tomorrow,
        start_time: "18:00",
        end_time: "19:00",
        duration: 60,
        status: "confirmed",
        original_price: 120,
        final_price: 120,
        payment_mode: "venue",
        player_count: 2,
      },
    ];

    for (const row of sampleBookings) {
      const { data: dup } = await supabase
        .from("bookings")
        .select("id")
        .eq("station_id", row.station_id)
        .eq("booking_date", row.booking_date)
        .eq("start_time", row.start_time)
        .maybeSingle();
      if (!dup) {
        await supabase.from("bookings").insert(row);
      }
    }
  }

  const demoStaffEmail = `staff.demo+${organizationId.slice(0, 8)}@sandbox.cuetronix.app`;
  const { data: existingStaffUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", demoStaffEmail)
    .maybeSingle();

  if (!existingStaffUser?.id) {
    const staffPassword = crypto.randomUUID().slice(0, 12);
    const staffHash = await hashPassword(staffPassword);
    const { data: staffUser } = await supabase
      .from("admin_users")
      .insert({
        username: demoStaffEmail,
        email: demoStaffEmail,
        display_name: "Demo Staff",
        designation: "Floor Staff",
        password_hash: staffHash,
        password_updated_at: new Date().toISOString(),
        is_admin: false,
        is_super_admin: false,
        is_sandbox_user: false,
        email_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (staffUser?.id) {
      await supabase.from("org_memberships").insert({
        organization_id: organizationId,
        admin_user_id: staffUser.id,
        role: "staff",
      });
      await supabase.from("admin_user_locations").insert({
        admin_user_id: staffUser.id,
        location_id: locationId,
      });
      await createStaffProfileForLoginUser(supabase, {
        adminUserId: staffUser.id,
        email: demoStaffEmail,
        loginUsername: demoStaffEmail,
        displayName: "Demo Staff",
        designation: "Floor Staff",
        locationId,
        portalPin: "1234",
      });
    }
  }

  await supabase
    .from("organizations")
    .update({ sandbox_seeded_at: new Date().toISOString() })
    .eq("id", organizationId);

  return {
    seeded: true,
    skipped: false,
    locationId,
    stationIds,
    customerIds,
  };
}
