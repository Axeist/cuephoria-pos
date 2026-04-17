/**
 * WorkspaceHero — tenant-aware, brand-tinted top strip on the dashboard.
 *
 * Shows:
 *   - Tenant display name + tagline (from branding)
 *   - Plan badge + subscription status
 *   - Trial countdown (if trialing) or renewal date (if active)
 *   - Quick actions: Branding, Team, Subscription
 *
 * Behaviour:
 *   - Dismissible per tenant (sessionStorage). The dismissal is per-session so
 *     re-opening the app brings it back.
 *   - If branding hasn't loaded yet, shows a skeletal placeholder rather than
 *     flashing default colors.
 *   - For internal Cuephoria orgs, we downgrade the hero to a slim "internal"
 *     badge so our own team doesn't see upsell prompts.
 */

import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Clock,
  CreditCard,
  Palette,
  Shield,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenantBrandingOptional } from "@/branding/BrandingProvider";
import { cn } from "@/lib/utils";

type TenantOrgResp = {
  ok: true;
  organization: {
    id: string;
    slug: string;
    name: string;
    status: string;
    is_internal: boolean;
    trial_ends_at: string | null;
    country?: string | null;
    currency?: string | null;
  };
  subscription: {
    id: string;
    status: string;
    interval: string;
    current_period_end: string | null;
    trial_ends_at: string | null;
  } | null;
  plan: { id: string; code: string; name: string } | null;
  role: string;
  canEdit: boolean;
};

const DISMISS_KEY_PREFIX = "cuetronix.hero.dismissed.v1.";

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json();
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
};

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const WorkspaceHero: React.FC = () => {
  const branding = useTenantBrandingOptional();
  const orgQuery = useQuery({
    queryKey: ["tenant", "organization"],
    queryFn: () => fetcher<TenantOrgResp>("/api/tenant/organization"),
    staleTime: 60_000,
  });

  const slug = orgQuery.data?.organization.slug ?? "";
  const dismissKey = slug ? `${DISMISS_KEY_PREFIX}${slug}` : null;
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (!dismissKey) return;
    try {
      setDismissed(sessionStorage.getItem(dismissKey) === "1");
    } catch {
      /* noop */
    }
  }, [dismissKey]);

  if (orgQuery.isLoading || !orgQuery.data) {
    return (
      <div className="mb-4 h-[96px] rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse" />
    );
  }

  if (dismissed) return null;

  const { organization, subscription, plan, canEdit } = orgQuery.data;
  const brand = branding?.brand;
  const override = branding?.override ?? {};
  const primary = override.primary_color ?? "#8b5cf6";
  const accent = override.accent_color ?? "#6366f1";
  const displayName = override.display_name || brand?.name || organization.name;
  const tagline = override.tagline;

  const trialDaysLeft =
    subscription?.status === "trialing"
      ? daysUntil(subscription.trial_ends_at) ?? daysUntil(organization.trial_ends_at)
      : null;
  const renewalDate = subscription?.current_period_end;

  const isInternal = organization.is_internal;
  const statusLabel = (subscription?.status ?? organization.status ?? "active").replace(/_/g, " ");

  const handleDismiss = () => {
    if (!dismissKey) return;
    try {
      sessionStorage.setItem(dismissKey, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.section
        key="workspace-hero"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3 }}
        className="relative mb-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0b18] via-[#111224] to-[#0b0a14]"
      >
        {/* brand-tinted aurora */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{
            background: `radial-gradient(420px circle at 8% 20%, ${primary}26, transparent 60%), radial-gradient(460px circle at 94% 80%, ${accent}22, transparent 60%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative flex-shrink-0">
              <div
                aria-hidden
                className="absolute inset-0 rounded-xl blur-md opacity-80"
                style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
              />
              <div
                className="relative h-12 w-12 rounded-xl grid place-items-center overflow-hidden shadow-xl"
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${accent})`,
                  boxShadow: `0 12px 30px -8px ${primary}55`,
                }}
              >
                {override.logo_url ? (
                  <img
                    src={override.logo_url}
                    alt=""
                    className="h-full w-full object-contain p-1.5"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Sparkles className="h-5 w-5 text-white" />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate tracking-tight">
                  Welcome back to {displayName}
                </h2>
                {isInternal && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.3)",
                      color: "#93c5fd",
                    }}
                  >
                    <Shield className="h-3 w-3" /> Internal
                  </span>
                )}
              </div>
              {tagline ? (
                <p className="mt-0.5 text-sm text-zinc-400 truncate max-w-[52ch]">{tagline}</p>
              ) : (
                <p className="mt-0.5 text-sm text-zinc-500">
                  Your gaming cafe workspace on Cuetronix.
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {plan && (
                  <Badge color={primary}>
                    <CreditCard className="h-3 w-3" />
                    {plan.name}
                  </Badge>
                )}
                <Badge
                  color={
                    statusLabel === "trialing"
                      ? "#f59e0b"
                      : statusLabel === "active"
                        ? "#10b981"
                        : statusLabel === "past_due" || statusLabel === "past due"
                          ? "#ef4444"
                          : "#64748b"
                  }
                  tone="soft"
                >
                  {statusLabel}
                </Badge>
                {trialDaysLeft !== null && trialDaysLeft >= 0 && (
                  <Badge color={trialDaysLeft <= 3 ? "#ef4444" : "#f59e0b"} tone="soft">
                    <Clock className="h-3 w-3" />
                    {trialDaysLeft === 0
                      ? "Trial ends today"
                      : trialDaysLeft === 1
                        ? "1 day left in trial"
                        : `${trialDaysLeft} days left in trial`}
                  </Badge>
                )}
                {statusLabel === "active" && renewalDate && (
                  <Badge color="#64748b" tone="soft">
                    <Clock className="h-3 w-3" />
                    Renews {formatDate(renewalDate)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:self-center">
            {canEdit && (
              <>
                <QuickAction
                  to="/settings/organization#branding"
                  icon={Palette}
                  label="Branding"
                  primary={primary}
                />
                <QuickAction
                  to="/settings/organization"
                  icon={Users}
                  label="Team"
                  primary={primary}
                />
                {!isInternal && (
                  <Button
                    asChild
                    className={cn(
                      "h-9 rounded-xl text-white text-xs font-semibold hover:scale-[1.02] transition-transform",
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${primary}, ${accent})`,
                      boxShadow: `0 6px 18px ${primary}55`,
                    }}
                  >
                    <Link to="/settings/organization#subscription">
                      Manage plan
                      <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </>
            )}
            <button
              type="button"
              aria-label="Dismiss hero"
              onClick={handleDismiss}
              className="h-8 w-8 grid place-items-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const Badge: React.FC<{
  color: string;
  tone?: "solid" | "soft";
  children: React.ReactNode;
}> = ({ color, tone = "soft", children }) => {
  const bg = tone === "solid" ? color : `${color}1f`;
  const border = tone === "solid" ? color : `${color}55`;
  const fg = tone === "solid" ? "#fff" : color;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap"
      style={{ background: bg, border: `1px solid ${border}`, color: fg }}
    >
      {children}
    </span>
  );
};

const QuickAction: React.FC<{
  to: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  primary: string;
}> = ({ to, icon: Icon, label, primary }) => (
  <Button
    asChild
    variant="outline"
    size="sm"
    className="h-9 rounded-xl text-xs font-semibold bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:text-white text-zinc-300"
  >
    <Link to={to}>
      <Icon className="h-3.5 w-3.5 mr-1.5" style={{ color: primary }} />
      {label}
    </Link>
  </Button>
);

export default WorkspaceHero;
