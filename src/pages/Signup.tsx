/**
 * /signup — new workspaces are created only via Google OAuth.
 *
 * User accepts terms, clicks "Continue with Google", completes OAuth, then
 * lands on /signup/google to pick workspace name + slug.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { CUETRONIX_ASSETS } from "@/branding/assets";
import CuephoriaTechAttribution from "@/components/branding/CuephoriaTechAttribution";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import GoogleButton from "@/components/auth/GoogleButton";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";

const PERKS = [
  "Your own branded login page in 2 minutes",
  "Unlimited stations & customers during trial",
  "Razorpay billing integrated, no hidden fees",
  "Export everything, lock-in free",
];

export default function Signup() {
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="text-xs font-medium text-violet-300 hover:text-fuchsia-300"
        >
          Already have a workspace? Sign in
        </button>
      </div>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="hidden flex-col justify-center lg:flex"
        >
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200 backdrop-blur-md">
            <Sparkles size={11} />
            14-day free trial · no credit card
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl">
            Launch your gaming
            <br />
            <span
              className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent"
              style={{ backgroundSize: "200%", animation: "hueShift 8s ease-in-out infinite" }}
            >
              empire in minutes.
            </span>
          </h1>
          <ul className="mt-8 max-w-md space-y-3 text-[15px] leading-relaxed text-gray-400">
            {PERKS.map((p) => (
              <li key={p} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/90" />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-violet-300" />
              Sign in with Google
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe size={12} className="text-fuchsia-300" />
              Workspace hosted on Cuetronix
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="flex items-center justify-center"
        >
          <div className="relative w-full max-w-md">
            <div
              className="absolute -inset-px rounded-[26px] opacity-50 blur-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(236,72,153,0.3), rgba(59,130,246,0.2))",
              }}
            />
            <div
              className="relative overflow-hidden rounded-[24px] border border-white/10 p-7 sm:p-9"
              style={{
                background: "linear-gradient(180deg, rgba(15,9,26,0.88) 0%, rgba(10,6,22,0.92) 100%)",
                backdropFilter: "blur(28px)",
                boxShadow:
                  "0 30px 80px -30px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <div className="mb-5 flex items-center gap-2.5 lg:hidden">
                <img
                  src={CUETRONIX_ASSETS.logoUrl}
                  alt={CUETRONIX_ASSETS.logoAlt}
                  className="h-9 w-auto max-w-[130px] object-contain"
                  draggable={false}
                />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Create your workspace</h2>
              <p className="mt-2 text-sm text-gray-400">
                We use Google to verify your email and secure your account. You’ll choose your workspace name
                after signing in.
              </p>

              <div className="mt-8 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(v) => setAcceptedTerms(v === true)}
                  className="mt-0.5 border-white/20 data-[state=checked]:bg-violet-600"
                />
                <Label htmlFor="terms" className="cursor-pointer text-sm leading-snug text-gray-300">
                  I agree to Cuetronix&apos;s{" "}
                  <Link to="/privacy" className="text-violet-300 hover:text-fuchsia-300">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-violet-300 hover:text-fuchsia-300">
                    Privacy Policy
                  </Link>
                  .
                </Label>
              </div>

              <div className="mt-6">
                {acceptedTerms ? (
                  <GoogleButton intent="signup" />
                ) : (
                  <Button
                    type="button"
                    disabled
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-500"
                  >
                    Accept terms to continue with Google
                  </Button>
                )}
              </div>

              <p className="mt-5 text-center text-[11px] text-gray-500">
                Encrypted at rest · OAuth with Google · 2FA available after sign-in
              </p>

              <div className="mt-6 text-center text-xs text-gray-500">
                Already have access?{" "}
                <button type="button" className="font-medium text-violet-300 hover:text-fuchsia-300" onClick={() => navigate("/login")}>
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-5 py-6 text-center sm:px-8">
        <CuephoriaTechAttribution variant="compact" className="mb-3" />
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-gray-600">
          <Link to="/privacy" className="hover:text-gray-400">
            Privacy
          </Link>
          <span className="text-white/10">·</span>
          <span>All systems operational</span>
        </div>
      </footer>
    </div>
  );
}
