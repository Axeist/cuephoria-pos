export type CatalogPlanTier = "starter" | "growth" | "pro";

export type PlanMarketing = {
  tier: CatalogPlanTier;
  tagline: string;
  badge?: string;
  highlight?: boolean;
  ctaLabel: string;
  features: string[];
  missing?: string[];
};

/** Customer-facing plan copy aligned with plan_features in the database. */
export const PLAN_MARKETING: Record<"starter" | "growth" | "pro", PlanMarketing> = {
  starter: {
    tier: "starter",
    tagline: "Single-location POS to get started",
    ctaLabel: "Start with Starter",
    features: [
      "1 branch · up to 6 gaming stations",
      "1 admin login",
      "Full POS — sessions, products & cafe billing",
      "Customer profiles & basic reports",
      "Receipts with your branding",
      "In-store payments (cash, UPI, split)",
    ],
    missing: [
      "Online booking & Razorpay checkout",
      "Tournaments & public leaderboard",
      "Loyalty, memberships & happy hours",
    ],
  },
  growth: {
    tier: "growth",
    tagline: "Run bookings and community features online",
    badge: "Popular",
    ctaLabel: "Choose Growth",
    features: [
      "Everything in Starter",
      "1 branch · up to 20 stations · 5 admin seats",
      "Public booking page with online pay",
      "Coupons, pool add-ons & booking popups",
      "Tournaments, brackets & winner gallery",
      "Loyalty points, memberships & happy hours",
      "CSV / report exports",
      "Custom brand font on public pages",
      "Priority email support",
    ],
  },
  pro: {
    tier: "pro",
    tagline: "Multi-branch operations without limits",
    badge: "Recommended",
    highlight: true,
    ctaLabel: "Go Pro — best value",
    features: [
      "Everything in Growth",
      "Up to 3 branches · unlimited stations",
      "Unlimited admin & staff seats",
      "Staff HR — attendance, leave & portal",
      "Advanced analytics & deeper reports",
      "Custom domain for public booking",
      "Remove “Powered by” on customer pages",
      "Custom SMS sender for notifications",
      "Priority support & faster onboarding",
    ],
  },
};

export function yearlySavingsPercent(monthly: number | null, yearly: number | null): number | null {
  if (monthly == null || yearly == null || monthly <= 0) return null;
  const fullYearMonthly = monthly * 12;
  if (fullYearMonthly <= yearly) return null;
  return Math.round(((fullYearMonthly - yearly) / fullYearMonthly) * 100);
}

export type FeatureRow = {
  label: string;
  starter: string | boolean;
  growth: string | boolean;
  pro: string | boolean;
};

/** Side-by-side matrix for the compare section below pricing cards. */
export const PLAN_FEATURE_MATRIX: FeatureRow[] = [
  { label: "Branches", starter: "1", growth: "1", pro: "Up to 3" },
  { label: "Gaming stations", starter: "Up to 6", growth: "Up to 20", pro: "Unlimited" },
  { label: "Admin seats", starter: "1", growth: "5", pro: "Unlimited" },
  { label: "POS & in-store billing", starter: true, growth: true, pro: true },
  { label: "Public online booking", starter: false, growth: true, pro: true },
  { label: "Razorpay checkout", starter: false, growth: true, pro: true },
  { label: "Tournaments & leaderboard", starter: false, growth: true, pro: true },
  { label: "Loyalty & memberships", starter: false, growth: true, pro: true },
  { label: "Happy hours", starter: false, growth: true, pro: true },
  { label: "Report exports", starter: false, growth: true, pro: true },
  { label: "Staff HR & attendance", starter: false, growth: false, pro: true },
  { label: "Advanced analytics", starter: false, growth: false, pro: true },
  { label: "Custom domain", starter: false, growth: false, pro: true },
  { label: "Hide powered-by badge", starter: false, growth: false, pro: true },
  { label: "Custom SMS sender", starter: false, growth: false, pro: true },
  { label: "Priority support", starter: false, growth: true, pro: true },
];
