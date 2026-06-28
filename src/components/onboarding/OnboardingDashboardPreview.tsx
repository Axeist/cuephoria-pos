import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CreditCard,
  PlayCircle,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import { CurrencyDisplay } from "@/components/ui/currency";
import { staggerContainer, staggerItem } from "./onboardingMotion";
import type { SetupProduct, SetupStation } from "./SetupGuidedFlow";

interface OnboardingDashboardPreviewProps {
  displayName: string;
  tagline: string;
  logoUrl: string;
  iconUrl: string;
  primaryColor: string;
  accentColor: string;
  station: SetupStation | null;
  product: SetupProduct | null;
  firstCustomerName: string;
  customerSkipped: boolean;
}

function useCountUp(target: number, duration = 900, enabled = true): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    let frame: number;
    const from = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, enabled]);

  return value;
}

function PreviewHero({
  displayName,
  tagline,
  iconUrl,
  primaryColor,
  accentColor,
}: Pick<
  OnboardingDashboardPreviewProps,
  "displayName" | "tagline" | "iconUrl" | "primaryColor" | "accentColor"
>) {
  const gradient = `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;
  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0b18] via-[#111224] to-[#0b0a14] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-80 pointer-events-none"
        style={{
          background: `radial-gradient(420px circle at 8% 20%, ${primaryColor}26, transparent 60%), radial-gradient(460px circle at 94% 80%, ${accentColor}22, transparent 60%)`,
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{
          background: `linear-gradient(90deg, transparent, ${primaryColor}18, transparent)`,
          backgroundSize: "200% 100%",
        }}
      />
      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative flex-shrink-0">
            <div
              className="absolute inset-0 rounded-xl blur-md opacity-80"
              style={{ background: gradient }}
            />
            <div
              className="relative flex h-11 w-11 items-center justify-center rounded-xl overflow-hidden shadow-xl"
              style={{ background: gradient }}
            >
              {iconUrl ? (
                <img src={iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Sparkles className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-white sm:text-lg">
              {displayName || "Your workspace"}
            </div>
            {tagline && <div className="truncate text-xs text-white/60">{tagline}</div>}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
                Trial · 14 days left
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                Starter plan
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function PreviewStatCards({
  productPrice,
  hasCustomer,
  primaryColor,
}: {
  productPrice: number;
  hasCustomer: boolean;
  primaryColor: string;
}) {
  const sales = useCountUp(productPrice, 1000);
  const customers = useCountUp(hasCustomer ? 1 : 0, 600);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4"
    >
      <motion.div variants={staggerItem}>
        <StatsCard
          title="Total Sales"
          value={<CurrencyDisplay amount={sales} />}
          icon={CreditCard}
          subValue={<span style={{ color: primaryColor }}>+100% today</span>}
          iconColor="text-[#9b87f5]"
          iconBgColor="bg-[#6E59A5]/20"
        />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatsCard
          title="Active Sessions"
          value={0}
          icon={PlayCircle}
          subValue="1 station available"
          iconColor="text-[#0EA5E9]"
          iconBgColor="bg-[#0EA5E9]/20"
        />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatsCard
          title="Customers"
          value={customers}
          icon={Users}
          subValue={hasCustomer ? "1 new today" : "Add your first"}
          iconColor="text-[#F97316]"
          iconBgColor="bg-[#F97316]/20"
        />
      </motion.div>
      <motion.div variants={staggerItem}>
        <StatsCard
          title="Low Stock"
          value={0}
          icon={Clock}
          subValue="All inventory levels are good"
          iconColor="text-emerald-400"
          iconBgColor="bg-emerald-500/20"
        />
      </motion.div>
    </motion.div>
  );
}

function PreviewBottomRow({
  stationName,
  productName,
  customerName,
  primaryColor,
}: {
  stationName: string;
  productName: string;
  customerName: string;
  primaryColor: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid gap-3 sm:gap-4 md:grid-cols-2"
    >
      <motion.div variants={staggerItem} className="glass-card rounded-2xl border border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">Active Sessions</div>
            <div className="text-xs text-white/50">0 active sessions</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0EA5E9]/20">
            <Clock className="h-4 w-4 text-[#0EA5E9]" />
          </div>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/45">
          No active sessions yet
        </div>
        {stationName && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: primaryColor }}
            />
            {stationName} ready
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={staggerItem} className="glass-card rounded-2xl border border-white/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">Recent Transactions</div>
            <div className="text-xs text-white/50">Latest sales</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9b87f5]/20">
            <Receipt className="h-4 w-4 text-[#9b87f5]" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">
              {productName || "Your product"}
            </div>
            <div className="truncate text-xs text-white/50">
              {customerName || "Walk-in customer"}
            </div>
          </div>
          <div className="shrink-0 text-sm font-semibold text-emerald-400">Sample</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function OnboardingDashboardPreview({
  displayName,
  tagline,
  logoUrl,
  iconUrl,
  primaryColor,
  accentColor,
  station,
  product,
  firstCustomerName,
  customerSkipped,
}: OnboardingDashboardPreviewProps) {
  const productPrice = product?.price ?? 0;
  const hasCustomer = !customerSkipped && firstCustomerName.trim().length > 0;

  const stationName = useMemo(() => station?.name ?? "", [station?.name]);
  const productName = useMemo(() => product?.name ?? "", [product?.name]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Here&apos;s how your branded dashboard will look the moment you launch.
      </p>
      <div className="space-y-3 sm:space-y-4 rounded-2xl border border-white/10 bg-[#07030f]/60 p-3 sm:p-4">
        <PreviewHero
          displayName={displayName}
          tagline={tagline}
          iconUrl={iconUrl}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
        <PreviewStatCards
          productPrice={productPrice}
          hasCustomer={hasCustomer}
          primaryColor={primaryColor}
        />
        <PreviewBottomRow
          stationName={stationName}
          productName={productName}
          customerName={hasCustomer ? firstCustomerName : ""}
          primaryColor={primaryColor}
        />
      </div>
      {logoUrl && (
        <div className="flex items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <img src={logoUrl} alt="" className="max-h-10 opacity-90" />
        </div>
      )}
      <p className="text-xs text-zinc-500">
        You can tweak all of this anytime from <strong>Settings → Organization</strong>.
      </p>
    </div>
  );
}
