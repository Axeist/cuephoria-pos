import { adminFetch } from "./adminFetch";

export type AdminRecordType = "product" | "bill" | "booking";

export async function deleteViaAdminApi(args: {
  type: AdminRecordType;
  id: string;
  locationId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await adminFetch("/api/admin/records", {
      method: "DELETE",
      body: JSON.stringify(args),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && json.ok) return { ok: true };
    return { ok: false, error: json.error || `Delete failed (${res.status})` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function verifyAdminPinViaApi(args: {
  pin: string;
  locationId: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  try {
    const res = await adminFetch("/api/admin/verify-pin", {
      method: "POST",
      body: JSON.stringify(args),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      skipped?: boolean;
      error?: string;
    };
    if (res.ok && json.ok) return { ok: true, skipped: json.skipped };
    return { ok: false, error: json.error || `PIN check failed (${res.status})` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function callAnalyticsRpc<T>(
  rpc: string,
  params: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await adminFetch("/api/admin/analytics", {
      method: "POST",
      body: JSON.stringify({ rpc, params }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: T;
      error?: string;
    };
    if (res.ok && json.ok) return { ok: true, data: json.data as T };
    return { ok: false, error: json.error || `Analytics failed (${res.status})` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
