import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, IndianRupee, Monitor, User, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  type BusinessType,
  BUSINESS_TYPE_LABELS,
  findStationSuggestion,
  getBusinessPreset,
  type StationSuggestion,
} from "./onboardingPresets";
import { scalePop, subStepSlide, subStepTransition } from "./onboardingMotion";

export interface SetupStation {
  name: string;
  type: string;
  hourlyRate: number;
}

export interface SetupProduct {
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface SetupGuidedFlowProps {
  businessType: BusinessType | "";
  subStep: 0 | 1 | 2;
  direction: 1 | -1;
  station: SetupStation | null;
  product: SetupProduct | null;
  firstCustomerName: string;
  firstCustomerPhone: string;
  customerSkipped: boolean;
  primaryColor: string;
  accentColor: string;
  onStationChange: (station: SetupStation) => void;
  onProductChange: (product: SetupProduct) => void;
  onCustomerNameChange: (name: string) => void;
  onCustomerPhoneChange: (phone: string) => void;
  onCustomerSkippedChange: (skipped: boolean) => void;
  onResetProduct: () => void;
}

const SUBSTEP_LABELS = ["Station", "Product", "Customer"] as const;

function MiniProgress({ subStep }: { subStep: 0 | 1 | 2 }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {SUBSTEP_LABELS.map((label, i) => {
        const done = i < subStep;
        const active = i === subStep;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-1 flex-col items-center gap-1.5">
              <motion.div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  done
                    ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                    : active
                      ? "border-fuchsia-300/60 bg-fuchsia-500/20 text-fuchsia-100"
                      : "border-white/15 bg-white/[0.03] text-zinc-500"
                }`}
                animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={active ? { duration: 1.5, repeat: Infinity } : undefined}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </motion.div>
              <span
                className={`text-[10px] font-medium uppercase tracking-wider ${
                  active ? "text-fuchsia-200" : done ? "text-emerald-300/80" : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < SUBSTEP_LABELS.length - 1 && (
              <div
                className={`mb-5 h-0.5 flex-1 rounded-full transition-colors ${
                  done ? "bg-emerald-400/50" : "bg-white/10"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StationCardPreview({
  station,
  primaryColor,
  accentColor,
}: {
  station: SetupStation;
  primaryColor: string;
  accentColor: string;
}) {
  const gradient = `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;
  return (
    <motion.div
      variants={scalePop}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-50"
        style={{ background: gradient }}
      />
      <div className="relative flex items-center gap-4">
        <div
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl shadow-lg"
          style={{ background: gradient }}
        >
          <Monitor className="h-7 w-7 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold text-white">{station.name || "Your station"}</div>
          <div className="mt-0.5 text-xs text-zinc-400">
            {station.type.replace(/_/g, " ")} · ₹{station.hourlyRate}/hr
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Available
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StationSubstep({
  businessType,
  station,
  primaryColor,
  accentColor,
  onStationChange,
}: {
  businessType: BusinessType | "";
  station: SetupStation | null;
  primaryColor: string;
  accentColor: string;
  onStationChange: (s: SetupStation) => void;
}) {
  const preset = useMemo(() => getBusinessPreset(businessType), [businessType]);
  const allOptions = useMemo(
    () => [preset.station, ...preset.alternates],
    [preset],
  );
  const current = station ?? {
    name: preset.station.name,
    type: preset.station.type,
    hourlyRate: preset.station.hourlyRate,
  };
  const activeSuggestion = findStationSuggestion(businessType, current.type);

  const applySuggestion = (s: StationSuggestion) => {
    onStationChange({ name: s.name, type: s.type, hourlyRate: s.hourlyRate });
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">Let&apos;s add your first station</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Stations are where sessions and bookings happen — start with one.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
          <Monitor className="h-3 w-3 text-fuchsia-300" />
          {BUSINESS_TYPE_LABELS[(businessType || "other") as BusinessType]}
        </span>
      </div>

      {allOptions.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2">
          {allOptions.map((opt) => {
            const active = current.type === opt.type;
            const Icon = opt.icon;
            return (
              <motion.button
                key={opt.type}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => applySuggestion(opt)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-fuchsia-300/50 bg-fuchsia-500/20 text-fuchsia-100"
                    : "border-white/15 bg-white/[0.03] text-zinc-400 hover:border-white/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </motion.button>
            );
          })}
        </div>
      )}

      <motion.div
        variants={scalePop}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-500/[0.06] p-4"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: `linear-gradient(135deg, ${primaryColor}44, ${accentColor}44)` }}
          >
            <activeSuggestion.icon className="h-5 w-5 text-fuchsia-200" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">Suggested for you</div>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{activeSuggestion.helper}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Station name
          </Label>
          <Input
            value={current.name}
            onChange={(e) => onStationChange({ ...current, name: e.target.value })}
            placeholder="PS5 Station 1"
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Hourly rate (₹)
          </Label>
          <Input
            type="number"
            min={10}
            max={5000}
            value={current.hourlyRate}
            onChange={(e) =>
              onStationChange({ ...current, hourlyRate: Number(e.target.value || 0) })
            }
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100"
          />
        </div>
      </div>

      <StationCardPreview station={current} primaryColor={primaryColor} accentColor={accentColor} />
    </div>
  );
}

function ProductSubstep({
  businessType,
  product,
  onProductChange,
  onResetProduct,
  primaryColor,
}: {
  businessType: BusinessType | "";
  product: SetupProduct | null;
  onProductChange: (p: SetupProduct) => void;
  onResetProduct: () => void;
  primaryColor: string;
}) {
  const preset = useMemo(() => getBusinessPreset(businessType), [businessType]);
  const current = product ?? preset.product;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">Now add one thing you sell</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Products power your POS — snacks, passes, memberships, and more.
        </p>
      </div>

      <motion.div
        variants={scalePop}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]"
              style={{ color: primaryColor }}
            >
              <IndianRupee className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-zinc-100">Your first product</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-7 rounded-lg border border-white/10 px-2 text-[11px] text-zinc-400"
            onClick={onResetProduct}
          >
            Use suggestion
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Product name
            </Label>
            <Input
              value={current.name}
              onChange={(e) => onProductChange({ ...current, name: e.target.value })}
              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Price (₹)
            </Label>
            <Input
              type="number"
              min={0}
              value={current.price}
              onChange={(e) =>
                onProductChange({ ...current, price: Number(e.target.value || 0) })
              }
              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Category</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300">
              {current.category.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CustomerSubstep({
  firstCustomerName,
  firstCustomerPhone,
  customerSkipped,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerSkippedChange,
}: {
  firstCustomerName: string;
  firstCustomerPhone: string;
  customerSkipped: boolean;
  onCustomerNameChange: (v: string) => void;
  onCustomerPhoneChange: (v: string) => void;
  onCustomerSkippedChange: (skipped: boolean) => void;
}) {
  const digits = firstCustomerPhone.replace(/\D/g, "");
  const phoneValid =
    digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
  const showSuccess =
    !customerSkipped && firstCustomerName.trim().length > 0 && phoneValid;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">Add your first customer</h3>
        <p className="mt-1 text-sm text-zinc-400">
          So your first invoice and customer search work right away.
        </p>
      </div>

      <motion.div
        variants={scalePop}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20">
            <Users className="h-4 w-4 text-sky-300" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">Customer details</span>
          {showSuccess && (
            <motion.span
              variants={scalePop}
              initial="hidden"
              animate="show"
              className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ready
            </motion.span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Full name
            </Label>
            <Input
              value={firstCustomerName}
              disabled={customerSkipped}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Mobile number
            </Label>
            <Input
              value={firstCustomerPhone}
              disabled={customerSkipped}
              inputMode="numeric"
              onChange={(e) =>
                onCustomerPhoneChange(e.target.value.replace(/[^\d+]/g, "").slice(0, 13))
              }
              placeholder="10-digit mobile number"
              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 disabled:opacity-50"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          className={`h-10 w-full rounded-xl border text-sm ${
            customerSkipped
              ? "border-fuchsia-300/30 bg-fuchsia-500/10 text-fuchsia-200"
              : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
          }`}
          onClick={() => onCustomerSkippedChange(!customerSkipped)}
        >
          <User className="mr-2 h-4 w-4" />
          {customerSkipped ? "Add customer instead" : "Skip for now — I'll add customers later"}
        </Button>
      </motion.div>
    </div>
  );
}

export default function SetupGuidedFlow(props: SetupGuidedFlowProps) {
  const { subStep, direction } = props;

  return (
    <div>
      <MiniProgress subStep={subStep} />
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={subStep}
          custom={direction}
          variants={subStepSlide(direction)}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={subStepTransition}
        >
          {subStep === 0 && (
            <StationSubstep
              businessType={props.businessType}
              station={props.station}
              primaryColor={props.primaryColor}
              accentColor={props.accentColor}
              onStationChange={props.onStationChange}
            />
          )}
          {subStep === 1 && (
            <ProductSubstep
              businessType={props.businessType}
              product={props.product}
              onProductChange={props.onProductChange}
              onResetProduct={props.onResetProduct}
              primaryColor={props.primaryColor}
            />
          )}
          {subStep === 2 && (
            <CustomerSubstep
              firstCustomerName={props.firstCustomerName}
              firstCustomerPhone={props.firstCustomerPhone}
              customerSkipped={props.customerSkipped}
              onCustomerNameChange={props.onCustomerNameChange}
              onCustomerPhoneChange={props.onCustomerPhoneChange}
              onCustomerSkippedChange={props.onCustomerSkippedChange}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
