/**
 * /platform/login — authenticated landing page for Cuetronix operators.
 *
 * Zero-frills, brand-accurate dark UI. Never references the tenant admin
 * login styling so operators don't confuse the two consoles.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PRODUCT_BRAND, PARENT_BRAND } from "@/branding/brand";
import { usePlatformAuth } from "@/context/PlatformAuthContext";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-[#07070e] text-zinc-100 flex items-center justify-center px-4 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px circle at 30% 20%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(600px circle at 75% 75%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(500px circle at 50% 100%, rgba(56,189,248,0.12), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="relative mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-400 grid place-items-center shadow-xl shadow-indigo-500/30">
            <span className="font-black text-white text-lg tracking-tight">CX</span>
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{PRODUCT_BRAND.name}</h1>
          <p className="text-sm text-zinc-400 mt-1">Operator console</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 shadow-2xl shadow-black/60"
        >
          <div className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            Staff sign-in
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="plat-email" className="text-xs text-zinc-400">
                Work email
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="plat-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@cuephoriatech.in"
                  className="pl-9 bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-11 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="plat-pw" className="text-xs text-zinc-400">
                Password
              </Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  id="plat-pw"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9 pr-10 bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-11 focus-visible:ring-indigo-500"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={submitting || isLoading}
              className={cn(
                "w-full h-11 mt-2 group",
                "bg-gradient-to-r from-indigo-500 to-fuchsia-500",
                "hover:from-indigo-400 hover:to-fuchsia-400",
                "text-white font-medium shadow-lg shadow-indigo-500/30",
                "disabled:opacity-60",
              )}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          This console manages{" "}
          <span className="text-zinc-300">{PARENT_BRAND.name}</span>'s SaaS tenants. Not the place
          to sign into a venue — try{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition">
            the venue login
          </Link>
          .
        </div>
      </motion.div>
    </div>
  );
};

export default PlatformLogin;
