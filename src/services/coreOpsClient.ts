/**
 * Browser client for /api/admin/ops (Slice 11 scoped table proxy).
 */

import { adminFetch } from "@/services/adminFetch";
import type {
  CoreOpAction,
  CoreOpFilter,
  CoreOpTable,
  CoreOpsPayload,
} from "@/server/lib/coreOps";

export type { CoreOpFilter, CoreOpTable, CoreOpsPayload };

export type CoreOpsError = { message: string };

export async function coreOpsQuery<T = unknown>(
  payload: CoreOpsPayload,
): Promise<{ data: T | null; error: CoreOpsError | null }> {
  const res = await adminFetch("/api/admin/ops", {
    method: "POST",
    body: JSON.stringify({ op: "query", args: payload }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    return { data: null, error: { message: json.error || `Core ops failed (${res.status})` } };
  }
  return { data: (json.data ?? null) as T | null, error: null };
}

type SelectOpts = {
  filters?: CoreOpFilter[];
  order?: CoreOpsPayload["order"];
  limit?: number;
  range?: [number, number];
  orgWide?: boolean;
};

type WriteOpts = {
  filters?: CoreOpFilter[];
  select?: string;
  single?: boolean;
  maybeSingle?: boolean;
};

/** Fluent builder for common scoped-table patterns. */
export function scopedTable(table: CoreOpTable, locationId: string) {
  const loc = locationId;

  return {
    select(select: string, opts?: SelectOpts & { single?: boolean; maybeSingle?: boolean }) {
      return coreOpsQuery({
        table,
        action: "select",
        locationId: opts?.orgWide ? undefined : loc,
        orgWide: opts?.orgWide,
        select,
        filters: opts?.filters,
        order: opts?.order,
        limit: opts?.limit,
        range: opts?.range,
        single: opts?.single,
        maybeSingle: opts?.maybeSingle,
      });
    },

    insert(row: Record<string, unknown>, opts?: Pick<WriteOpts, "select" | "single">) {
      return coreOpsQuery({
        table,
        action: "insert",
        locationId: loc,
        row,
        select: opts?.select,
        single: opts?.single,
      });
    },

    insertMany(rows: Record<string, unknown>[]) {
      return coreOpsQuery({
        table,
        action: "insert",
        locationId: loc,
        rows,
      });
    },

    update(row: Record<string, unknown>, opts?: WriteOpts) {
      return coreOpsQuery({
        table,
        action: "update",
        locationId: loc,
        row,
        filters: opts?.filters,
        select: opts?.select,
        single: opts?.single,
      });
    },

    delete(opts?: WriteOpts) {
      return coreOpsQuery({
        table,
        action: "delete",
        locationId: loc,
        filters: opts?.filters,
        select: opts?.select,
      });
    },
  };
}

/** Shorthand filter helpers */
export const f = {
  eq: (column: string, value: unknown): CoreOpFilter => ({ op: "eq", column, value }),
  neq: (column: string, value: unknown): CoreOpFilter => ({ op: "neq", column, value }),
  in: (column: string, values: unknown[]): CoreOpFilter => ({ op: "in", column, values }),
  gte: (column: string, value: unknown): CoreOpFilter => ({ op: "gte", column, value }),
  lte: (column: string, value: unknown): CoreOpFilter => ({ op: "lte", column, value }),
  is: (column: string, value: null): CoreOpFilter => ({ op: "is", column, value }),
  or: (expression: string): CoreOpFilter => ({ op: "or", expression }),
};

export async function coreOpsRaw(payload: CoreOpsPayload) {
  return coreOpsQuery(payload);
}
