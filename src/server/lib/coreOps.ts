/**
 * Slice 11 — scoped operational table access via service role + RBAC.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../adminApiUtils";
import { assertLocationOwnedByOrg } from "./payment-checkout-guards";
import {
  assertWorkspacePermission,
  type ResolvedWorkspaceAccess,
} from "./workspacePermissions";
import { isDenied } from "./resultGuards";

export const CORE_OPS_TABLES = [
  "products",
  "bills",
  "bill_items",
  "stations",
  "sessions",
  "categories",
  "customers",
  "bookings",
  "expenses",
  "invoices",
] as const;

export type CoreOpTable = (typeof CORE_OPS_TABLES)[number];
export type CoreOpAction = "select" | "insert" | "update" | "delete";

export type CoreOpFilter =
  | { op: "eq"; column: string; value: unknown }
  | { op: "neq"; column: string; value: unknown }
  | { op: "in"; column: string; values: unknown[] }
  | { op: "gte"; column: string; value: unknown }
  | { op: "lte"; column: string; value: unknown }
  | { op: "is"; column: string; value: null }
  | { op: "or"; expression: string };

export type CoreOpsPayload = {
  table: CoreOpTable;
  action: CoreOpAction;
  locationId?: string;
  /** Multi-location reads within the workspace (requires scope.all_branches or bypass). */
  orgWide?: boolean;
  select?: string;
  filters?: CoreOpFilter[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  range?: [number, number];
  row?: Record<string, unknown>;
  rows?: Record<string, unknown>[];
  single?: boolean;
  maybeSingle?: boolean;
};

const LOCATION_SCOPED = new Set<CoreOpTable>(CORE_OPS_TABLES);

/** Permission keys — first match wins; arrays mean any-of. */
const TABLE_ACTION_PERMS: Record<CoreOpTable, Record<CoreOpAction, string | string[]>> = {
  products: {
    select: ["products.view", "pos.view"],
    insert: "products.create",
    update: ["products.edit", "products.stock_adjust", "pos.checkout"],
    delete: "products.delete",
  },
  bills: {
    select: ["reports.bills", "pos.view", "reports.view"],
    insert: "pos.checkout",
    update: ["pos.checkout", "pos.void_bill"],
    delete: ["reports.delete_record", "pos.void_bill"],
  },
  bill_items: {
    select: ["reports.bills", "pos.view", "reports.view"],
    insert: "pos.checkout",
    update: "pos.checkout",
    delete: "pos.checkout",
  },
  stations: {
    select: "stations.view",
    insert: "stations.configure",
    update: ["stations.configure", "stations.start_session", "stations.end_session", "stations.pause"],
    delete: "stations.configure",
  },
  sessions: {
    select: ["reports.sessions", "stations.view", "reports.view"],
    insert: "stations.start_session",
    update: ["stations.start_session", "stations.end_session", "stations.pause"],
    delete: "reports.delete_record",
  },
  categories: {
    select: "products.view",
    insert: "products.create",
    update: "products.edit",
    delete: "products.delete",
  },
  customers: {
    select: ["customers.view", "pos.view"],
    insert: "customers.create",
    update: ["customers.edit", "pos.checkout"],
    delete: "customers.delete",
  },
  bookings: {
    select: "bookings.view",
    insert: "bookings.create",
    update: "bookings.edit",
    delete: "bookings.cancel",
  },
  expenses: {
    select: "dashboard.expenses.view",
    insert: "dashboard.expenses.edit",
    update: "dashboard.expenses.edit",
    delete: "dashboard.expenses.delete",
  },
  invoices: {
    select: ["reports.bills", "reports.view"],
    insert: "pos.checkout",
    update: "pos.checkout",
    delete: "reports.delete_record",
  },
};

function supabaseAdmin(): SupabaseClient {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Missing Supabase server credentials");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-core-ops" } },
  });
}

export function assertCoreOpPermission(
  access: ResolvedWorkspaceAccess,
  table: CoreOpTable,
  action: CoreOpAction,
): { ok: true } | { ok: false; error: string } {
  const keys = TABLE_ACTION_PERMS[table][action];
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    const gate = assertWorkspacePermission(access, key);
    if (!isDenied(gate)) return { ok: true };
  }
  return { ok: false, error: "You do not have permission for this action." };
}

function applyFilters<Q extends { eq: Function; neq: Function; in: Function; gte: Function; lte: Function; is: Function; or: Function }>(
  query: Q,
  filters: CoreOpFilter[] | undefined,
): Q {
  if (!filters?.length) return query;
  let q = query;
  for (const f of filters) {
    switch (f.op) {
      case "eq":
        q = q.eq(f.column, f.value) as Q;
        break;
      case "neq":
        q = q.neq(f.column, f.value) as Q;
        break;
      case "in":
        q = q.in(f.column, f.values) as Q;
        break;
      case "gte":
        q = q.gte(f.column, f.value) as Q;
        break;
      case "lte":
        q = q.lte(f.column, f.value) as Q;
        break;
      case "is":
        q = q.is(f.column, f.value) as Q;
        break;
      case "or":
        q = q.or(f.expression) as Q;
        break;
      default:
        break;
    }
  }
  return q;
}

