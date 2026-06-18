import { j } from "../../adminApiUtils";
import { withOrgContext, type OrgContext } from "../../orgContext";

export const config = { runtime: "edge" };

type BootstrapStation = {
  name?: string;
  type?: string;
  category?: "regular" | "nit_event";
  hourlyRate?: number;
};

type BootstrapProduct = {
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
};

const MAX_CATEGORIES = 24;
const MAX_STATIONS = 24;
const MAX_PRODUCTS = 24;

function normalizeName(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function normalizeCategory(value: unknown): string {
  const raw = normalizeName(value, 60).toLowerCase();
  return raw.replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
}

function makeCustomerCode(): string {
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  return `CUE${suffix}`;
}

function normalizeCustomerPhone(value: unknown): string {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return "";
}

async function handler(req: Request, ctx: OrgContext): Promise<Response> {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return j({ ok: false, error: "Only owners and admins can bootstrap onboarding data." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return j({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const incomingCategories = Array.isArray(body.categories) ? body.categories : [];
  const incomingStations = Array.isArray(body.stations) ? body.stations : [];
  const incomingProducts = Array.isArray(body.products) ? body.products : [];
  const firstCustomerName = normalizeName(body.firstCustomerName, 120);
  const firstCustomerPhone = normalizeCustomerPhone(body.firstCustomerPhone);

  const categories = [...new Set(incomingCategories.map((v) => normalizeCategory(v)).filter(Boolean))]
    .slice(0, MAX_CATEGORIES);
  if (!categories.includes("uncategorized")) categories.push("uncategorized");

  const stations = incomingStations
    .map((row) => row as BootstrapStation)
    .map((row) => {
      const name = normalizeName(row.name, 80);
      if (!name) return null;
      const type = normalizeCategory(row.type) || "ps5";
      const category = row.category === "nit_event" ? "nit_event" : "regular";
      const parsedRate = Number(row.hourlyRate);
      const hourlyRate = Number.isFinite(parsedRate) ? Math.max(10, Math.min(5000, parsedRate)) : 120;
      return { name, type, category, hourlyRate };
    })
    .filter((v): v is { name: string; type: string; category: "regular" | "nit_event"; hourlyRate: number } => !!v)
    .slice(0, MAX_STATIONS);

  const products = incomingProducts
    .map((row) => row as BootstrapProduct)
    .map((row) => {
      const name = normalizeName(row.name, 120);
      if (!name) return null;
      const category = normalizeCategory(row.category) || "uncategorized";
      const parsedPrice = Number(row.price);
      const parsedStock = Number(row.stock);
      return {
        name,
        category,
        price: Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : 0,
        stock: Number.isFinite(parsedStock) ? Math.max(0, Math.round(parsedStock)) : 0,
      };
    })
    .filter((v): v is { name: string; category: string; price: number; stock: number } => !!v)
    .slice(0, MAX_PRODUCTS);

  const { data: locationRow, error: locationErr } = await ctx.supabase
    .from("locations")
    .select("id")
    .eq("organization_id", ctx.organizationId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (locationErr || !locationRow?.id) {
    return j({ ok: false, error: locationErr?.message || "No active location found." }, 400);
  }

  const locationId = locationRow.id;
  let createdCategories = 0;
  let createdStations = 0;
  let createdProducts = 0;
  let createdCustomers = 0;

  if (categories.length) {
    const { data: existingCategories } = await ctx.supabase
      .from("categories")
      .select("name")
      .eq("location_id", locationId);
    const existing = new Set((existingCategories ?? []).map((r) => String(r.name).toLowerCase()));
    const rows = categories
      .filter((name) => !existing.has(name))
      .map((name) => ({ name, location_id: locationId, organization_id: ctx.organizationId }));
    if (rows.length) {
      const { error: categoriesErr } = await ctx.supabase.from("categories").insert(rows);
      if (categoriesErr) {
        if (
          categoriesErr.code === "23505" &&
          String(categoriesErr.message || "").toLowerCase().includes("categories_name_key")
        ) {
          return j(
            {
              ok: false,
              error:
                "Category setup failed because your database still uses global category uniqueness. Apply latest migrations and retry onboarding.",
            },
            409,
          );
        }
        return j({ ok: false, error: categoriesErr.message }, 500);
      }
      createdCategories = rows.length;
    }
  }

  if (stations.length) {
    const { data: existingStations } = await ctx.supabase
      .from("stations")
      .select("name")
      .eq("location_id", locationId);
    const existing = new Set((existingStations ?? []).map((r) => String(r.name).toLowerCase()));
    const rows = stations
      .filter((s) => !existing.has(s.name.toLowerCase()))
      .map((s) => ({
        id: crypto.randomUUID(),
        name: s.name,
        type: s.type,
        hourly_rate: s.hourlyRate,
        is_occupied: false,
        category: s.category === "nit_event" ? "nit_event" : null,
        event_enabled: s.category !== "nit_event",
        slot_duration: s.type === "vr" ? 15 : s.category === "nit_event" ? 30 : 60,
        location_id: locationId,
        organization_id: ctx.organizationId,
      }));
    if (rows.length) {
      const { error: stationErr } = await ctx.supabase.from("stations").insert(rows);
      if (stationErr) return j({ ok: false, error: stationErr.message }, 500);
      createdStations = rows.length;
    }
  }

  if (products.length) {
    const { data: existingProducts } = await ctx.supabase
      .from("products")
      .select("name")
      .eq("location_id", locationId);
    const existing = new Set((existingProducts ?? []).map((r) => String(r.name).toLowerCase()));
    const rows = products
      .filter((p) => !existing.has(p.name.toLowerCase()))
      .map((p) => ({
        id: crypto.randomUUID(),
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        location_id: locationId,
        organization_id: ctx.organizationId,
      }));
    if (rows.length) {
      const { error: productsErr } = await ctx.supabase.from("products").insert(rows);
      if (productsErr) return j({ ok: false, error: productsErr.message }, 500);
      createdProducts = rows.length;
    }
  }

  if (firstCustomerName && firstCustomerPhone) {
    const { data: existingCustomer } = await ctx.supabase
      .from("customers")
      .select("id")
      .eq("location_id", locationId)
      .eq("phone", firstCustomerPhone)
      .maybeSingle();

    if (!existingCustomer) {
      const customerCode = makeCustomerCode();
      const { error: customerErr } = await ctx.supabase.from("customers").insert({
        name: firstCustomerName,
        phone: firstCustomerPhone,
        custom_id: customerCode,
        customer_id: customerCode,
        is_member: false,
        loyalty_points: 0,
        total_spent: 0,
        total_play_time: 0,
        location_id: locationId,
        organization_id: ctx.organizationId,
      });
      if (customerErr) return j({ ok: false, error: customerErr.message }, 500);
      createdCustomers = 1;
    }
  }

  await ctx.supabase.from("audit_log").insert({
    actor_type: "admin_user",
    actor_id: ctx.user.id,
    actor_label: ctx.user.username,
    organization_id: ctx.organizationId,
    action: "organization.onboarding.bootstrap",
    target_type: "organization",
    target_id: ctx.organizationId,
    meta: {
      created_categories: createdCategories,
      created_stations: createdStations,
      created_products: createdProducts,
      created_customers: createdCustomers,
    },
  });

  return j(
    {
      ok: true,
      created: {
        categories: createdCategories,
        stations: createdStations,
        products: createdProducts,
        customers: createdCustomers,
      },
    },
    200,
  );
}

export default withOrgContext(handler);
