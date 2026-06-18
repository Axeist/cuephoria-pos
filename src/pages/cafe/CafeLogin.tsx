import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Shield,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  User,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import AppLoadingOverlay from "@/components/loading/AppLoadingOverlay";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCafeAuth } from "@/context/CafeAuthContext";

const FEATURE_PILLS = [
  { icon: ShoppingCart, label: "Smart POS" },
  { icon: ClipboardList, label: "Orders & KDS" },
  { icon: UtensilsCrossed, label: "Menu & stock" },
  { icon: TrendingUp, label: "Revenue analytics" },
  { icon: Users, label: "Customer hub" },
  { icon: CreditCard, label: "Flexible payments" },
];

const CafeLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading: authLoading } = useCafeAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginKind, setLoginKind] = useState<"staff" | "admin">("staff");

  const roles: {
    value: "staff" | "admin";
    label: string;
    icon: React.ElementType;
  }[] = [
    { value: "staff", label: "Staff", icon: ShoppingCart },
    { value: "admin", label: "Admin", icon: Shield },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !username.trim() || !password) return;
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(username.trim(), password);
      if (loggedInUser) {
        if (loggedInUser.role === "cafe_admin") navigate("/cafe/dashboard");
        else navigate("/cafe/pos");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-white">
      <AppLoadingOverlay
        visible={isSubmitting}
        variant="cafe"
        title="Signing you in"
        subtitle="Validating credentials and opening your workspace…"
      />

      <AuthSceneBackground />

      {/* Cafe-tinted wash — amber/orange warmth over the violet ambient */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(900px 650px at 12% 55%, rgba(249,115,22,0.18), transparent 60%)," +
            "radial-gradient(700px 500px at 88% 30%, rgba(236,72,153,0.10), transparent 65%)",
        }}
      />

      {/* ── Top bar ── */}
      <div className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={12} /> Back to site
        </button>

        <div className="flex items-center gap-2">
          <Link
            to="/cafe/order"
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white sm:inline-flex"
          >
            <UtensilsCrossed size={12} /> Self-order menu
            <ExternalLink size={10} />
          </Link>
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-orange-600/30 transition-all hover:scale-[1.02]"
          >
            Venue operator <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-16">
        {/* ── LEFT: cafe pitch ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden flex-col justify-center lg:flex"
        >
          {/* Collab logos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="mb-6 flex items-center gap-4"
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl blur-lg"
                style={{ background: "rgba(249,115,22,0.35)" }}
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f0e0] p-1.5 ring-2 ring-orange-500/30">
                <img
                  src="/choco-loca-logo.png"
                  alt="Choco Loca"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
            </div>
            <span className="text-lg font-heading text-gray-500">&times;</span>
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl blur-lg"
                style={{ background: "rgba(139,92,246,0.35)" }}
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-1 ring-2 ring-violet-500/30">
                <img
                  src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                  alt="Cuephoria"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
            </div>
            <div className="ml-1">
              <span className="block text-lg font-extrabold leading-none tracking-tight text-white">
                Choco Loca
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-orange-300">
                Cakes &amp; Cafe · on Cuetronix
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-orange-300/25 bg-orange-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200 backdrop-blur-md"
          >
            <Sparkles size={11} />
            Cafe operator console
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl"
          >
            Your cafe,
            <br />
            fully managed,{" "}
            <span
              className="bg-gradient-to-r from-orange-300 via-amber-300 to-fuchsia-300 bg-clip-text text-transparent"
              style={{
                backgroundSize: "200%",
                animation: "hueShift 8s ease-in-out infinite",
              }}
            >
              real-time.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400"
          >
            A cafe POS with order tracking, menu management, revenue split tracking and
            customer analytics — engineered by{" "}
            <span className="font-semibold text-white">Cuephoria Tech</span> for the
            Choco Loca × Cuephoria collaboration.
          </motion.p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-2.5">
            {FEATURE_PILLS.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.4 }}
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-md transition-colors hover:border-orange-300/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-fuchsia-500/20 text-orange-200">
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
              <Shield size={12} className="text-orange-300" />
              Session encrypted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={12} className="text-amber-300" />
              Auto-logout on idle
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BarChart2 size={12} className="text-fuchsia-300" />
              70 / 30 revenue split
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
            {/* Glow halo behind card */}
            <div
              className="absolute -inset-px rounded-[26px] opacity-60 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(249,115,22,0.45), rgba(236,72,153,0.35), rgba(139,92,246,0.30))",
              }}
            />

            <div
              className="relative overflow-hidden rounded-[24px] border border-white/10 p-7 sm:p-9"
              style={{
                background:
                  "linear-gradient(180deg, rgba(22,14,10,0.85) 0%, rgba(14,8,18,0.92) 100%)",
                backdropFilter: "blur(32px) saturate(150%)",
                WebkitBackdropFilter: "blur(32px) saturate(150%)",
                boxShadow:
                  "0 30px 80px -30px rgba(249,115,22,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Top accent line */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(251,146,60,0.65) 50%, transparent 100%)",
                }}
              />

              {/* Mobile brand + title */}
              <div className="mb-7">
                <div className="mb-5 flex items-center gap-2.5 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f5f0e0] p-1 ring-1 ring-orange-500/30">
                    <img
                      src="/choco-loca-logo.png"
                      alt="Choco Loca"
                      className="h-full w-full rounded-md object-contain"
                    />
                  </div>
                  <span className="text-sm font-heading text-gray-500">&times;</span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 p-1 ring-1 ring-violet-500/30">
                    <img
                      src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                      alt="Cuephoria"
                      className="h-full w-full rounded-md object-contain"
                    />
                  </div>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-sm text-gray-400">
                  Sign in to open the cafe management workspace.
                </p>
              </div>

              {/* Role toggle — sliding pill */}
              <div className="mb-5 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
                {roles.map((r) => {
                  const RoleIcon = r.icon;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setLoginKind(r.value)}
                      className={`relative flex-1 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        loginKind === r.value
                          ? "text-white"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {loginKind === r.value && (
                        <motion.span
                          layoutId="cafe-role-pill"
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-500 via-amber-500 to-fuchsia-500 shadow-md shadow-orange-600/40"
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
                        <RoleIcon size={13} />
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Username
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your cafe username"
                      autoComplete="username"
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-sm text-white placeholder:text-gray-600 focus-visible:border-orange-300/40 focus-visible:ring-orange-500/25"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock
                      size={14}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 pr-11 text-sm text-white placeholder:text-gray-600 focus-visible:border-orange-300/40 focus-visible:ring-orange-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || authLoading || !username.trim() || !password}
                  className="group mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2.5">
                      <Loader2 size={15} className="animate-spin" />
                      Verifying credentials…
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      {loginKind === "admin" ? <Shield size={15} /> : <ShoppingCart size={15} />}
                      Sign in as {loginKind === "admin" ? "Admin" : "Staff"}
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  )}
                </Button>
              </form>

              {/* Footer strip */}
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
                  <Shield size={11} className="text-orange-300/80" />
                  <span>Authorised personnel only</span>
                  <span className="text-gray-700">·</span>
                  <Lock size={11} className="text-amber-300/80" />
                  <span>Activity is logged</span>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2.5">
                  {["Cafe POS", "Orders", "70 / 30 split"].map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-orange-300/15 bg-orange-500/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-orange-200"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                <Link
                  to="/cafe/order"
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] py-2 text-[11px] font-medium text-orange-200/80 transition-colors hover:border-orange-300/30 hover:bg-white/[0.06] hover:text-orange-200"
                >
                  <UtensilsCrossed size={11} /> Customer self-order menu
                  <ExternalLink size={10} />
                </Link>
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
};

export default CafeLogin;
