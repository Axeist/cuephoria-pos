/**
 * /signup — self-service tenant provisioning.
 *
 * Owner fills in a single-page form: workspace name (slug auto-suggests),
 * owner username + password, email (optional), timezone. On success we get
 * a session cookie back from /api/tenant/signup and redirect straight into
 * the onboarding wizard.
 *
 * Visual language matches the public landing / Login page — deep purple
 * radial glows, glass card, gradient accents.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Gamepad2,
  Globe,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { appToast } from "@/lib/appToast";
import GoogleButton from "@/components/auth/GoogleButton";

type PasswordRule = { id: string; label: string; test: (pw: string) => boolean };

const PASSWORD_RULES: PasswordRule[] = [
  { id: "len", label: "At least 10 characters", test: (p) => p.length >= 10 },
  { id: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "A digit", test: (p) => /\d/.test(p) },
];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function Signup() {
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null);

  useEffect(() => {
    // Detect user's timezone on mount, silently default to it if supported.
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && TIMEZONES.includes(tz)) setTimezone(tz);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(organizationName));
    }
  }, [organizationName, slugTouched]);

  const strength = useMemo(() => {
    const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
    return (passed / PASSWORD_RULES.length) * 100;
  }, [password]);

  const canSubmit =
    organizationName.trim().length >= 2 &&
    /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) &&
    /^[a-z0-9][a-z0-9._-]{2,31}$/i.test(username) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    PASSWORD_RULES.every((r) => r.test(password)) &&
    acceptedTerms &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFieldError(null);
    try {
      const res = await fetch("/api/tenant/signup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          slug,
          username: username.trim(),
          password,
          email: email.trim() || undefined,
          timezone,
          acceptedTerms,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        const message: string = json?.error || `Signup failed (${res.status})`;
        if (typeof json?.field === "string") {
          setFieldError({ field: json.field, message });
        }
        appToast.error("Could not create workspace", message);
        setSubmitting(false);
        return;
      }
      appToast.success("Workspace created", "Let's make it yours — just a few steps.");
      // The signup endpoint issues the session cookie. Navigate straight to
      // the onboarding wizard; ProtectedRoute will gate the user there too.
      navigate("/onboarding", { replace: true });
    } catch (err) {
      appToast.error("Something went wrong", (err as Error)?.message || "Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 relative overflow-hidden">
      {/* Background layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #0f0520 0%, #080b1a 50%, #050508 100%)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 15% 25%, rgba(139,92,246,0.22) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute top-1/4 right-0 w-[480px] h-[480px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 flex min-h-screen">
        {/* ── LEFT: hero copy ──────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[50%] flex-col justify-between p-12 xl:p-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-lg"
                style={{ background: "rgba(139,92,246,0.4)" }}
              />
              <div className="relative h-11 w-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-fuchsia-500 to-indigo-500">
                <Gamepad2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <span className="text-white font-extrabold text-xl tracking-tight block leading-none">
                Cuetronix
              </span>
              <span className="text-purple-300 text-[10px] tracking-[0.18em] uppercase font-medium">
                Run it like the best
              </span>
            </div>
          </Link>

          <div className="max-w-[460px]">
            <div
              className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide"
              style={{
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.2)",
                color: "#a78bfa",
              }}
            >
              <Sparkles className="w-3 h-3" />
              14-day free trial · no credit card
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.08] tracking-[-0.02em] mb-6">
              Launch your<br />
              <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-sky-400 bg-clip-text text-transparent">
                gaming empire
              </span><br />
              in minutes.
            </h1>

            <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
              Bookings, POS, staff, loyalty, tournaments — everything your gaming
              lounge, club, or cafe needs. One workspace, your brand, your rules.
            </p>

            <div className="space-y-3">
              {[
                "Your own branded login page in 2 minutes",
                "Unlimited stations + customers during trial",
                "Razorpay billing integrated, no hidden fees",
                "Export everything, lock-in free",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-4">
            <Link to="/privacy" className="hover:text-zinc-300">Privacy</Link>
            <Link to="/terms" className="hover:text-zinc-300">Terms</Link>
            <Link to="/contact" className="hover:text-zinc-300">Contact</Link>
          </div>
        </div>

        {/* ── RIGHT: form card ────────────────────────────────────────── */}
        <div className="w-full lg:w-[50%] flex items-center justify-center p-5 sm:p-10">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[460px] space-y-5 rounded-2xl border border-white/10 bg-[#0b0c16]/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl"
          >
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold">Create your workspace</h2>
              <p className="text-sm text-zinc-400">
                Already on Cuetronix?{" "}
                <Link to="/login" className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Workspace */}
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Workspace name
              </Label>
              <Input
                id="organizationName"
                required
                autoFocus
                placeholder="e.g. Pixel Arena Bangalore"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="bg-[#05060c] border-white/10 text-zinc-100 h-11"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center justify-between">
                <span>Workspace URL</span>
                <span className="text-[10px] text-zinc-500 normal-case tracking-normal">Your branded login address</span>
              </Label>
              <div className="flex items-center rounded-md border border-white/10 bg-[#05060c] overflow-hidden h-11">
                <div className="px-3 text-xs text-zinc-500 border-r border-white/10 select-none">cuetronix.app/app/t/</div>
                <input
                  id="slug"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugTouched(true);
                  }}
                  placeholder="pixel-arena"
                  className="flex-1 bg-transparent text-sm text-zinc-100 outline-none px-2 h-full"
                />
              </div>
              {fieldError?.field === "slug" && (
                <p className="text-xs text-rose-400">{fieldError.message}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Owner username
              </Label>
              <Input
                id="username"
                required
                placeholder="anish_owner"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#05060c] border-white/10 text-zinc-100 h-11 font-mono"
              />
              {fieldError?.field === "username" && (
                <p className="text-xs text-rose-400">{fieldError.message}</p>
              )}
            </div>

            {/* Email (required for receipts + password recovery) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                Contact email
              </Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="owner@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#05060c] border-white/10 text-zinc-100 h-11"
              />
              <p className="text-[10px] text-zinc-500">We'll send a verification link, billing receipts, and security alerts here.</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Use a strong, unique password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#05060c] border-white/10 text-zinc-100 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* strength bar */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strength < 50
                      ? "bg-rose-500"
                      : strength < 100
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${strength}%` }}
                />
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-1.5 ${ok ? "text-emerald-400" : "text-zinc-500"}`}
                    >
                      <CheckCircle2 className={`h-3 w-3 ${ok ? "opacity-100" : "opacity-40"}`} />
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                Timezone
              </Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-11 px-3 rounded-md bg-[#05060c] border border-white/10 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-xs text-zinc-400 leading-relaxed font-normal cursor-pointer">
                I agree to Cuetronix's{" "}
                <Link to="/terms" className="text-fuchsia-400 hover:text-fuchsia-300">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-fuchsia-400 hover:text-fuchsia-300">Privacy Policy</Link>.
              </Label>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-11 bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-fuchsia-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Provisioning your workspace…
                </>
              ) : (
                <>
                  Create workspace
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Encrypted at rest · PBKDF2 passwords · 2FA ready
            </p>
          </form>

          {/* Google sign-up alternative */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <GoogleButton intent="signup" />
            <p className="mt-3 text-[11px] text-zinc-500 text-center">
              Already have a workspace?{" "}
              <Link to="/login" className="text-fuchsia-400 hover:text-fuchsia-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
