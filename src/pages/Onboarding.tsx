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
 *   4. Preview  — live preview of dashboard header with chosen brand.
 *   5. Launch   — call /api/tenant/onboarding with complete=true,
 *                 refresh org context, navigate to /dashboard.
 *
 * Everything is saved step-by-step, so if the owner drops off midway and
 * comes back later they resume with the state they left behind.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { appToast } from "@/lib/appToast";
import { useAuth } from "@/context/AuthContext";
import { useOrganizationOptional } from "@/context/OrganizationContext";

type StepId = "profile" | "brand" | "business" | "preview" | "launch";

const STEPS: { id: StepId; label: string; short: string }[] = [
  { id: "profile", label: "Your workspace", short: "Profile" },
  { id: "brand", label: "Brand it yours", short: "Brand" },
  { id: "business", label: "Your business", short: "Business" },
  { id: "preview", label: "Looking great", short: "Preview" },
  { id: "launch", label: "Ready to launch", short: "Launch" },
];

type BusinessType =
  | "gaming_lounge"
  | "cafe"
  | "arcade"
  | "club"
  | "billiards"
  | "bowling"
  | "other";

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
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgCtx = useOrganizationOptional();
  const organization = orgCtx?.organization ?? null;

  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
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
    // If they already completed onboarding, skip straight to the dashboard.
    if (organization.onboardingCompletedAt) {
      navigate("/dashboard", { replace: true });
    }
  }, [organization, navigate]);

  const step = STEPS[stepIdx];
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
      } else if (step.id === "preview") {
        // pure client step — nothing to persist.
      } else if (step.id === "launch") {
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
    setStepIdx((idx) => Math.max(idx - 1, 0));
  }

  // Live preview swatch (computed from state)
  const previewGradient = useMemo(
    () => `linear-gradient(135deg, ${state.primaryColor}, ${state.accentColor})`,
    [state.primaryColor, state.accentColor],
  );

  const renderStep = () => {
    switch (step.id) {
      case "profile":
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Display name
              </Label>
              <Input
                autoFocus
                placeholder="Pixel Arena Bangalore"
                value={state.displayName}
                onChange={(e) => setState((s) => ({ ...s, displayName: e.target.value }))}
                className="h-11 bg-[#05060c] border-white/10"
              />
              <p className="text-[11px] text-zinc-500">
                Shown on your login page, receipts, and public booking page.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Tagline <span className="text-zinc-600 font-normal normal-case">(optional)</span>
              </Label>
              <Input
                placeholder="Where legends play."
                maxLength={160}
                value={state.tagline}
                onChange={(e) => setState((s) => ({ ...s, tagline: e.target.value }))}
                className="h-11 bg-[#05060c] border-white/10"
              />
              <p className="text-[11px] text-zinc-500 text-right">{state.tagline.length}/160</p>
            </div>
          </div>
        );

      case "brand":
        return (
          <div className="space-y-6">
            {/* logo / icon */}
            <div className="grid grid-cols-2 gap-4">
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
              <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Theme presets
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((p) => {
                  const active =
                    state.primaryColor.toLowerCase() === p.primary.toLowerCase() &&
                    state.accentColor.toLowerCase() === p.accent.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={p.name}
                      onClick={() =>
                        setState((s) => ({ ...s, primaryColor: p.primary, accentColor: p.accent }))
                      }
                      className={`group rounded-lg border p-2.5 text-left transition-all ${
                        active
                          ? "border-white/40 ring-2 ring-white/20"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div
                        className="h-6 w-full rounded"
                        style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }}
                      />
                      <div className="mt-1.5 text-[11px] text-zinc-400 group-hover:text-zinc-200 font-medium">
                        {p.name}
                      </div>
                    </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((bt) => {
              const Icon = bt.icon;
              const active = state.businessType === bt.id;
              return (
                <button
                  key={bt.id}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, businessType: bt.id }))}
                  className={`relative overflow-hidden text-left rounded-xl border p-4 transition-all ${
                    active
                      ? "border-white/30 bg-white/5 ring-2 ring-fuchsia-500/40"
                      : "border-white/10 hover:border-white/25 hover:bg-white/5"
                  }`}
                >
                  <div
                    className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-40 bg-gradient-to-br ${bt.accent}`}
                  />
                  <div className="relative flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${bt.accent}`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                        {bt.label}
                        {active && <CheckCircle2 className="h-4 w-4 text-fuchsia-400" />}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                        {bt.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case "preview":
        return (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Here's how your branded dashboard will look the moment you launch.
            </p>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              {/* Fake dashboard header */}
              <div
                className="p-5 flex items-center gap-4"
                style={{ background: previewGradient }}
              >
                {state.iconUrl ? (
                  <img
                    src={state.iconUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover bg-white/20"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/20">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-white font-bold text-lg leading-tight truncate">
                    {state.displayName || "Your workspace"}
                  </div>
                  {state.tagline && (
                    <div className="text-white/80 text-xs truncate">{state.tagline}</div>
                  )}
                </div>
                <div className="ml-auto flex gap-2">
                  <div className="h-9 w-9 rounded-full bg-white/20" />
                </div>
              </div>
              {/* Fake widget row */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[#0b0c16]">
                {[
                  { label: "Today", value: "₹12,480" },
                  { label: "Active", value: "8 / 10" },
                  { label: "Bookings", value: "17" },
                ].map((w) => (
                  <div
                    key={w.label}
                    className="rounded-lg border border-white/10 p-3 bg-[#05060c]"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                      {w.label}
                    </div>
                    <div
                      className="text-xl font-bold mt-1"
                      style={{ color: state.primaryColor }}
                    >
                      {w.value}
                    </div>
                  </div>
                ))}
              </div>
              {/* Fake logo panel */}
              {state.logoUrl && (
                <div className="p-5 bg-[#05060c] border-t border-white/5 flex items-center justify-center">
                  <img src={state.logoUrl} alt="" className="max-h-12 opacity-90" />
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              You can tweak all of this anytime from <strong>Settings → Organization</strong>.
            </p>
          </div>
        );

      case "launch":
        return (
          <div className="text-center py-8">
            <div
              className="h-20 w-20 mx-auto rounded-full flex items-center justify-center"
              style={{ background: previewGradient }}
            >
              <Rocket className="h-10 w-10 text-white" />
            </div>
            <h3 className="mt-6 text-2xl font-bold">You're all set, {user?.username || "owner"}.</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-sm mx-auto">
              We'll now hand you the keys to your workspace. You can invite your team,
              add stations, and start taking bookings in the next couple of minutes.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs text-zinc-500 px-3 py-1.5 rounded-full border border-white/10">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              14-day free trial active · no card needed
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 relative overflow-hidden">
      {/* background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #0f0520 0%, #080b1a 50%, #050508 100%)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 15% 25%, ${state.primaryColor}22 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute top-1/2 right-0 w-[480px] h-[480px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: `radial-gradient(circle, ${state.accentColor}33, transparent)` }}
      />
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Header with step indicator ───────────────────────────────── */}
        <div className="flex items-center justify-between px-5 sm:px-10 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-lg"
                style={{ background: `${state.primaryColor}66` }}
              />
              <div
                className="relative h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: previewGradient }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Cuetronix</div>
              <div className="font-bold text-sm leading-tight">First-run setup</div>
            </div>
          </div>

          <ol className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex items-center">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${
                    i < stepIdx
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : i === stepIdx
                        ? "bg-white text-[#0b0c16] border-white"
                        : "bg-transparent border-white/15 text-zinc-500"
                  }`}
                >
                  {i < stepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-[2px] w-4 sm:w-8 transition-all ${
                      i < stepIdx ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* ── Step content ─────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-5 sm:p-10">
          <div className="w-full max-w-2xl">
            <div className="mb-6 text-center">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Step {stepIdx + 1} of {STEPS.length}
              </div>
              <h2 className="text-3xl font-bold">{step.label}</h2>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b0c16]/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
              {renderStep()}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={stepIdx === 0 || saving}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                type="button"
                onClick={goNext}
                disabled={saving}
                className="h-11 px-6 font-semibold text-white shadow-lg"
                style={{
                  background: previewGradient,
                  boxShadow: `0 8px 24px -8px ${state.primaryColor}88`,
                }}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isLast ? "Enter my workspace" : "Continue"}
                {!saving && !isLast && <ArrowRight className="h-4 w-4 ml-1.5" />}
                {!saving && isLast && <Rocket className="h-4 w-4 ml-1.5" />}
              </Button>
            </div>
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
      <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </Label>
      <div className="mt-2 relative group">
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className={`relative w-full rounded-lg border-2 border-dashed border-white/10 bg-[#05060c] hover:border-white/30 transition-all overflow-hidden ${
            square ? "aspect-square" : "aspect-[16/9]"
          }`}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-contain bg-white/5"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-1.5">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
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
            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center"
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
      <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
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
      <Label className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
        <PaintBucket className="h-3 w-3" />
        {label}
      </Label>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-white/10 bg-[#05060c] p-1.5 pl-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (/^#[0-9a-fA-F]{0,6}$/.test(raw)) onChange(raw);
          }}
          className="flex-1 bg-transparent text-sm text-zinc-100 outline-none font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
};
