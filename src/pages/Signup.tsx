/**
 * /signup — self-service tenant provisioning.
 *
 * Owner fills in a single-page form: workspace name (slug auto-suggests),
 * your name, email + password, timezone. On success we require email
 * verification before first login.
 *
 * Visual language matches the landing / login page: 3D ambient scene,
 * framer-motion entrance animations, glass card.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";

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

const PERKS = [
  "Your own branded login page in 2 minutes",
  "Unlimited stations & customers during trial",
  "Razorpay billing integrated, no hidden fees",
  "Export everything, lock-in free",
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
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<{ field?: string; message: string } | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [verificationEmailDispatched, setVerificationEmailDispatched] = useState(true);
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && TIMEZONES.includes(tz)) setTimezone(tz);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(organizationName));
  }, [organizationName, slugTouched]);

  const strength = useMemo(() => {
    const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
    return (passed / PASSWORD_RULES.length) * 100;
  }, [password]);

  const nameOk = displayName.trim().length === 0 || (displayName.trim().length >= 2 && displayName.trim().length <= 120);
  const canSubmit =
    organizationName.trim().length >= 2 &&
    /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) &&
    nameOk &&
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
          password,
          email: email.trim().toLowerCase(),
          displayName: displayName.trim() || undefined,
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
      const delivered = json?.verificationEmailDispatched === true;
      setVerificationEmailDispatched(delivered);
      appToast.success(
        "Workspace created",
        delivered
          ? "Check your inbox to verify your email before first login."
          : "Workspace created, but verification email delivery is delayed. Try signing in once to trigger resend.",
      );
      setCreatedEmail(typeof json?.email === "string" ? json.email : email.trim().toLowerCase());
      return;
    } catch (err) {
      appToast.error("Something went wrong", (err as Error)?.message || "Please try again.");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (resendCooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownSec]);

  async function handleResendVerification() {
    if (!createdEmail || resendSubmitting || resendCooldownSec > 0) return;
    setResendSubmitting(true);
    try {
      const res = await fetch("/api/public/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: createdEmail }),
      });
      const json = await res.json().catch(() => ({}));
      appToast.info(
        "Verification email status",
        typeof json?.message === "string"
          ? json.message
          : "If your account is still unverified, we sent a fresh verification link.",
      );
      setResendCooldownSec(30);
    } catch (err) {
      appToast.error("Couldn't resend right now", (err as Error)?.message || "Please try again.");
    } finally {
      setResendSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-zinc-100">
      {createdEmail ? (
        <div className="relative z-20 min-h-screen flex items-center justify-center px-5 sm:px-8">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-gradient-to-b from-[#121327]/95 to-[#0b0c18]/95 p-8 sm:p-10 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-600/40">
              <Mail className="h-7 w-7 text-white" />
            </div>
            <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
              Verify your email to unlock your workspace
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              {verificationEmailDispatched ? (
                <>
                  We sent a verification link to <span className="text-zinc-200 font-medium">{createdEmail}</span>.
                  Click it first, then sign in to access your new Cuetronix workspace.
                </>
              ) : (
                <>
                  Your workspace is ready, but we couldn&apos;t confirm email delivery right now for{" "}
                  <span className="text-zinc-200 font-medium">{createdEmail}</span>. Try signing in once to trigger a new verification email.
                </>
              )}
            </p>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-500">
              Tip: Check Promotions/Spam if it doesn&apos;t appear in 1–2 minutes.
            </div>
            <div className="mt-7 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Button
                className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white"
                onClick={() => navigate("/login")}
              >
                Go to sign in
              </Button>
              <Button
                variant="outline"
                className="border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10"
                disabled={resendSubmitting || resendCooldownSec > 0}
                onClick={handleResendVerification}
              >
                {resendSubmitting
                  ? "Resending..."
                  : resendCooldownSec > 0
                  ? `Resend in ${resendCooldownSec}s`
                  : "Resend verification email"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!createdEmail && (
        <>
      <AuthSceneBackground />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={12} /> Back to site
        </button>

        <button
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-gray-200 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          Already have a workspace? <span className="text-fuchsia-300">Sign in</span>
        </button>
      </div>

      {/* Grid */}
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-10 px-5 pb-12 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-20">
        {/* ── LEFT: pitch ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden flex-col justify-center lg:flex"
        >
          <Link to="/" className="group mb-10 inline-flex w-fit items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-violet-600/40">
              <Gamepad2 size={18} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight leading-none">
                Cue
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                  tronix
                </span>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
                Run it like the best
              </div>
            </div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200 backdrop-blur-md"
          >
            <Sparkles size={11} />
            14-day free trial · no credit card
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.55 }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-[56px]"
          >
            Launch your{" "}
            <span
              className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent"
              style={{
                backgroundSize: "200%",
                animation: "hueShift 8s ease-in-out infinite",
              }}
            >
              gaming empire
            </span>{" "}
            in minutes.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400"
          >
            Bookings, POS, staff, loyalty, tournaments — everything your gaming lounge,
            club, or cafe needs. One workspace, your brand, your rules.
          </motion.p>

          <div className="mt-8 space-y-2.5">
            {PERKS.map((perk, i) => (
              <motion.div
                key={perk}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.06, duration: 0.4 }}
                className="flex items-center gap-3 text-sm text-zinc-300"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                </div>
                {perk}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500"
          >
            <Link to="/privacy" className="transition-colors hover:text-zinc-300">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-zinc-300">
              Terms
            </Link>
            <Link to="/contact" className="transition-colors hover:text-zinc-300">
              Contact
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              All systems operational
            </span>
          </motion.div>
        </motion.div>

        {/* ── RIGHT: form ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex items-start justify-center lg:items-center"
        >
          <div className="relative w-full max-w-[480px]">
            <div
              className="absolute -inset-px rounded-[26px] opacity-60 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.35), rgba(59,130,246,0.25))",
              }}
            />

            <form
              onSubmit={handleSubmit}
              className="relative overflow-hidden rounded-[24px] border border-white/10 p-7 sm:p-8"
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,9,26,0.88) 0%, rgba(10,6,22,0.92) 100%)",
                backdropFilter: "blur(32px) saturate(150%)",
                WebkitBackdropFilter: "blur(32px) saturate(150%)",
                boxShadow:
                  "0 30px 80px -30px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.6) 50%, transparent 100%)",
                }}
              />

              {/* Mobile logo */}
              <div className="mb-5 flex items-center gap-2.5 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-violet-600/40">
                  <Gamepad2 size={17} className="text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight">
                  Cue
                  <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                    tronix
                  </span>
                </span>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
                  Create your workspace
                </h2>
                <p className="text-sm text-zinc-400">
                  Already on Cuetronix?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-violet-300 transition-colors hover:text-fuchsia-300"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {/* Workspace name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="organizationName"
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                  >
                    Workspace name
                  </Label>
                  <Input
                    id="organizationName"
                    required
                    autoFocus
                    placeholder="e.g. Pixel Arena Bangalore"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25"
                  />
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label
                    htmlFor="slug"
                    className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                  >
                    <span>Workspace URL</span>
                    <span className="text-[10px] normal-case tracking-normal text-zinc-500">
                      Your branded login address
                    </span>
                  </Label>
                  <div className="flex h-11 items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-fuchsia-300/40">
                    <div className="select-none border-r border-white/10 px-3 text-xs text-zinc-500">
                      cuetronix.app/app/t/
                    </div>
                    <input
                      id="slug"
                      required
                      value={slug}
                      onChange={(e) => {
                        setSlug(slugify(e.target.value));
                        setSlugTouched(true);
                      }}
                      placeholder="pixel-arena"
                      className="h-full flex-1 bg-transparent px-3 text-sm text-zinc-100 outline-none"
                    />
                  </div>
                  {fieldError?.field === "slug" && (
                    <p className="text-xs text-rose-400">{fieldError.message}</p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="displayName"
                      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                    >
                      <User className="h-3 w-3" />
                      Your name
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="e.g. Anish Kumar"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25"
                    />
                    {fieldError?.field === "displayName" && (
                      <p className="text-xs text-rose-400">{fieldError.message}</p>
                    )}
                    <p className="text-[11px] text-zinc-500">Optional; used in emails and your profile.</p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                    >
                      <Mail className="h-3 w-3" />
                      Email
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
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-zinc-100 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25"
                    />
                    {fieldError?.field === "email" && (
                      <p className="text-xs text-rose-400">{fieldError.message}</p>
                    )}
                    <p className="text-[11px] text-zinc-500">You’ll use this email to sign in.</p>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                  >
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
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pr-11 text-zinc-100 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-200"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      layout
                      className={`h-full transition-all duration-300 ${
                        strength < 50
                          ? "bg-rose-500"
                          : strength < 100
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-emerald-500 to-teal-400"
                      }`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px]">
                    {PASSWORD_RULES.map((rule) => {
                      const ok = rule.test(password);
                      return (
                        <li
                          key={rule.id}
                          className={`flex items-center gap-1.5 transition-colors ${
                            ok ? "text-emerald-400" : "text-zinc-500"
                          }`}
                        >
                          <CheckCircle2
                            className={`h-3 w-3 transition-opacity ${
                              ok ? "opacity-100" : "opacity-40"
                            }`}
                          />
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label
                    htmlFor="timezone"
                    className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
                  >
                    <Globe className="h-3 w-3" />
                    Timezone
                  </Label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 focus:border-fuchsia-300/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/25"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz} className="bg-[#0a0414]">
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(v) => setAcceptedTerms(Boolean(v))}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="terms"
                    className="cursor-pointer text-xs font-normal leading-relaxed text-zinc-400"
                  >
                    I agree to Cuetronix's{" "}
                    <Link to="/terms" className="text-fuchsia-400 hover:text-fuchsia-300">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-fuchsia-400 hover:text-fuchsia-300">
                      Privacy Policy
                    </Link>
                    .
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="group h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-sm font-semibold text-white shadow-lg shadow-fuchsia-600/30 transition-all hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Provisioning your workspace…
                    </>
                  ) : (
                    <>
                      Create workspace
                      <ArrowRight
                        size={14}
                        className="ml-2 transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                  <ShieldCheck className="h-3 w-3" />
                  Encrypted at rest · PBKDF2 passwords · 2FA ready
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <GoogleButton intent="signup" />
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      </>
      )}
    </div>
  );
}
