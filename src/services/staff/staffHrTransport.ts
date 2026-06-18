import { adminFetch } from "@/services/adminFetch";
import { StaffScopeError } from "./staffApi.types";

export async function staffHrCall<T>(op: string, args: Record<string, unknown>): Promise<T> {
  const res = await adminFetch("/api/admin/staff-hr", {
    method: "POST",
    body: JSON.stringify({ op, args }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    throw new StaffScopeError(json.error || `Staff HR request failed (${res.status})`);
  }
  return json.data as T;
}
