/**
 * /platform/login — authenticated landing page for Cuetronix operators.
 *
 * Visual language matches the tenant `/login` page (same ambient galaxy +
 * glass card), with subtle indigo / cyan accents so operators never confuse
 * the platform console with a tenant workspace.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRODUCT_BRAND, PARENT_BRAND } from "@/branding/brand";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";

// Operator-facing talking points (mirrors the tenant login's FEATURE_PILLS).
const PLATFORM_PILLS = [
  { icon: Layers, label: "Multi-tenant orchestration" },
  { icon: Activity, label: "Live fleet telemetry" },
  { icon: Terminal, label: "Runbook & incident tools" },
  { icon: ShieldCheck, label: "SSO · audit · guardrails" },
];

const PlatformLogin: React.FC = () => {
  const { admin, login, isLoading } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (admin) navigate("/platform", { replace: true });
  }, [admin, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const res = await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (res.ok === true) {
      navigate("/platform", { replace: true });
      return;
    }
    setError(res.ok === false ? res.error : "Sign-in failed.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-white">
      <AuthSceneBackground />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={12} /> Back to site
        </Link>

        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          Venue login <ArrowRight size={12} />
        </Link>
      </div>

      {/* Grid */}
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-16">
        {/* ── LEFT: operator pitch ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden flex-col justify-center lg:flex"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 backdrop-blur-md"
          >
            <Terminal size={11} />
            Operator console · restricted
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl"
          >
            The{" "}
            <span
              className="bg-gradient-to-r from-indigo-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent"
              style={{
                backgroundSize: "200%",
                animation: "hueShift 8s ease-in-out infinite",
              }}
            >
              control plane
            </span>
            <br />
            for every venue.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400"
          >
            Operate the {PARENT_BRAND.name} fleet: provision tenants, ship platform
            updates, monitor health, and respond to incidents — all from one
            hardened console.
          </motion.p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-2.5">
            {PLATFORM_PILLS.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.4 }}
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-md transition-colors hover:border-indigo-300/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/25 to-cyan-500/25 text-indigo-200">
                  <Icon size={13} />
                </div>
                <span className="text-[13px] font-medium text-gray-300">{label}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-indigo-300" />
              Row-level security
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} className="text-cyan-300" />
              Full audit trail
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              Fleet nominal
            </span>
          </motion.div>
        </motion.div>

        {/* ── RIGHT: login card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <div className="relative w-full max-w-md">
            {/* Gradient glow behind card — indigo/cyan mix */}
            <div
              className="absolute -inset-px rounded-[26px] opacity-60 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.45), rgba(168,85,247,0.32), rgba(56,189,248,0.28))",
              }}
            />

            <div
              className="relative overflow-hidden rounded-[24px] border border-white/10 p-7 sm:p-9"
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,9,26,0.85) 0%, rgba(10,6,22,0.9) 100%)",
                backdropFilter: "blur(32px) saturate(150%)",
                WebkitBackdropFilter: "blur(32px) saturate(150%)",
                boxShadow:
                  "0 30px 80px -30px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Top accent shine */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.6) 50%, transparent 100%)",
                }}
              />

              {/* Brand */}
              <div className="mb-7">
                <div className="mb-5 flex items-center gap-2.5">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 shadow-md shadow-indigo-600/40">
                    <span className="font-black tracking-tight text-white">CX</span>
                    <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-tight tracking-tight">
                      {PRODUCT_BRAND.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
                      Operator console
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
                  Staff sign in
                </h2>
                <p className="mt-1.5 text-sm text-gray-400">
                  Restricted to {PARENT_BRAND.name} platform operators.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label
                    htmlFor="plat-email"
                    className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400"
                  >
                    Work email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="plat-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@cuephoriatech.in"
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-9 text-sm text-white placeholder:text-gray-600 focus-visible:border-indigo-300/40 focus-visible:ring-indigo-500/25"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="plat-pw"
                    className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="plat-pw"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-9 pr-11 text-sm text-white placeholder:text-gray-600 focus-visible:border-indigo-300/40 focus-visible:ring-indigo-500/25"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={submitting || isLoading}
                  className="group mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2.5">
                      <Loader2 size={15} className="animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      <ShieldCheck size={15} />
                      Sign in
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  )}
                </Button>
              </form>

              {/* Footer strip */}
              <div className="mt-6 flex items-center justify-center gap-3 border-t border-white/[0.06] pt-4">
                {["Platform", "SSO ready", "Audit logged"].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-indigo-300/15 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-medium text-indigo-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-6 text-center text-[12px] text-gray-500">
              <Sparkles size={10} className="mr-1 inline-block text-fuchsia-300" />
              Looking for a venue sign-in?{" "}
              <Link
                to="/login"
                className="font-semibold text-violet-300 transition-colors hover:text-fuchsia-300"
              >
                Open the venue login →
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

export default PlatformLogin;
