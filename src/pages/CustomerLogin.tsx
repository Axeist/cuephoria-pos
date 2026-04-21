import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Eye,
  EyeOff,
  Gamepad2,
  Gift,
  Info,
  Loader2,
  Lock,
  Phone,
  Sparkles,
  Trophy,
  Wallet,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/appToast";
import { supabase } from "@/integrations/supabase/client";
import AppLoadingOverlay from "@/components/loading/AppLoadingOverlay";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";
import {
  getCustomerSession,
  setCustomerSession,
  normalizePhoneNumber,
  validatePhoneNumber,
  generateDefaultPassword,
  type CustomerSession,
} from "@/utils/customerAuth";

const FEATURE_PILLS = [
  { icon: CalendarCheck, label: "Book your slot" },
  { icon: Wallet, label: "Loyalty points" },
  { icon: Trophy, label: "Tournament entries" },
  { icon: Gift, label: "Member rewards" },
];

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getCustomerSession();
    if (session) navigate("/customer/dashboard");
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !password) {
      appToast.error("Missing details", "Enter your phone number and password.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const validation = validatePhoneNumber(normalizedPhone);
    if (!validation.valid) {
      appToast.error("Invalid phone", validation.error);
      return;
    }

    setLoading(true);

    try {
      const { data: customer, error } = await supabase
        .from("customers")
        .select(
          "id, name, phone, email, password_hash, is_first_login, loyalty_points, is_member"
        )
        .eq("phone", normalizedPhone)
        .single();

      if (error || !customer) {
        appToast.error(
          "Customer not found",
          "Check your phone number or register at the venue."
        );
        return;
      }

      if (!customer.password_hash) {
        appToast.error("Password not set", "Visit the venue to activate your account.");
        return;
      }

      const defaultPassword = generateDefaultPassword(normalizedPhone);
      const { data: verifyResult, error: verifyError } = await supabase.rpc(
        "verify_customer_password",
        { customer_phone: normalizedPhone, input_password: password }
      );

      if (verifyError) {
        if (password !== defaultPassword) {
          appToast.error("Incorrect password", "Default is CUE + your phone number.");
          return;
        }
      } else if (!verifyResult) {
        appToast.error("Incorrect password", "Default is CUE + your phone number.");
        return;
      }

      await supabase
        .from("customers")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", customer.id);

      const customerSession: CustomerSession = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isFirstLogin: customer.is_first_login || false,
        loyaltyPoints: customer.loyalty_points || 0,
        isMember: customer.is_member || false,
      };
      setCustomerSession(customerSession);

      appToast.success(`Welcome back, ${customer.name}!`, "Taking you to your dashboard…");
      navigate("/customer/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      appToast.error("Login failed", "Check your phone and password, then try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-white">
      <AppLoadingOverlay
        visible={loading}
        variant="default"
        title="Signing you in"
        subtitle="Verifying your customer account…"
      />

      <AuthSceneBackground />

      {/* ── Top bar ── */}
      <div className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={12} /> Back to site
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/login")}
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white sm:inline-flex"
          >
            Venue operator <ArrowRight size={12} />
          </button>
          <a
            href="tel:+918637625155"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02]"
          >
            <Phone size={12} /> Need help?
          </a>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-16">
        {/* ── LEFT brand narrative ── */}
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
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200 backdrop-blur-md"
          >
            <Sparkles size={11} />
            Player portal
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl"
          >
            Your game nights,
            <br />
            <span
              className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent"
              style={{
                backgroundSize: "200%",
                animation: "hueShift 8s ease-in-out infinite",
              }}
            >
              one tap away.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400"
          >
            Sign in to book PS5s, VR pods, pool tables and esports rigs — track your
            loyalty points, redeem rewards, and catch the next tournament at your
            favourite Cuetronix-powered lounge.
          </motion.p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-2.5">
            {FEATURE_PILLS.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.4 }}
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-md transition-colors hover:border-emerald-300/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-emerald-500/20 text-emerald-200">
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
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              Secure member portal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy size={12} className="text-violet-300" />
              Tournament-ready
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet size={12} className="text-fuchsia-300" />
              Loyalty wallet
            </span>
          </motion.div>
        </motion.div>

        {/* ── RIGHT form card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <div className="relative w-full max-w-md">
            {/* Glow halo behind card */}
            <div
              className="absolute -inset-px rounded-[26px] opacity-60 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(16,185,129,0.3), rgba(236,72,153,0.3))",
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
                  "0 30px 80px -30px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Top accent line */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.55) 50%, transparent 100%)",
                }}
              />

              {/* Logo + title */}
              <div className="mb-7">
                <div className="mb-5 flex items-center gap-2.5 lg:hidden">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-emerald-500 shadow-md shadow-violet-600/40">
                    <Gamepad2 size={17} className="text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight">
                    Cue
                    <span className="bg-gradient-to-r from-violet-300 to-emerald-300 bg-clip-text text-transparent">
                      tronix
                    </span>
                    <span className="ml-1 text-xs font-medium text-emerald-300/70">
                      · Players
                    </span>
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
                  Welcome back, player
                </h2>
                <p className="mt-1.5 text-sm text-gray-400">
                  Sign in with the phone number you registered at the venue.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Phone number
                  </label>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={10}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-sm text-white placeholder:text-gray-600 focus-visible:border-emerald-300/40 focus-visible:ring-emerald-500/25"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        appToast.info(
                          "Password help",
                          "Your default password is CUE followed by your phone number. Visit the venue to reset."
                        )
                      }
                      className="text-[11px] font-medium text-violet-300 transition-colors hover:text-emerald-300"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      size={14}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 pr-11 text-sm text-white placeholder:text-gray-600 focus-visible:border-emerald-300/40 focus-visible:ring-emerald-500/25"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-200"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div
                    className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(124,58,237,0.10) 0%, rgba(16,185,129,0.08) 100%)",
                      border: "1px solid rgba(167,139,250,0.22)",
                    }}
                  >
                    <Info size={13} className="mt-[2px] flex-shrink-0 text-violet-300" />
                    <p className="text-[11.5px] leading-relaxed text-gray-300">
                      First time?  Default password is{" "}
                      <span className="font-mono font-semibold text-emerald-300">CUE</span>
                      <span className="font-mono font-semibold text-emerald-300">
                        &lt;yourphone&gt;
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-emerald-500 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2.5">
                      <Loader2 size={15} className="animate-spin" />
                      Signing you in…
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Gamepad2 size={15} />
                      Enter my player dashboard
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  )}
                </Button>
              </form>

              {/* Help strip */}
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <p className="text-center text-[12px] text-gray-500">
                  Not registered yet? Visit your nearest Cuetronix-powered lounge to
                  activate your account.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2.5">
                  {["Bookings", "Loyalty", "Tournaments"].map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-emerald-300/15 bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-emerald-200"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
