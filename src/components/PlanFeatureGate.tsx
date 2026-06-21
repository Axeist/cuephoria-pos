import React from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntitlements } from "@/hooks/useEntitlements";
import type { PlanFeatureKey } from "@/types/tenancy";

const PLAN_LABELS: Record<string, string> = {
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
};

type Props = {
  feature: PlanFeatureKey;
  children: React.ReactNode;
  /** Optional override when feature maps to a different min plan label */
  minPlan?: string;
  fallback?: React.ReactNode;
};

export const PlanFeatureGate: React.FC<Props> = ({ feature, children, minPlan, fallback }) => {
  const { can, planTier, isSandbox, isInternal, loading } = useEntitlements();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-white/50 text-sm">
        Loading…
      </div>
    );
  }

  if (isInternal || can(feature)) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const required =
    minPlan ??
    (feature === "staff_hr_enabled"
      ? "pro"
      : feature === "bookings_enabled" || feature === "memberships_enabled"
        ? "growth"
        : "growth");
  const label = PLAN_LABELS[required] ?? required;

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-6">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full grid place-items-center bg-amber-500/15 border border-amber-500/40">
          <Lock className="h-6 w-6 text-amber-300" />
        </div>
        <h2 className="text-xl font-bold text-white">Upgrade to unlock</h2>
        <p className="text-sm text-white/65">
          {isSandbox ? (
            <>
              Your demo is on the <span className="font-semibold capitalize">{planTier ?? "current"}</span> plan.
              Switch to <span className="font-semibold">{label}</span> from Subscription to preview this module.
            </>
          ) : (
            <>
              This feature is available on the <span className="font-semibold">{label}</span> plan and above.
            </>
          )}
        </p>
        <Button asChild className="btn-gradient text-white w-full">
          <Link to="/subscription">
            <Sparkles className="h-4 w-4 mr-2" />
            {isSandbox ? "Switch plan in demo" : `Upgrade to ${label}`}
          </Link>
        </Button>
      </div>
    </div>
  );
};
