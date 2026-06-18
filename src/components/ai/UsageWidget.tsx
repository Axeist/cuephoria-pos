/**
 * UsageWidget — detailed per-tenant AI spend / token / request widget.
 *
 * Two exports:
 *
 * - `<UsagePill />`       — a compact, animated chip that lives in the
 *                           header (today's spend + total, branded glow).
 *                           Clicking it opens the full panel.
 *
 * - `<UsagePanel />`      — the expanded panel. Shows key totals, a
 *                           14-day cost sparkline, per-model breakdown
 *                           with share bars, the active conversion rate,
 *                           and a reset button.
 *
 * All numbers come from `aiUsageTracker` which is keyed by
 * (organizationId, userId) so different tenants + staff always see only
 * their own figures.
 */
import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronRight, Coins, Flame, Gauge, RefreshCw, TrendingUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  deriveUsage,
  getInrPerUsd,
  useAIUsage,
} from "@/services/aiUsageTracker";

interface UsageWidgetCommonProps {
  orgId: string | null | undefined;
  userId: string | null | undefined;
}

function formatInr(n: number): string {
  if (n === 0) return "₹0";
  // For very small costs, show 3 decimals so "₹0.012" doesn't become "₹0".
  const fractionDigits = n < 1 ? 3 : n < 100 ? 2 : 0;
  return "₹" + n.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatUsd(n: number): string {
  if (n === 0) return "$0";
  const fractionDigits = n < 0.01 ? 4 : n < 1 ? 3 : 2;
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

// ----------------------------------------------------------------------------
// Pill (compact)
// ----------------------------------------------------------------------------

export const UsagePill: React.FC<UsageWidgetCommonProps> = ({ orgId, userId }) => {
  const { snapshot } = useAIUsage(orgId, userId);
  const derived = useMemo(() => deriveUsage(snapshot), [snapshot]);
  const [open, setOpen] = useState(false);

  const totalInr = derived.totalCostInr;
  const todayInr = derived.todayCostUsd * getInrPerUsd();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="group relative flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-white/80 backdrop-blur-md transition-colors hover:border-white/20 hover:text-white"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 18px -10px hsl(var(--primary) / 0.45)",
          }}
          title="Open usage & spend panel"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-[1px] -z-10 rounded-full opacity-0 blur-sm transition-opacity group-hover:opacity-70"
            style={{
              background:
                "linear-gradient(90deg, hsl(var(--primary) / 0.4) 0%, hsl(var(--accent) / 0.4) 100%)",
            }}
          />
          <Coins className="h-3.5 w-3.5 text-amber-300" />
          <span className="tabular-nums">{formatInr(todayInr)}</span>
          <span className="text-white/30">/ today</span>
          <span className="hidden md:inline text-white/30">•</span>
          <span className="hidden md:inline tabular-nums text-white/60">
            {formatInr(totalInr)} total
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-white/40 transition-transform group-data-[state=open]:rotate-90" />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(92vw,400px)] overflow-hidden border-white/10 bg-[hsl(var(--background)/0.88)] p-0 backdrop-blur-xl"
      >
        <UsagePanel orgId={orgId} userId={userId} compact />
      </PopoverContent>
    </Popover>
  );
};

// ----------------------------------------------------------------------------
// Full panel
// ----------------------------------------------------------------------------

interface UsagePanelProps extends UsageWidgetCommonProps {
  /** Tighter paddings + smaller type for the header popover. */
  compact?: boolean;
}

