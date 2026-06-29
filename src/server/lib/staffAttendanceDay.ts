import { format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Venue-local calendar day for attendance (server UTC date; matches existing clock-in rows). */
export function attendanceTodayDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Close forgotten clock-ins from prior days so they do not appear "on duty" forever.
 * Returns number of rows closed.
 */
export async function closeStaleOpenShifts(
  supabase: SupabaseClient,
  opts: { staffId?: string; organizationId?: string; beforeDate?: string },
): Promise<number> {
  const beforeDate = opts.beforeDate ?? attendanceTodayDate();

  let query = supabase
    .from("staff_attendance")
    .update({
      clock_out: new Date().toISOString(),
      status: "completed",
    })
    .is("clock_out", null)
    .lt("date", beforeDate)
    .select("id");

  if (opts.staffId) {
    query = query.eq("staff_id", opts.staffId);
  }
  if (opts.organizationId) {
    query = query.eq("organization_id", opts.organizationId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
