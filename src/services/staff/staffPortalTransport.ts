import { adminFetch } from "@/services/adminFetch";
import { getStaffPortalSessionToken } from "@/utils/staffPortalSession";
import { useAuth } from "@/context/AuthContext";

export class StaffPortalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaffPortalError";
  }
}

export async function staffPortalCall<T>(
  op: string,
  args: Record<string, unknown> = {},
  opts?: { adminUserId?: string | null; portalSessionToken?: string | null },
): Promise<T> {
  const portalSessionToken =
    opts?.portalSessionToken ??
    (opts?.adminUserId ? getStaffPortalSessionToken(opts.adminUserId) : null);

  const res = await adminFetch("/api/admin/staff-portal", {
    method: "POST",
    body: JSON.stringify({
      op,
      args,
      portalSessionToken: portalSessionToken ?? undefined,
    }),
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

/** Hook-friendly wrapper when admin user id is known in the component. */
export function useStaffPortalCall() {
  const { user } = useAuth();
  return <T,>(op: string, args: Record<string, unknown> = {}) =>
    staffPortalCall<T>(op, args, { adminUserId: user?.id ?? null });
}
