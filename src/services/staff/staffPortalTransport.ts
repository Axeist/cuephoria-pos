import { adminFetch } from "@/services/adminFetch";

export class StaffPortalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffPortalError";
  }
}

export async function staffPortalCall<T>(op: string, args: Record<string, unknown> = {}): Promise<T> {
  const res = await adminFetch("/api/admin/staff-portal", {
    method: "POST",
    body: JSON.stringify({ op, args }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    throw new StaffPortalError(json.error || `Staff portal request failed (${res.status})`);
  }
  return json.data as T;
}