export const UsagePanel: React.FC<UsagePanelProps> = ({ orgId, userId, compact }) => {
  const { snapshot, reset } = useAIUsage(orgId, userId);
  const d = useMemo(() => deriveUsage(snapshot), [snapshot]);
  const inrRate = getInrPerUsd();
  const [confirmReset, setConfirmReset] = useState(false);

  const pad = compact ? "p-4" : "p-5";
  const gap = compact ? "gap-3" : "gap-4";

  return (
    <div className={`relative flex flex-col ${pad} ${gap} text-white`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span className="text-[13px] font-semibold tracking-wide">AI Usage & Spend</span>
          </div>
          <p className="mt-0.5 text-[11px] text-white/50">
            Per-tenant estimate · using ₹{inrRate.toFixed(0)}/USD
          </p>
        </div>
        {d.totalRequests > 0 && (
          <AnimatePresence mode="wait" initial={false}>
            {confirmReset ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-1"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-white/60 hover:text-white"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                  }}
                >
                  Reset
                </Button>
              </motion.div>
            ) : (
              <motion.button
                key="resetBtn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10.5px] text-white/55 transition-colors hover:border-white/20 hover:text-white"
                title="Reset local usage counters"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Top-line tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Today"
          primary={formatInr(d.todayCostUsd * inrRate)}
          secondary={`${formatTokens(d.todayTokens)} tok · ${d.todayRequests} req`}
          accent="hsl(var(--primary))"
        />
        <StatTile
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="7 days"
          primary={formatInr(d.weekCostUsd * inrRate)}
          secondary={`${formatTokens(d.weekTokens)} tok · ${d.weekRequests} req`}
          accent="hsl(var(--accent))"
        />
        <StatTile
          icon={<Activity className="h-3.5 w-3.5" />}
          label="All time"
          primary={formatInr(d.totalCostInr)}
          secondary={`${formatTokens(d.totalTokens)} tok · ${d.totalRequests} req`}
          accent="hsl(var(--primary))"
        />
      </div>

      {/* Sparkline */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/70">Daily cost (14d)</span>
          <span className="text-[10.5px] text-white/40">
            {formatUsd(d.totalCostUsd)} lifetime
          </span>
        </div>
        <Sparkline points={d.costSparkline.map((p) => p.costUsd)} />
      </div>

      {/* Per-model breakdown */}
      {d.models.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-medium text-white/70">By model</div>
          <div className="flex flex-col gap-1.5">
            {d.models.slice(0, 5).map((m) => (
              <div
                key={m.modelId}
                className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-white/90">
                      {m.label}
                    </div>
                    <div className="truncate text-[10.5px] text-white/45">
                      {m.provider} · {formatTokens(m.totalTokens)} tok · {m.requests} req
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-semibold tabular-nums text-white">
                      {formatInr(m.costUsd * inrRate)}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {(m.shareCost * 100).toFixed(0)}% of spend
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, m.shareCost * 100)}%`,
                      background:
                        "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
                      boxShadow: "0 0 8px hsl(var(--primary) / 0.55)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-[11px] text-white/45">
          No usage recorded yet. Spend will appear here after your first reply.
        </div>
      )}
    </div>
  );
};

// ---- Small helpers ----------------------------------------------------------

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}

const StatTile: React.FC<StatTileProps> = ({ icon, label, primary, secondary, accent }) => (
  <div
    className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-2.5"
    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-60 blur-2xl"
      style={{ background: accent }}
    />
    <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/55">
      <span className="text-white/70">{icon}</span>
      {label}
    </div>
    <div className="mt-1 text-[15px] font-bold tabular-nums text-white">{primary}</div>
    <div className="text-[10px] text-white/40">{secondary}</div>
  </div>
);

interface SparklineProps {
  points: number[];
}

/** Tiny dependency-free SVG sparkline with a gradient fill under the curve. */
const Sparkline: React.FC<SparklineProps> = ({ points }) => {
  const W = 300;
  const H = 60;
  const max = Math.max(...points, 0.0001);
  const step = points.length > 1 ? W / (points.length - 1) : W;

  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = H - (v / max) * (H - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const fillPath = `${path} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spark-stroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#spark-fill)" />
      <path
        d={path}
        fill="none"
        stroke="url(#spark-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Highlight last point */}
      {points.length > 0 &&
        (() => {
          const last = points[points.length - 1];
          const x = (points.length - 1) * step;
          const y = H - (last / max) * (H - 6) - 3;
          return (
            <circle
              cx={x}
              cy={y}
              r="3"
              fill="hsl(var(--accent))"
              stroke="white"
              strokeWidth="1"
            />
          );
        })()}
    </svg>
  );
};

export default UsagePanel;
