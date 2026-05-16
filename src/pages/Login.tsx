import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Gamepad2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { appToast } from "@/lib/appToast";
import GoogleButton from "@/components/auth/GoogleButton";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface LocationState {
  from?: string;
}

const FEATURE_PILLS = [
  { icon: Activity, label: "Live station monitor" },
  { icon: Zap, label: "Booking engine" },
  { icon: Users, label: "Staff & payroll" },
  { icon: ShieldCheck, label: "Google sign-in + 2FA" },
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, login } = useAuth();
  const locationState = location.state as LocationState;
  const loginNext =
    typeof locationState?.from === "string" && locationState.from.startsWith("/") ? locationState.from : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totpPhase, setTotpPhase] = useState<{ isAdminLogin: boolean } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const dest = loginNext || "/dashboard";

  useEffect(() => {
    if (authLoading) return;
    if (user) navigate(dest, { replace: true });
  }, [authLoading, user, navigate, dest]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthErr = params.get("oauth_error");
    if (!oauthErr) return;
    const prettyMap: Record<string, string> = {
      no_account:
        "No Cuetronix account exists for this Google sign-in. Create a workspace with Google first.",
      account_conflict: "Another Google identity is already linked to this email.",
      no_workspace:
        "This account no longer has access to any workspace. Ask the owner to re-invite you.",
      verify_email_first:
        "Open the verification link we emailed to this address first, then sign in with Google using the same email.",
      invalid_state: "Sign-in session expired. Please try again.",
      expired_state: "Sign-in session expired. Please try again.",
    };
    const message = prettyMap[oauthErr] || `Google sign-in failed: ${decodeURIComponent(oauthErr)}`;
    appToast.error(message);
    params.delete("oauth_error");
    params.delete("email");
    const q = params.toString();
    window.history.replaceState({}, "", q ? `${location.pathname}?${q}` : location.pathname);
  }, [location.search, location.pathname]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || authLoading) return;
    const trimmed = email.trim();
    if (!trimmed || !password) {
      appToast.error("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      if (totpPhase) {
        const tc = totpCode.trim().replace(/\s+/g, "");
        const normalized = tc.replace(/-/g, "");
        const useBackup =
          normalized.length >= 8 && /^[A-Z0-9]+$/i.test(normalized) && !/^\d{6}$/.test(normalized);
        const second = useBackup ? { backupCode: normalized.toUpperCase() } : { totpCode: tc };
        const r = await login(trimmed, password, totpPhase.isAdminLogin, {}, second);
        if (r.ok) {
          setTotpPhase(null);
          setTotpCode("");
          navigate(dest, { replace: true });
          return;
        }
        if (r.requireTotp) {
          appToast.error(r.error || "Invalid 2FA code. Try again.");
          return;
        }
        if (r.emailVerificationRequired) {
          appToast.error(r.error || "Verify your email before signing in.");
          return;
        }
        appToast.error(r.error || "Sign-in failed.");
        return;
      }

      const tryAdmin = await login(trimmed, password, true);
      if (tryAdmin.ok) {
        navigate(dest, { replace: true });
        return;
      }
      if (tryAdmin.requireTotp) {
        setTotpPhase({ isAdminLogin: true });
        setTotpCode("");
        return;
      }
      if (tryAdmin.emailVerificationRequired) {
        appToast.error(
          tryAdmin.error ||
            (tryAdmin.emailSent
              ? "Check your inbox for a verification link, then sign in again."
              : "Your email must be verified before you can sign in."),
        );
        return;
      }

      const tryStaff = await login(trimmed, password, false);
      if (tryStaff.ok) {
        navigate(dest, { replace: true });
        return;
      }
      if (tryStaff.requireTotp) {
        setTotpPhase({ isAdminLogin: false });
        setTotpCode("");
        return;
      }
      if (tryStaff.emailVerificationRequired) {
        appToast.error(
          tryStaff.error ||
            (tryStaff.emailSent
              ? "Check your inbox for a verification link, then sign in again."
              : "Your email must be verified before you can sign in."),
        );
        return;
      }

      appToast.error(tryStaff.error || tryAdmin.error || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-white">
        <AuthSceneBackground />
        <div className="relative z-20 flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-white">
      <AuthSceneBackground />

      <div className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={12} /> Back to site
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/login-logs")}
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white sm:inline-flex"
          >
            <FileText size={12} /> Login logs
          </button>
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-fuchsia-600/30 transition-all hover:scale-[1.02]"
          >
            Create workspace <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <main
        id="main-content"
        className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-16"
      >
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
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200 backdrop-blur-md"
          >
            <Sparkles size={11} />
            Welcome back, operator
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl"
          >
            Your gaming
            <br />
            business,{" "}
            <span
              className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent"
              style={{
                backgroundSize: "200%",
                animation: "hueShift 8s ease-in-out infinite",
              }}
            >
              under control.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400"
          >
            Full-stack POS with live station tracking, automated bookings, staff & payroll management, and
            real-time revenue analytics — in one lounge-first operating system.
          </motion.p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-2.5">
            {FEATURE_PILLS.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.4 }}
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-md transition-colors hover:border-violet-300/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-200">
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
              <ShieldCheck size={12} className="text-violet-300" />
              Google OAuth
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} className="text-fuchsia-300" />
              Full audit logs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              All systems operational
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <div className="relative w-full max-w-md">
            <div
              className="absolute -inset-px rounded-[26px] opacity-60 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.35), rgba(59,130,246,0.25))",
              }}
            />

            <div
              className="relative overflow-hidden rounded-[24px] border border-white/10 p-7 sm:p-9"
              style={{
                background: "linear-gradient(180deg, rgba(15,9,26,0.85) 0%, rgba(10,6,22,0.9) 100%)",
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

              <div className="mb-7">
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

                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Sign in</h2>
                <p className="mt-1.5 text-sm text-gray-400">
                  Google is the smoothest path — use the account linked to your workspace. You can also sign in with
                  the email and password on your profile.
                </p>
              </div>

              <div className="relative rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-500/10 to-transparent p-1">
                <div className="absolute right-3 top-2.5 z-10 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  Recommended
                </div>
                <div className="rounded-[14px] bg-[#0c0618]/80 p-3 pt-9">
                  <GoogleButton intent="login" next={loginNext || undefined} />
                </div>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#0f091a] px-3 text-gray-500">or email &amp; password</span>
                </div>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {totpPhase ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-relaxed text-violet-200/90">
                      This account has 2FA enabled. Enter a code from your authenticator app, or a one-time backup
                      code.
                    </p>
                    <Label htmlFor="login-totp" className="text-gray-300">
                      Authenticator code
                    </Label>
                    <Input
                      id="login-totp"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      placeholder="6-digit code or backup code"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-gray-500"
                      maxLength={32}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setTotpPhase(null);
                        setTotpCode("");
                      }}
                      className="text-xs text-violet-300 hover:text-fuchsia-300"
                    >
                      ← Back to email &amp; password
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-gray-300">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="username"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-gray-300">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 border-white/10 bg-white/[0.04] pl-10 pr-10 text-white placeholder:text-gray-500"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 font-semibold text-white shadow-md shadow-fuchsia-600/25 hover:opacity-95"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : totpPhase ? (
                    "Verify and sign in"
                  ) : (
                    "Sign in with password"
                  )}
                </Button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-1.5">
                <p className="text-[13px] text-gray-500">
                  New to Cuetronix?{" "}
                  <a
                    href="/signup"
                    className="font-semibold text-violet-300 transition-colors hover:text-fuchsia-300"
                  >
                    Create a workspace →
                  </a>
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3 border-t border-white/[0.06] pt-4">
                {["Admin portal", "POS v2.0", "Multi-location"].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-violet-300/15 bg-violet-500/8 px-2.5 py-0.5 text-[10px] font-medium text-violet-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Login;
