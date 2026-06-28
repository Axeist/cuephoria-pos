import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { CUETRONIX_ASSETS } from "@/branding/assets";
import CuephoriaTechAttribution from "@/components/branding/CuephoriaTechAttribution";
import GoogleButton from "@/components/auth/GoogleButton";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStaffLoginForm } from "@/hooks/useStaffLoginForm";

interface LocationState {
  from?: string;
}

const MobileLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const locationState = location.state as LocationState;
  const loginNext =
    typeof locationState?.from === "string" && locationState.from.startsWith("/")
      ? locationState.from
      : "";
  const dest = loginNext || "/dashboard";

  const form = useStaffLoginForm({
    dest,
    pathname: location.pathname,
    search: location.search,
  });

  useEffect(() => {
    if (authLoading) return;
    if (user) navigate(dest, { replace: true });
  }, [authLoading, user, navigate, dest]);

  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#05060b] text-white">
        <AuthSceneBackground />
        <div className="relative z-20 flex min-h-screen items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-fuchsia-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#05060b] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <AuthSceneBackground />

      <main
        id="main-content"
        className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full"
        >
          <div
            className="absolute -inset-px rounded-[26px] opacity-50 blur-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(236,72,153,0.3))",
            }}
          />

          <div
            className="relative overflow-hidden rounded-[24px] border border-white/10 p-6"
            style={{
              background: "linear-gradient(180deg, rgba(15,9,26,0.9) 0%, rgba(10,6,22,0.95) 100%)",
              backdropFilter: "blur(28px)",
            }}
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <img
                src={CUETRONIX_ASSETS.logoUrl}
                alt={CUETRONIX_ASSETS.logoAlt}
                className="h-10 w-auto max-w-[160px] object-contain"
                draggable={false}
              />
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Welcome back</h1>
              <p className="mt-1.5 text-sm text-gray-400">Sign in to run your venue</p>
            </div>

            {form.verificationHint ? (
              <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-500/[0.08] px-3.5 py-3 text-xs text-amber-100/95">
                {form.verificationHint}
              </div>
            ) : null}

            <GoogleButton intent="login" next={loginNext || undefined} />

            {!form.totpPhase ? (
              <button
                type="button"
                onClick={form.toggleManualLogin}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-medium text-gray-300"
              >
                {form.manualLoginOpen ? (
                  <>
                    <ChevronUp size={16} /> Hide email &amp; password
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} /> Sign in with email &amp; password
                  </>
                )}
              </button>
            ) : null}

            {form.manualLoginOpen || form.totpPhase ? (
              <form onSubmit={form.handlePasswordLogin} className="mt-4 space-y-4 border-t border-white/[0.08] pt-4">
                {form.totpPhase ? (
                  <div className="space-y-2">
                    <p className="text-xs text-violet-200/90">
                      {form.totpPhase.oauthGoogle
                        ? "Enter your authenticator or backup code to finish Google sign-in."
                        : "Enter your 2FA code to continue."}
                    </p>
                    <Label htmlFor="mobile-login-totp" className="text-gray-300">
                      Authenticator code
                    </Label>
                    <Input
                      id="mobile-login-totp"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      placeholder="6-digit or backup code"
                      value={form.totpCode}
                      onChange={(e) => form.setTotpCode(e.target.value)}
                      className="h-12 border-white/10 bg-white/[0.04] text-white"
                      maxLength={32}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mobile-login-email" className="text-gray-300">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <Input
                          id="mobile-login-email"
                          type="email"
                          autoComplete="username"
                          placeholder="you@company.com"
                          value={form.email}
                          onChange={(e) => form.setEmail(e.target.value)}
                          className="h-12 border-white/10 bg-white/[0.04] pl-10 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mobile-login-password" className="text-gray-300">
                          Password
                        </Label>
                        <Link
                          to="/forgot-password"
                          className="text-xs text-violet-300 hover:text-fuchsia-300"
                        >
                          Forgot?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <Input
                          id="mobile-login-password"
                          type={form.showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={form.password}
                          onChange={(e) => form.setPassword(e.target.value)}
                          className="h-12 border-white/10 bg-white/[0.04] pl-10 pr-10 text-white"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => form.setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-400"
                          aria-label={form.showPassword ? "Hide password" : "Show password"}
                        >
                          {form.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={form.submitting}
                  className="h-12 w-full bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 font-semibold text-white"
                >
                  {form.submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : form.totpPhase ? (
                    "Verify and sign in"
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            ) : null}

            <p className="mt-6 text-center text-sm text-gray-500">
              New here?{" "}
              <button
                type="button"
                onClick={() => navigate("/app/signup")}
                className="font-semibold text-violet-300"
              >
                Create workspace
              </button>
            </p>

            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <CuephoriaTechAttribution variant="compact" className="text-center" />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MobileLogin;
