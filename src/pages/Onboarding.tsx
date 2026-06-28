/**
 * /onboarding — first-run wizard for new workspaces.
 *
 * Owners are gated here (by ProtectedRoute in App.tsx) until
 * onboarding_completed_at is set. The flow:
 *
 *   1. Profile  — display name + tagline. Sets a warm tone.
 *   2. Brand    — logo / icon upload + primary + accent color pickers.
 *   3. Business — what kind of operation (gaming lounge, cafe, …). Drives
 *                 default feature surfaces in the dashboard.
 *   4. Setup    — guided station → product → customer micro-flow.
 *   5. Preview  — realistic dashboard mock with chosen brand + setup data.
 *   6. Launch   — call /api/tenant/onboarding with complete=true,
 *                 refresh org context, navigate to /dashboard.
 *
 * Visual language matches the landing / login / signup pages: shared ambient
 * galaxy background + advanced glass card. The only tenant-specific colour is
 * the primary/accent gradient on the preview surface and the main CTA, so the
 * owner sees their brand come to life as they pick it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Coffee,
  Gamepad2,
  ImageIcon,
  Joystick,
  Loader2,
  PaintBucket,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import SetupGuidedFlow, {
  type SetupProduct,
  type SetupStation,
} from "@/components/onboarding/SetupGuidedFlow";
import OnboardingDashboardPreview from "@/components/onboarding/OnboardingDashboardPreview";
import {
  type BusinessType,
  getBusinessPreset,
} from "@/components/onboarding/onboardingPresets";
import { staggerContainer, staggerItem } from "@/components/onboarding/onboardingMotion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { appToast } from "@/lib/appToast";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationOptional } from "@/context/OrganizationContext";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";

type StepId = "profile" | "brand" | "business" | "setup" | "preview" | "launch";

const STEPS: { id: StepId; label: string; short: string; subtitle: string }[] = [
  {
    id: "profile",
    label: "Name your workspace",
    short: "Profile",
    subtitle: "A quick hello — this is what your customers and staff will see.",
  },
  {
    id: "brand",
    label: "Make it yours",
    short: "Brand",
    subtitle: "Drop in a logo, pick the colours that represent your venue.",
  },
  {
    id: "business",
    label: "What do you run?",
    short: "Business",
    subtitle: "We'll pre-configure the dashboard for your type of floor.",
  },
  {
    id: "setup",
    label: "Set up your floor",
    short: "Setup",
    subtitle: "Create one station, one product, and optionally your first customer.",
  },
  {
    id: "preview",
    label: "Looking great",
    short: "Preview",
    subtitle: "A preview of your live dashboard before we hand over the keys.",
  },
  {
    id: "launch",
    label: "Ready to launch",
    short: "Launch",
    subtitle: "You're seconds away from a live, tenant-isolated workspace.",
  },
];

const BUSINESS_TYPES: {
  id: BusinessType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}[] = [
  {
    id: "gaming_lounge",
    label: "Gaming Lounge",
    description: "PCs, consoles, esports setups, and tournaments.",
    icon: Gamepad2,
    accent: "from-fuchsia-500 to-indigo-500",
  },
  {
    id: "gaming_turfs",
    label: "Gaming Turfs",
    description: "Cricket, football, and pickleball turf/court bookings.",
    icon: Trophy,
    accent: "from-emerald-500 to-cyan-500",
  },
  {
    id: "cafe",
    label: "Gaming Cafe",
    description: "Food + gaming. POS, kitchen, and delivery built in.",
    icon: Coffee,
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "arcade",
    label: "Arcade",
    description: "Classic arcade cabinets, redemption, token systems.",
    icon: Joystick,
    accent: "from-rose-500 to-pink-500",
  },
  {
    id: "billiards",
    label: "Billiards / Snooker",
    description: "Table-based sessions with per-hour or package pricing.",
    icon: Target,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "club",
    label: "Club / Lounge",
    description: "Membership-first operations with reservations.",
    icon: Building2,
    accent: "from-sky-500 to-cyan-500",
  },
  {
    id: "bowling",
    label: "Bowling",
    description: "Lane bookings, shoe rentals, leagues.",
    icon: Trophy,
    accent: "from-yellow-500 to-amber-500",
  },
  {
    id: "other",
    label: "Something else",
    description: "Tell us later — the defaults still cover you.",
    icon: Sparkles,
    accent: "from-purple-500 to-indigo-500",
  },
];

const COLOR_PRESETS: { primary: string; accent: string; name: string }[] = [
  { name: "Fuchsia Rush", primary: "#d946ef", accent: "#6366f1" },
  { name: "Midnight Neon", primary: "#8b5cf6", accent: "#06b6d4" },
  { name: "Sunset Arcade", primary: "#f43f5e", accent: "#f59e0b" },
  { name: "Emerald Drift", primary: "#10b981", accent: "#0ea5e9" },
  { name: "Gold Crown", primary: "#eab308", accent: "#f97316" },
  { name: "Classic Black", primary: "#1f2937", accent: "#64748b" },
];

const DEFAULT_PRIMARY = "#d946ef";
const DEFAULT_ACCENT = "#6366f1";

interface OnboardingState {
  displayName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  iconUrl: string;
  businessType: BusinessType | "";
  station: SetupStation | null;
  product: SetupProduct | null;
  firstCustomerName: string;
  firstCustomerPhone: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgCtx = useOrganizationOptional();
  const organization = orgCtx?.organization ?? null;

  const prefersReducedMotion = useReducedMotion();
  const [stepIdx, setStepIdx] = useState(0);
  const [setupSubStep, setSetupSubStep] = useState<0 | 1 | 2>(0);
  const [setupDirection, setSetupDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [customerSkipped, setCustomerSkipped] = useState(false);
  const [logoUploadBounce, setLogoUploadBounce] = useState(false);
  const fileLogoRef = useRef<HTMLInputElement>(null);
  const fileIconRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<OnboardingState>({
    displayName: organization?.name ?? "",
    tagline: "",
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
    logoUrl: "",
    iconUrl: "",
    businessType: "",
    station: null,
    product: null,
    firstCustomerName: "",
    firstCustomerPhone: "",
  });

  // Hydrate state from any previously-saved branding when the org context lands.
  useEffect(() => {
    if (!organization) return;
    const branding = (organization.branding ?? {}) as Record<string, string | undefined>;
    setState((prev) => ({
      ...prev,
      displayName: prev.displayName || branding.display_name || organization.name || "",
      tagline: prev.tagline || branding.tagline || "",
      primaryColor: branding.primary_color || prev.primaryColor,
      accentColor: branding.accent_color || prev.accentColor,
      logoUrl: branding.logo_url || prev.logoUrl,
      iconUrl: branding.icon_url || prev.iconUrl,
      businessType: (organization.businessType as BusinessType) || prev.businessType,
    }));
    if (organization.onboardingCompletedAt) {
      navigate("/dashboard", { replace: true });
    }
  }, [organization, navigate]);

  useEffect(() => {
    if (!state.businessType) return;
    const preset = getBusinessPreset(state.businessType);
    setState((prev) => ({
      ...prev,
      station: {
        name: preset.station.name,
        type: preset.station.type,
        hourlyRate: preset.station.hourlyRate,
      },
      product: { ...preset.product },
    }));
  }, [state.businessType]);

  const step = STEPS[stepIdx];

  useEffect(() => {
    if (step.id === "setup") {
      setSetupSubStep(0);
      setSetupDirection(1);
    }
  }, [step.id]);
  const isLast = stepIdx === STEPS.length - 1;

  const saveStep = useCallback(
    async (body: Partial<OnboardingState> & { complete?: boolean; step?: StepId }) => {
      const payload: Record<string, unknown> = {};
      if (body.step) payload.step = body.step;
      if (body.complete) payload.complete = true;
      if (body.displayName !== undefined) payload.displayName = body.displayName;
      if (body.tagline !== undefined) payload.tagline = body.tagline;
      if (body.primaryColor !== undefined) payload.primaryColor = body.primaryColor;
      if (body.accentColor !== undefined) payload.accentColor = body.accentColor;
      if (body.logoUrl !== undefined) payload.logoUrl = body.logoUrl;
      if (body.iconUrl !== undefined) payload.iconUrl = body.iconUrl;
      if (body.businessType !== undefined) payload.businessType = body.businessType;

      const res = await fetch("/api/tenant/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `Save failed (${res.status})`);
      }
      return json;
    },
    [],
  );

  const submitBootstrap = useCallback(async () => {
    const categories = [
      ...new Set(
        [state.product?.category, "uncategorized"].filter((c): c is string => Boolean(c)),
      ),
    ];
    const payload = {
      categories,
      stations: state.station
        ? [
            {
              name: state.station.name,
              type: state.station.type,
              hourlyRate: state.station.hourlyRate,
              category: "regular",
            },
          ]
        : [],
      products: state.product ? [state.product] : [],
      firstCustomerName: customerSkipped ? "" : state.firstCustomerName,
      firstCustomerPhone: customerSkipped ? "" : state.firstCustomerPhone,
    };
    const res = await fetch("/api/tenant/onboarding-bootstrap", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `Bootstrap failed (${res.status})`);
    }
    return json;
  }, [
    customerSkipped,
    state.firstCustomerName,
    state.firstCustomerPhone,
    state.product,
    state.station,
  ]);

  async function handleFileUpload(file: File, kind: "logo" | "icon") {
    if (file.size > 512 * 1024) {
      appToast.error("Too large", "Please keep the file under 512KB.");
      return null;
    }
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    const res = await fetch("/api/tenant/branding-upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `Upload failed (${res.status})`);
    }
    return json.url as string;
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const url = await handleFileUpload(file, "logo");
      if (url) {
        setState((s) => ({ ...s, logoUrl: url }));
        setLogoUploadBounce(true);
        setTimeout(() => setLogoUploadBounce(false), 600);
        appToast.success("Logo uploaded", "Looking sharp.");
      }
    } catch (err) {
      appToast.error("Upload failed", (err as Error).message);
    } finally {
      setUploadingLogo(false);
      if (fileLogoRef.current) fileLogoRef.current.value = "";
    }
  }

  async function onIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingIcon(true);
      const url = await handleFileUpload(file, "icon");
      if (url) {
        setState((s) => ({ ...s, iconUrl: url }));
        appToast.success("Icon uploaded", "Perfect square.");
      }
    } catch (err) {
      appToast.error("Upload failed", (err as Error).message);
    } finally {
      setUploadingIcon(false);
      if (fileIconRef.current) fileIconRef.current.value = "";
    }
  }

  async function goNext() {
    if (saving) return;
    setSaving(true);
    try {
      if (step.id === "profile") {
        if (!state.displayName.trim()) {
          appToast.error("Missing", "Give your workspace a display name.");
          setSaving(false);
          return;
        }
        await saveStep({
          step: "profile",
          displayName: state.displayName,
          tagline: state.tagline,
        });
      } else if (step.id === "brand") {
        await saveStep({
          step: "brand",
          primaryColor: state.primaryColor,
          accentColor: state.accentColor,
          logoUrl: state.logoUrl,
          iconUrl: state.iconUrl,
        });
      } else if (step.id === "business") {
        if (!state.businessType) {
          appToast.error("Pick one", "Choose a business type to continue.");
          setSaving(false);
          return;
        }
        await saveStep({ step: "business", businessType: state.businessType });
      } else if (step.id === "setup") {
        if (setupSubStep === 0) {
          const station = state.station;
          if (!station?.name.trim() || !station.type) {
            appToast.error("Name your station", "Give your first station a name to continue.");
            setSaving(false);
            return;
          }
          setSetupDirection(1);
          setSetupSubStep(1);
          setSaving(false);
          return;
        }
        if (setupSubStep === 1) {
          const product = state.product;
          if (!product?.name.trim()) {
            appToast.error("Name your product", "Add a product name to continue.");
            setSaving(false);
            return;
          }
          if (!product.price || product.price <= 0) {
            appToast.error("Set a price", "Enter a price greater than zero.");
            setSaving(false);
            return;
          }
          setSetupDirection(1);
          setSetupSubStep(2);
          setSaving(false);
          return;
        }
        if (!customerSkipped && state.firstCustomerName.trim()) {
          const digits = state.firstCustomerPhone.replace(/\D/g, "");
          const isValidPhone = digits.length === 10 || (digits.length === 12 && digits.startsWith("91"));
          if (!isValidPhone) {
            appToast.error(
              "Missing customer phone",
              "Enter a valid 10-digit number (or +91 format) for the first customer, or skip this step.",
            );
            setSaving(false);
            return;
          }
        }
      } else if (step.id === "preview") {
        // pure client step — nothing to persist.
      } else if (step.id === "launch") {
        await submitBootstrap();
        await saveStep({ complete: true });
        await orgCtx?.refresh();
        appToast.success("You're in!", "Welcome to Cuetronix.");
        navigate("/dashboard", { replace: true });
        return;
      }
      setStepIdx((idx) => Math.min(idx + 1, STEPS.length - 1));
    } catch (err) {
      appToast.error("Couldn't save", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (saving) return;
    if (step.id === "setup" && setupSubStep > 0) {
      setSetupDirection(-1);
      setSetupSubStep((s) => (s - 1) as 0 | 1 | 2);
      return;
    }
    setStepIdx((idx) => Math.max(idx - 1, 0));
  }

  const resetProductToPreset = useCallback(() => {
    const preset = getBusinessPreset(state.businessType);
    setState((prev) => ({ ...prev, product: { ...preset.product } }));
  }, [state.businessType]);

  // Live preview swatch (computed from state)
  const previewGradient = useMemo(
    () => `linear-gradient(135deg, ${state.primaryColor}, ${state.accentColor})`,
    [state.primaryColor, state.accentColor],
  );

  const renderStep = () => {
    switch (step.id) {
      case "profile":
        return (
          <motion.div
            className="space-y-5"
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Display name
              </Label>
              <Input
                autoFocus
                placeholder="Pixel Arena Bangalore"
                value={state.displayName}
                onChange={(e) => setState((s) => ({ ...s, displayName: e.target.value }))}
                className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25 animate-[pulse_2s_ease-in-out_1]"
              />
              <p className="text-[11px] text-zinc-500">
                Shown on your login page, receipts, and public booking page.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Tagline <span className="font-normal normal-case text-zinc-600">(optional)</span>
              </Label>
              <Input
                placeholder="Where legends play."
                maxLength={160}
                value={state.tagline}
                onChange={(e) => setState((s) => ({ ...s, tagline: e.target.value }))}
                className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25"
              />
              <p className="text-right text-[11px] text-zinc-500">{state.tagline.length}/160</p>
            </div>
          </motion.div>
        );

      case "brand":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <motion.div animate={logoUploadBounce ? { scale: [1, 1.04, 1] } : { scale: 1 }}>
                <BrandUploader
                  label="Logo"
                  hint="PNG/SVG · max 512KB"
                  currentUrl={state.logoUrl}
                  onPick={() => fileLogoRef.current?.click()}
                  onClear={() => setState((s) => ({ ...s, logoUrl: "" }))}
                  uploading={uploadingLogo}
                  square={false}
                  inputRef={fileLogoRef}
                  onChange={onLogoChange}
                />
              </motion.div>
              <BrandUploader
                label="Icon"
                hint="Square · 128×128+"
                currentUrl={state.iconUrl}
                onPick={() => fileIconRef.current?.click()}
                onClear={() => setState((s) => ({ ...s, iconUrl: "" }))}
                uploading={uploadingIcon}
                square
                inputRef={fileIconRef}
                onChange={onIconChange}
              />
            </div>

            {/* presets */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Theme presets
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((p) => {
                  const active =
                    state.primaryColor.toLowerCase() === p.primary.toLowerCase() &&
                    state.accentColor.toLowerCase() === p.accent.toLowerCase();
                  return (
                    <motion.button
                      type="button"
                      key={p.name}
                      whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                      onClick={() =>
                        setState((s) => ({ ...s, primaryColor: p.primary, accentColor: p.accent }))
                      }
                      className={`group rounded-xl border bg-white/[0.03] p-2.5 text-left backdrop-blur-sm transition-all ${
                        active
                          ? "border-fuchsia-300/40 ring-2 ring-fuchsia-400/30"
                          : "border-white/10 hover:border-white/30 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div
                        className="h-6 w-full rounded-md"
                        style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }}
                      />
                      <div className="mt-1.5 text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200">
                        {p.name}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* custom hex */}
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Primary color"
                value={state.primaryColor}
                onChange={(v) => setState((s) => ({ ...s, primaryColor: v }))}
              />
              <ColorField
                label="Accent color"
                value={state.accentColor}
                onChange={(v) => setState((s) => ({ ...s, accentColor: v }))}
              />
            </div>
          </div>
        );

      case "business":
        return (
          <motion.div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            variants={prefersReducedMotion ? undefined : staggerContainer}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="show"
          >
            {BUSINESS_TYPES.map((bt) => {
              const Icon = bt.icon;
              const active = state.businessType === bt.id;
              return (
                <motion.button
                  key={bt.id}
                  type="button"
                  variants={prefersReducedMotion ? undefined : staggerItem}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  onClick={() => setState((s) => ({ ...s, businessType: bt.id }))}
                  className={`relative overflow-hidden rounded-xl border p-4 text-left backdrop-blur-sm transition-all ${
                    active
                      ? "border-fuchsia-300/40 bg-white/[0.06] ring-2 ring-fuchsia-400/30"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
                  }`}
                >
                  <div
                    className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br blur-2xl opacity-40 ${bt.accent}`}
                  />
                  <div className="relative flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${bt.accent}`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                        {bt.label}
                        {active && <CheckCircle2 className="h-4 w-4 text-fuchsia-400" />}
                      </div>
                      <div className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                        {bt.description}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        );

      case "setup":
        return (
          <SetupGuidedFlow
            businessType={state.businessType}
            subStep={setupSubStep}
            direction={setupDirection}
            station={state.station}
            product={state.product}
            firstCustomerName={state.firstCustomerName}
            firstCustomerPhone={state.firstCustomerPhone}
            customerSkipped={customerSkipped}
            primaryColor={state.primaryColor}
            accentColor={state.accentColor}
            onStationChange={(station) => setState((s) => ({ ...s, station }))}
            onProductChange={(product) => setState((s) => ({ ...s, product }))}
            onCustomerNameChange={(firstCustomerName) =>
              setState((s) => ({ ...s, firstCustomerName }))
            }
            onCustomerPhoneChange={(firstCustomerPhone) =>
              setState((s) => ({ ...s, firstCustomerPhone }))
            }
            onCustomerSkippedChange={setCustomerSkipped}
            onResetProduct={resetProductToPreset}
          />
        );

      case "preview":
        return (
          <OnboardingDashboardPreview
            displayName={state.displayName}
            tagline={state.tagline}
            logoUrl={state.logoUrl}
            iconUrl={state.iconUrl}
            primaryColor={state.primaryColor}
            accentColor={state.accentColor}
            station={state.station}
            product={state.product}
            firstCustomerName={state.firstCustomerName}
            customerSkipped={customerSkipped}
          />
        );

      case "launch":
        return (
          <div className="relative py-6 text-center">
            {!prefersReducedMotion &&
              Array.from({ length: 8 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                  style={{
                    background: i % 2 === 0 ? state.primaryColor : state.accentColor,
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((i / 8) * Math.PI * 2) * (60 + i * 12),
                    y: Math.sin((i / 8) * Math.PI * 2) * (60 + i * 12),
                    opacity: 0,
                    scale: 0.3,
                  }}
                  transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                />
              ))}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="relative mx-auto h-24 w-24"
            >
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-70"
                style={{ background: previewGradient }}
              />
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 shadow-2xl"
                style={{ background: previewGradient }}
              >
                <Rocket className="h-10 w-10 text-white" />
              </div>
            </motion.div>
            <h3 className="mt-6 text-2xl font-bold text-white">
              You're all set, {user?.username || "operator"}.
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
              We&apos;ll hand you the keys to your workspace. Your first station is ready — add more
              anytime from <strong className="text-zinc-300">Stations</strong>, invite your team,
              and start taking bookings.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              14-day free trial active · no card needed
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-zinc-100">
      {/* Shared animated galaxy / gradient background (same as landing, login, signup) */}
      <SiteAmbientBackground />

      {/* Soft brand-tinted wash so the wizard feels personalised without
          clashing with the shared ambient background */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: `radial-gradient(ellipse 60% 60% at 85% 15%, ${state.accentColor}22 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-xl blur-lg"
                style={{ background: `${state.primaryColor}66` }}
              />
              <div
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 shadow-md"
                style={{ background: previewGradient }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
                Cuetronix
              </div>
              <div className="text-sm font-bold leading-tight">First-run setup</div>
            </div>
          </div>

          {/* Stepper */}
          <ol className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <li key={s.id} className="flex items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-all ${
                      done
                        ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-200"
                        : active
                          ? "border-fuchsia-300/60 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-md shadow-fuchsia-600/50"
                          : "border-white/15 bg-transparent text-zinc-500"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-[2px] w-4 transition-all sm:w-8 ${
                        done
                          ? "bg-emerald-400/50"
                          : active
                            ? "bg-gradient-to-r from-fuchsia-400/60 to-white/10"
                            : "bg-white/10"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* ── Step content ── */}
        <div className="flex flex-1 items-center justify-center p-5 sm:p-10">
          <div className={`w-full ${step.id === "preview" ? "max-w-4xl" : "max-w-2xl"}`}>
            {/* Heading */}
            <div className="mb-6 text-center">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                <Sparkles size={10} />
                Step {stepIdx + 1} of {STEPS.length}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {step.label}
                  </h2>
                  <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
                    {step.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Glass card */}
            <div className="relative">
              {/* Gradient halo behind card */}
              <div
                className="absolute -inset-px rounded-[26px] opacity-60 blur-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.35), rgba(59,130,246,0.25))",
                }}
              />
              <div
                className="relative overflow-hidden rounded-[24px] border border-white/10 p-6 sm:p-8"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(15,9,26,0.85) 0%, rgba(10,6,22,0.9) 100%)",
                  backdropFilter: "blur(32px) saturate(150%)",
                  WebkitBackdropFilter: "blur(32px) saturate(150%)",
                  boxShadow:
                    "0 30px 80px -30px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {/* Top shine */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 50%, transparent 100%)",
                  }}
                />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Nav */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={stepIdx === 0 || saving}
                className="rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 backdrop-blur-md hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>

              <Button
                type="button"
                onClick={goNext}
                disabled={saving}
                className="group h-11 rounded-xl px-6 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                style={{
                  background: previewGradient,
                  boxShadow: `0 10px 30px -10px ${state.primaryColor}99`,
                }}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLast ? "Enter my workspace" : "Continue"}
                {!saving && !isLast && (
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                )}
                {!saving && isLast && <Rocket className="ml-1.5 h-4 w-4" />}
              </Button>
            </div>

            {/* Footer note */}
            <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Branding/business settings save as you go. Setup data is applied on launch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// subcomponents
// ─────────────────────────────────────────────────────────────────────────────

interface BrandUploaderProps {
  label: string;
  hint: string;
  currentUrl: string;
  square: boolean;
  uploading: boolean;
  onPick: () => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BrandUploader: React.FC<BrandUploaderProps> = ({
  label,
  hint,
  currentUrl,
  square,
  uploading,
  onPick,
  onClear,
  inputRef,
  onChange,
}) => {
  return (
    <div>
      <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </Label>
      <div className="group relative mt-2">
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className={`relative w-full overflow-hidden rounded-xl border-2 border-dashed border-white/10 bg-white/[0.03] backdrop-blur-md transition-all hover:border-fuchsia-300/40 hover:bg-white/[0.05] ${
            square ? "aspect-square" : "aspect-[16/9]"
          }`}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt=""
              className="absolute inset-0 h-full w-full bg-white/5 object-contain"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-zinc-500">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-fuchsia-300" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <div className="text-[11px] font-medium">
                {uploading ? "Uploading…" : "Click to upload"}
              </div>
            </div>
          )}
        </button>
        {currentUrl && !uploading && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
          onChange={onChange}
          className="hidden"
        />
      </div>
      <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
        <ImageIcon className="h-3 w-3" />
        {hint}
      </p>
    </div>
  );
};

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange }) => {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        <PaintBucket className="h-3 w-3" />
        {label}
      </Label>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 pl-2 backdrop-blur-md focus-within:border-fuchsia-300/40">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (/^#[0-9a-fA-F]{0,6}$/.test(raw)) onChange(raw);
          }}
          className="flex-1 bg-transparent font-mono text-sm uppercase text-zinc-100 outline-none"
          maxLength={7}
        />
      </div>
    </div>
  );
};
