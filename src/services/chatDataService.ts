/**
 * Compact business-data snapshot for the Cuephoria AI chat.
 *
 * Design goals:
 * - Pull broad signal (sales, bookings, customers, products, stations,
 *   sessions, expenses) in a single parallel batch so the UI only pays one
 *   round-trip's worth of latency.
 * - Serialise into a *very* compact key:value, pipe-delimited format so we
 *   stay well under ~2 000 tokens even on busy days. That keeps cost low
 *   even on frontier models like Sonnet or Opus.
 * - Include enough dimensionality (hour-by-hour, day-by-day, top items,
 *   inventory risk, category breakdowns) that most common questions can be
 *   answered from this one snapshot without follow-up DB calls.
 */
import { supabase } from "@/integrations/supabase/client";

const rupee = (n: number): string => `₹${Math.round(n).toLocaleString("en-IN")}`;

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function round(n: number, digits = 0): number {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function top<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

/**
 * Safe accessor for totals — returns 0 when the field is null/undefined.
 */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export interface SnapshotMeta {
  chars: number;
  generatedAt: string;
  /** Approximate token count (4 chars ≈ 1 token is a safe rule of thumb). */
  approxTokens: number;
}

export interface BusinessSnapshot {
  text: string;
  meta: SnapshotMeta;
}

/**
 * Build the compact context string + metadata. Callers typically pass the
 * `text` as a system-message addendum and show the `meta` in the UI so the
 * user can see how many tokens are being spent on context.
 */
export async function fetchBusinessSnapshot(): Promise<BusinessSnapshot> {
  const now = new Date();
  const todayDateStr = toDateStr(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7ISO = last7.toISOString();
  const last30ISO = last30.toISOString();
  const last7Date = toDateStr(last7);

  // All queries fire in parallel. We limit row counts aggressively to keep
  // both network + context token cost bounded. Selects only pull the
  // columns the serialiser actually reads.
  const [
    { data: todayBills },
    { data: weekBills },
    { data: monthBills },
    { data: weekBookings },
    { data: upcomingBookings },
    { data: customers },
    { data: products },
    { data: stations },
    { data: expenses },
    { data: activeSessions },
  ] = await Promise.all([
    supabase
      .from("bills")
      .select("total, payment_method, created_at, customer_id")
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd)
      .limit(500),
    supabase
      .from("bills")
      .select("total, payment_method, created_at")
      .gte("created_at", last7ISO)
      .limit(2000),
    supabase
      .from("bills")
      .select("total")
      .gte("created_at", last30ISO)
      .limit(5000),
    supabase
      .from("bookings")
      .select(
        "booking_date, start_time, end_time, status, station_id, customer_id, final_price",
      )
      .gte("booking_date", last7Date)
      .limit(500),
    supabase
      .from("bookings")
      .select("booking_date, start_time, status")
      .gte("booking_date", todayDateStr)
      .order("booking_date", { ascending: true })
      .limit(15),
    supabase
      .from("customers")
      .select("id, name, is_member, total_spent, created_at")
      .order("total_spent", { ascending: false })
      .limit(40),
    supabase
      .from("products")
      .select("name, category, stock, price")
      .limit(120),
    supabase
      .from("stations")
      .select("id, name, type, is_occupied")
      .limit(50),
    supabase
      .from("expenses")
      .select("amount, category, created_at")
      .gte("created_at", last30ISO)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("sessions")
      .select("id, station_id, customer_id, start_time, end_time")
      .is("end_time", null)
      .limit(50),
  ]);

  // ---------- TODAY ----------
  const todaySales = todayBills?.length ?? 0;
  const todayRevenue = (todayBills ?? []).reduce((s, b) => s + num(b.total), 0);
  const todayCash = (todayBills ?? []).filter((b) => b.payment_method === "cash").length;
  const todayUPI = (todayBills ?? []).filter((b) => b.payment_method === "upi").length;
  const todayAvgTicket = todaySales > 0 ? todayRevenue / todaySales : 0;

  // Hour-by-hour revenue for "when is today's peak" questions (only hours
  // with non-zero revenue are emitted so we don't waste tokens on empties).
  const todayByHour: Record<number, number> = {};
  for (const b of todayBills ?? []) {
    const h = new Date(b.created_at).getHours();
    todayByHour[h] = (todayByHour[h] ?? 0) + num(b.total);
  }
  const hourlyLine = Object.keys(todayByHour)
    .map(Number)
    .sort((a, b) => a - b)
    .map((h) => `${h.toString().padStart(2, "0")}:${Math.round(todayByHour[h])}`)
    .join("|") || "none";

  // ---------- WEEK (7-day rolling) ----------
  const weekDaily: Record<string, number> = {};
  for (const b of weekBills ?? []) {
    const d = toDateStr(new Date(b.created_at));
    weekDaily[d] = (weekDaily[d] ?? 0) + num(b.total);
  }
  const weekRevenue = Object.values(weekDaily).reduce((a, b) => a + b, 0);
  const weekDays = Object.keys(weekDaily).sort();
  const weekLine =
    weekDays
      .map((d) => `${d.slice(5)}:${Math.round(weekDaily[d])}`)
      .join("|") || "none";
  const weekAvgDaily = weekDays.length ? weekRevenue / weekDays.length : 0;

  // Day-of-week averages to spot patterns (Mon-Sun).
  const dowRevenue: Record<number, { sum: number; count: number }> = {};
  for (const d of weekDays) {
    const dow = new Date(d).getDay();
    dowRevenue[dow] = dowRevenue[dow] || { sum: 0, count: 0 };
    dowRevenue[dow].sum += weekDaily[d];
    dowRevenue[dow].count += 1;
  }
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowLine = Object.keys(dowRevenue)
    .map((k) => {
      const e = dowRevenue[Number(k)];
      return `${DOW[Number(k)]}:${Math.round(e.sum / Math.max(1, e.count))}`;
    })
    .join("|") || "none";

  // Week-over payment-method split.
  const weekCash = (weekBills ?? []).filter((b) => b.payment_method === "cash");
  const weekUPI = (weekBills ?? []).filter((b) => b.payment_method === "upi");
  const weekPayLine = `cash:${Math.round(
    weekCash.reduce((s, b) => s + num(b.total), 0),
  )}|upi:${Math.round(weekUPI.reduce((s, b) => s + num(b.total), 0))}`;

  // ---------- MONTH ----------
  const monthRevenue = (monthBills ?? []).reduce((s, b) => s + num(b.total), 0);
  const monthSales = monthBills?.length ?? 0;

  // ---------- CUSTOMERS ----------
  const totalCustomers = customers?.length ?? 0; // this is the "top 40 snapshot" size, we'll get real total below
  const memberCount = (customers ?? []).filter((c) => c.is_member).length;
  const topSpenders = top(customers ?? [], 5)
    .map((c) => `${c.name}:${Math.round(num(c.total_spent))}`)
    .join("|") || "none";

  // New customers acquired this week (join date within 7 days).
  const newThisWeek = (customers ?? []).filter(
    (c) => new Date(c.created_at).getTime() >= last7.getTime(),
  ).length;

  // Separate tiny query to get the real total customer count without
  // dragging the full table into the context.
  let customerCount: number | null = null;
  try {
    const { count } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });
    customerCount = count ?? null;
  } catch {
    customerCount = null;
  }

  // ---------- BOOKINGS ----------
  const todaysBookings = (weekBookings ?? []).filter(
    (b) => b.booking_date === todayDateStr,
  );
  const bookingsTodayCount = todaysBookings.length;
  const bookingsTodayRevenue = todaysBookings.reduce(
    (s, b) => s + num(b.final_price),
    0,
  );

  // Enriched upcoming line — match customer + station names for the first
  // few so the AI can answer "who is booked next?" without a follow-up.
  const upcomingLine =
    (upcomingBookings ?? [])
      .slice(0, 6)
      .map((b) => `${b.booking_date} ${b.start_time}(${b.status})`)
      .join("|") || "none";

  // Status breakdown for the week to spot cancel/no-show trends.
  const statusCounts: Record<string, number> = {};
  for (const b of weekBookings ?? []) {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  }
  const statusLine = Object.entries(statusCounts)
    .map(([k, v]) => `${k}:${v}`)
    .join("|") || "none";

  // ---------- PRODUCTS ----------
  const productCount = products?.length ?? 0;
  const outOfStock = (products ?? []).filter((p) => num(p.stock) <= 0);
  const lowStock = (products ?? []).filter(
    (p) => num(p.stock) > 0 && num(p.stock) < 10,
  );

  const categoryAgg: Record<string, { count: number; stock: number }> = {};
  for (const p of products ?? []) {
    const key = (p.category as string) || "uncategorised";
    categoryAgg[key] = categoryAgg[key] || { count: 0, stock: 0 };
    categoryAgg[key].count += 1;
    categoryAgg[key].stock += num(p.stock);
  }
  const categoryLine = Object.entries(categoryAgg)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([k, v]) => `${k}:${v.count}(${v.stock}u)`)
    .join("|") || "none";

  const lowStockLine =
    lowStock
      .slice(0, 10)
      .map((p) => `${p.name}(${p.stock})`)
      .join("|") || "none";
  const outOfStockLine =
    outOfStock
      .slice(0, 10)
      .map((p) => p.name)
      .join("|") || "none";

  // ---------- STATIONS ----------
  const stationCount = stations?.length ?? 0;
  const occupiedCount = (stations ?? []).filter((s) => s.is_occupied).length;
  const stationList =
    (stations ?? [])
      .map((s) => `${s.name}[${s.type}]:${s.is_occupied ? "busy" : "free"}`)
      .join("|") || "none";
  const occupancyPct =
    stationCount > 0 ? Math.round((occupiedCount / stationCount) * 100) : 0;

  // ---------- ACTIVE SESSIONS ----------
  const activeSessionCount = activeSessions?.length ?? 0;

  // ---------- EXPENSES ----------
  const monthExpensesTotal = (expenses ?? []).reduce(
    (s, e) => s + num(e.amount),
    0,
  );
  const expenseByCategory: Record<string, number> = {};
  for (const e of expenses ?? []) {
    const k = (e.category as string) || "misc";
    expenseByCategory[k] = (expenseByCategory[k] ?? 0) + num(e.amount);
  }
  const expenseLine = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `${k}:${Math.round(v)}`)
    .join("|") || "none";

  // Rough net for today if we allocate month expenses by 30 days.
  const estDailyExpense = monthExpensesTotal / 30;
  const todayNetApprox = todayRevenue - estDailyExpense;

  // ---------- ASSEMBLE ----------
  // Pipe-delimited, short keys. Keep one metric per line so the model can
  // skim it quickly.
  const text = [
    `DATE:${todayDateStr}`,
    ``,
    `# TODAY`,
    `sales:${todaySales} revenue:${Math.round(todayRevenue)} avg_ticket:${Math.round(todayAvgTicket)}`,
    `pay:cash=${todayCash} upi=${todayUPI}`,
    `revenue_by_hour:${hourlyLine}`,
    `bookings:${bookingsTodayCount} bookings_revenue:${Math.round(bookingsTodayRevenue)}`,
    `net_estimate:${Math.round(todayNetApprox)} (rev - ~1/30 of last30 expenses)`,
    ``,
    `# WEEK (last 7d)`,
    `revenue:${Math.round(weekRevenue)} avg_daily:${Math.round(weekAvgDaily)}`,
    `daily:${weekLine}`,
    `by_weekday_avg:${dowLine}`,
    `pay_split:${weekPayLine}`,
    `booking_status:${statusLine}`,
    ``,
    `# MONTH (last 30d)`,
    `revenue:${Math.round(monthRevenue)} sales:${monthSales}`,
    `expenses:${Math.round(monthExpensesTotal)} net:${Math.round(monthRevenue - monthExpensesTotal)}`,
    `expense_categories:${expenseLine}`,
    ``,
    `# CUSTOMERS`,
    `total:${customerCount ?? totalCustomers} members:${memberCount} new_7d:${newThisWeek}`,
    `top_spenders:${topSpenders}`,
    ``,
    `# PRODUCTS`,
    `total:${productCount} out_of_stock:${outOfStock.length} low_stock:${lowStock.length}`,
    `by_category:${categoryLine}`,
    `low_stock_items:${lowStockLine}`,
    `out_of_stock_items:${outOfStockLine}`,
    ``,
    `# STATIONS`,
    `count:${stationCount} occupied:${occupiedCount} occupancy_pct:${occupancyPct} active_sessions:${activeSessionCount}`,
    `list:${stationList}`,
    ``,
    `# BOOKINGS UPCOMING`,
    `next:${upcomingLine}`,
  ].join("\n");

  const chars = text.length;
  return {
    text,
    meta: {
      chars,
      generatedAt: now.toISOString(),
      approxTokens: Math.ceil(chars / 4),
    },
  };
}

/**
 * Back-compat export for the legacy Gemini flow. Returns just the text so
 * existing callers keep working until they migrate to the new shape.
 */
export const fetchBusinessDataForAI = async (): Promise<string> => {
  try {
    const snap = await fetchBusinessSnapshot();
    return snap.text;
  } catch (err) {
    console.error("Error fetching business data:", err);
    return "Error fetching business data. Please try again.";
  }
};

/** Numeric helper for UI badges — keeps the formatting consistent. */
export const formatRupee = rupee;