async function scopeQueryToLocations(
  supabase: SupabaseClient,
  query: ReturnType<SupabaseClient["from"]>,
  table: CoreOpTable,
  organizationId: string,
  locationId: string | undefined,
  orgWide: boolean,
  access: ResolvedWorkspaceAccess,
): Promise<
  | { ok: true; query: ReturnType<SupabaseClient["from"]> }
  | { ok: false; error: string; status: number }
> {
  if (!LOCATION_SCOPED.has(table)) {
    return { ok: true, query };
  }

  if (locationId) {
    const owned = await assertLocationOwnedByOrg(supabase, locationId, organizationId);
    if (isDenied(owned)) {
      return { ok: false, error: owned.message, status: 404 };
    }
    return { ok: true, query: query.eq("location_id", locationId) };
  }

  if (orgWide) {
    if (!access.bypass && !access.permissions.includes("scope.all_branches")) {
      return { ok: false, error: "Branch scope required.", status: 403 };
    }
    const { data, error } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message, status: 500 };
    const ids = (data ?? []).map((r) => String((r as { id: string }).id));
    if (ids.length === 0) {
      return { ok: false, error: "No branches in this workspace.", status: 404 };
    }
    return { ok: true, query: query.in("location_id", ids) };
  }

  return { ok: false, error: "Missing locationId", status: 400 };
}

function injectLocationOnWrite(
  table: CoreOpTable,
  locationId: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (!LOCATION_SCOPED.has(table)) return row;
  return { ...row, location_id: row.location_id ?? locationId };
}

export type CoreOpResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; status: number };

export async function executeCoreOp(
  payload: CoreOpsPayload,
  ctx: { organizationId: string; access: ResolvedWorkspaceAccess },
): Promise<CoreOpResult> {
  const table = payload.table;
  const action = payload.action;

  if (!CORE_OPS_TABLES.includes(table)) {
    return { ok: false, error: "Table not allowed", status: 400 };
  }

  const perm = assertCoreOpPermission(ctx.access, table, action);
  if (isDenied(perm)) return { ok: false, error: perm.error, status: 403 };

  const locationId =
    typeof payload.locationId === "string" && payload.locationId.trim()
      ? payload.locationId.trim()
      : undefined;
  const orgWide = payload.orgWide === true;

  if (LOCATION_SCOPED.has(table) && !locationId && !orgWide) {
    return { ok: false, error: "Missing locationId", status: 400 };
  }

  const supabase = supabaseAdmin();
  let query = supabase.from(table);
  const scoped = await scopeQueryToLocations(
    supabase,
    query,
    table,
    ctx.organizationId,
    locationId,
    orgWide,
    ctx.access,
  );
  if (!scoped.ok) return scoped;
  query = scoped.query;

  const filters = payload.filters;
  const selectStr = payload.select ?? "*";

  try {
    if (action === "select") {
      let q = applyFilters(query.select(selectStr), filters);
      if (payload.order?.column) {
        q = q.order(payload.order.column, {
          ascending: payload.order.ascending ?? true,
        });
      }
      if (payload.limit != null) q = q.limit(payload.limit);
      if (payload.range) q = q.range(payload.range[0], payload.range[1]);

      if (payload.single) {
        const { data, error } = await q.single();
        if (error) return { ok: false, error: error.message, status: 500 };
        return { ok: true, data };
      }
      if (payload.maybeSingle) {
        const { data, error } = await q.maybeSingle();
        if (error) return { ok: false, error: error.message, status: 500 };
        return { ok: true, data };
      }
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message, status: 500 };
      return { ok: true, data };
    }

    if (action === "insert") {
      const rows = payload.rows?.length
        ? payload.rows
        : payload.row
          ? [payload.row]
          : [];
      if (rows.length === 0) {
        return { ok: false, error: "Missing row or rows", status: 400 };
      }
      if (!locationId) {
        return { ok: false, error: "Missing locationId for insert", status: 400 };
      }
      const owned = await assertLocationOwnedByOrg(supabase, locationId, ctx.organizationId);
      if (isDenied(owned)) return { ok: false, error: owned.message, status: 404 };

      const prepared = rows.map((r) => injectLocationOnWrite(table, locationId, r));
      let q = query.insert(prepared);
      if (payload.select) q = q.select(payload.select);
      if (payload.single) {
        const { data, error } = await q.single();
        if (error) return { ok: false, error: error.message, status: 500 };
        return { ok: true, data };
      }
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message, status: 500 };
      return { ok: true, data };
    }

    if (action === "update") {
      if (!payload.row || typeof payload.row !== "object") {
        return { ok: false, error: "Missing row for update", status: 400 };
      }
      let q = applyFilters(query.update(payload.row), filters);
      if (payload.select) q = q.select(payload.select);
      if (payload.single) {
        const { data, error } = await q.single();
        if (error) return { ok: false, error: error.message, status: 500 };
        return { ok: true, data };
      }
      const { data, error } = await q.select();
      if (error) return { ok: false, error: error.message, status: 500 };
      return { ok: true, data };
    }

    if (action === "delete") {
      let q = applyFilters(query.delete(), filters);
      if (payload.select) q = q.select(payload.select);
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message, status: 500 };
      return { ok: true, data };
    }

    return { ok: false, error: "Unknown action", status: 400 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message, status: 500 };
  }
}
