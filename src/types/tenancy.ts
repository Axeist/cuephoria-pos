/**
 * Tenancy types — Slice 0.
 *
 * Hand-authored types for the new multi-tenant tables introduced by migration
 * `20260421100000_slice0_multi_tenant_foundation.sql`. These intentionally
 * live outside the Supabase-generated `src/integrations/supabase/types.ts`
 * so regenerating that file (via `supabase gen types`) cannot clobber them.
 *
 * Once the migration has been applied to staging AND `types.ts` has been
 * regenerated against that database, we can optionally collapse these into
 * imports from the generated file. Until then, these are the source of truth.
 */

export type OrganizationStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "suspended";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "internal";

export type SubscriptionProvider = "razorpay" | "stripe" | "internal" | "manual";
export type SubscriptionInterval = "month" | "year";

export type OrgMembershipRole =
  | "owner"
  | "admin"
  | "manager"
  | "staff"
  | "read_only";

export type PlanCode =
  | "internal"
  | "starter"
  | "growth"
  | "pro"
  | "enterprise";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  country: string;
  currency: string;
  timezone: string;
  status: OrganizationStatus;
  is_internal: boolean;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  code: PlanCode | string;
  name: string;
  is_public: boolean;
  price_inr_month: number | null;
  price_inr_year: number | null;
  price_usd_month: number | null;
  price_usd_year: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PlanFeature {
  id: string;
  plan_id: string;
  key: string;
  value: unknown;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  provider: SubscriptionProvider;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  status: SubscriptionStatus;
  interval: SubscriptionInterval;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMembership {
  id: string;
  organization_id: string;
  admin_user_id: string;
  role: OrgMembershipRole;
  created_at: string;
}

export interface PlatformAdmin {
  id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export type AuditActorType =
  | "platform_admin"
  | "admin_user"
  | "system"
  | "webhook"
  | "customer";

export interface AuditLogEntry {
  id: string;
  actor_type: AuditActorType;
  actor_id: string | null;
  actor_label: string | null;
  organization_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Canonical feature-flag keys. Keep in sync with the seeded rows in
 * `plan_features` inside the Slice 0 migration.
 */
export const PLAN_FEATURE_KEYS = [
  "max_branches",
  "max_stations",
  "max_admin_seats",
  "tournaments_enabled",
  "loyalty_enabled",
  "happy_hours_enabled",
  "memberships_enabled",
  "public_booking",
  "cafe_module",
  "exports_enabled",
  "custom_domain",
  "custom_font",
  "hide_powered_by",
  "custom_sms_sender",
  "priority_support",
] as const;

export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
