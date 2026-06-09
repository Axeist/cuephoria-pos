import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { CUETRONIX_ASSETS } from "@/branding/assets";
import { useIsMobile } from "@/hooks/use-mobile";
import { lazyWithRetry as lazy } from "@/utils/lazyWithRetry";

const HeroScene3D = lazy(() => import("@/components/landing/HeroScene3D"));

export type SplashVariant = "boot" | "login_success";

export type SplashScreenProps = {
  variant: SplashVariant;
  onDone: () => void;
};

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

const BOOT_STATUS = [
  "Initializing secure runtime",
  "Syncing venue configuration",
  "Compositing live dashboard",
] as const;

const LOGIN_STATUS = [
  "Credentials verified",
  "Hydrating workspace state",
  "Opening command surface",
] as const;

export default function SplashScreen({ variant, onDone }: SplashScreenProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const isSuccess = variant === "login_success";

  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [exitSource, setExitSource] = useState<"auto" | "click" | null>(null);

  const exitTimerRef = useRef<number | null>(null);
  const exitingRef = useRef(false);
  exitingRef.current = exiting;

  const statusLines = useMemo(
    () => (isSuccess ? LOGIN_STATUS : BOOT_STATUS),
    [isSuccess],
  );

  const accent = isSuccess
    ? { from: "#34d399", mid: "#6ee7b7", to: "#a78bfa" }
    : { from: "#8b5cf6", mid: "#c084fc", to: "#22d3ee" };

  const beginExit = (source: "auto" | "click") => {
    if (exitingRef.current) return;
    setExitSource(source);
    setExiting(true);

    const delayMs = source === "click" ? 380 : 480;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => onDone(), delayMs);
  };

  useEffect(() => {
    setProgress(0);
    setStatusIndex(0);
    setExiting(false);
    setExitSource(null);
    exitingRef.current = false;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;

    const durationMs = isSuccess ? 2400 : 3000;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      if (exitingRef.current) return;
      const p = clamp01((now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 2.35);
      setProgress(eased);
      if (p >= 1) {
        beginExit("auto");
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    const cadence = isSuccess ? 560 : 720;
    const timer = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % statusLines.length);
    }, cadence);
    return () => window.clearInterval(timer);
  }, [statusLines, isSuccess]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginExit("click");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.round(progress * 100);
  const status = statusLines[statusIndex];
  const exitMs = exitSource === "click" ? 380 : 480;
  const motion = !prefersReducedMotion && !exiting;

  return (
    <div
      className={[
        "fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-[#07030f] px-5 sm:px-6",
        "transition-opacity ease-out",
        exiting ? "opacity-0" : "opacity-100",
      ].join(" ")}
      style={{ transitionDuration: `${exitMs}ms` }}
      aria-live="polite"
      aria-label={isSuccess ? "Loading workspace" : "Starting application"}
    >
      {/* Hero galaxy + wireframe scene (same as landing hero) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {motion ? (
          <Suspense
            fallback={
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(1200px 800px at 15% 0%, rgba(124,58,237,0.35), transparent 60%)," +
                    "radial-gradient(900px 700px at 85% 15%, rgba(236,72,153,0.22), transparent 60%)," +
                    "linear-gradient(180deg, #07030f 0%, #0a0414 55%, #07030f 100%)",
                }}
              />
            }
          >
            <HeroScene3D mobile={isMobile} />
          </Suspense>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1200px 800px at 15% 0%, rgba(124,58,237,0.35), transparent 60%)," +
                "radial-gradient(900px 700px at 85% 15%, rgba(236,72,153,0.22), transparent 60%)," +
                "radial-gradient(1200px 900px at 50% 100%, rgba(59,130,246,0.18), transparent 60%)," +
                "linear-gradient(180deg, #07030f 0%, #0a0414 55%, #07030f 100%)",
            }}
          />
        )}
      </div>

      {/* Film grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px",
        }}
      />

      {/* Center scrim — keeps card readable while galaxy stays visible around it */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 48%, rgba(7,3,15,0.42) 0%, rgba(7,3,15,0.72) 62%, rgba(7,3,15,0.92) 100%)",
        }}
      />

      {/* Edge vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 90% 100% at 50% 50%, transparent 42%, rgba(7,3,15,0.55) 100%)",
        }}
      />

      {motion ? (
        <div
          aria-hidden
          className="splash-scan pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent"
        />
      ) : null}

      {/* Holo panel */}
      <div
        className={[
          "relative z-10 w-full max-w-[440px] transform-gpu transition-all ease-out",
          exiting ? "translate-y-2 scale-[0.985] opacity-0 blur-[2px]" : "translate-y-0 scale-100 opacity-100 blur-0",
        ].join(" ")}
        style={{ transitionDuration: `${exitMs}ms` }}
      >
        {/* Animated border glow */}
        <div
          aria-hidden
          className={[
            "absolute -inset-[1px] rounded-[26px] opacity-80 blur-sm",
            motion ? "splash-border-spin" : "",
          ].join(" ")}
          style={{
            background: `conic-gradient(from 0deg, ${accent.from}, ${accent.mid}, ${accent.to}, ${accent.from})`,
          }}
        />

        <div
          className="relative overflow-hidden rounded-[25px] border border-white/[0.09]"
          style={{
            background:
              "linear-gradient(165deg, rgba(14,10,28,0.92) 0%, rgba(8,6,18,0.96) 55%, rgba(6,5,14,0.98) 100%)",
            backdropFilter: "blur(40px) saturate(160%)",
            WebkitBackdropFilter: "blur(40px) saturate(160%)",
            boxShadow:
              "0 40px 100px -40px rgba(139,92,246,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.06) inset",
          }}
        >
          {/* HUD corners */}
          <span aria-hidden className="absolute left-4 top-4 h-3 w-3 border-l border-t border-violet-400/40" />
          <span aria-hidden className="absolute right-4 top-4 h-3 w-3 border-r border-t border-cyan-400/35" />
          <span aria-hidden className="absolute bottom-4 left-4 h-3 w-3 border-b border-l border-violet-400/30" />
          <span aria-hidden className="absolute bottom-4 right-4 h-3 w-3 border-b border-r border-cyan-400/30" />

          {/* Inner sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(600px 220px at 50% 0%, rgba(167,139,250,0.12), transparent 70%)," +
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 28%)",
            }}
          />

          <div className="relative px-8 py-10 sm:px-10 sm:py-11">
            {/* Logo + orbital rings */}
            <div className="mx-auto mb-8 flex h-[88px] w-[88px] items-center justify-center">
              <svg
                aria-hidden
                className={[
                  "absolute h-[88px] w-[88px] text-violet-400/25",
                  motion ? "splash-orbit-a" : "",
                ].join(" ")}
                viewBox="0 0 88 88"
                fill="none"
              >
                <circle cx="44" cy="44" r="40" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 8" />
              </svg>
              <svg
                aria-hidden
                className={[
                  "absolute h-[72px] w-[72px] text-cyan-400/20",
                  motion ? "splash-orbit-b" : "",
                ].join(" ")}
                viewBox="0 0 72 72"
                fill="none"
              >
                <circle cx="36" cy="36" r="32" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="36" cy="4" r="1.5" fill="rgba(34,211,238,0.7)" />
              </svg>

              <div
                className={[
                  "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl",
                  "border border-white/10 bg-black/60",
                  motion ? "splash-mark-in" : "",
                ].join(" ")}
                style={{
                  boxShadow: `0 0 32px -8px ${accent.from}88, inset 0 1px 0 rgba(255,255,255,0.08)`,
                }}
              >
                <img
                  src={CUETRONIX_ASSETS.iconUrl}
                  alt=""
                  className="h-11 w-11 object-contain"
                  draggable={false}
                />
                {isSuccess ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0a0814] bg-emerald-400 text-[#04120d] shadow-[0_0_12px_rgba(52,211,153,0.5)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </div>
            </div>

            <img
              src={CUETRONIX_ASSETS.logoUrl}
              alt={CUETRONIX_ASSETS.logoAlt}
              className="mx-auto h-7 w-auto max-w-[240px] object-contain opacity-95"
              draggable={false}
            />

            <div className="mt-6 flex items-center justify-center gap-2">
              <span
                className={[
                  "inline-flex h-1.5 w-1.5 rounded-full",
                  isSuccess ? "bg-emerald-400" : "bg-violet-400",
                  motion ? "splash-pulse-dot" : "",
                ].join(" ")}
                style={{ boxShadow: `0 0 10px ${isSuccess ? "#34d399" : "#a78bfa"}` }}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
                {isSuccess ? "Access granted" : "System boot"}
              </p>
            </div>

            <p
              key={status}
              className={[
                "mt-3 min-h-[22px] text-center font-mono text-[13px] tracking-wide text-zinc-300",
                motion ? "splash-status-in" : "",
              ].join(" ")}
            >
              {status}
              <span className="splash-ellipsis text-violet-300/80" />
            </p>

            {/* Progress rail */}
            <div className="mt-9">
              <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <span>Load sequence</span>
                <span className="tabular-nums text-zinc-400">{pct.toString().padStart(3, "0")}%</span>
              </div>

              <div className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="relative h-full rounded-full transition-[width] duration-150 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${accent.from}, ${accent.mid}, ${accent.to})`,
                    boxShadow: `0 0 18px ${accent.from}66`,
                  }}
                >
                  {motion ? <span aria-hidden className="splash-bar-shimmer absolute inset-0" /> : null}
                </div>
                {/* Segment ticks */}
                <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-between px-0">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className="h-full w-px bg-white/[0.04]" />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-[10px] tracking-wide text-zinc-600">
                  Encrypted session · multi-tenant RLS
                </span>
                <button
                  type="button"
                  onClick={() => beginExit("click")}
                  className={[
                    "group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]",
                    "px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-zinc-300",
                    "transition hover:border-violet-400/30 hover:bg-white/[0.06] hover:text-white",
                  ].join(" ")}
                >
                  <span className="relative z-10">Enter workspace</span>
                  {motion ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                  ) : null}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-6 z-10 text-[10px] tracking-[0.18em] text-zinc-500/80">
        ENTER TO SKIP
      </p>

      <style>{`
        @keyframes splashScan {
          0%   { top: -2px; opacity: 0; }
          8%   { opacity: 0.7; }
          92%  { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        .splash-scan {
          animation: splashScan 5.5s ease-in-out infinite;
        }

        @keyframes splashBorderSpin {
          to { transform: rotate(360deg); }
        }
        .splash-border-spin {
          animation: splashBorderSpin 8s linear infinite;
        }

        @keyframes splashOrbitA {
          to { transform: rotate(360deg); }
        }
        @keyframes splashOrbitB {
          to { transform: rotate(-360deg); }
        }
        .splash-orbit-a { animation: splashOrbitA 14s linear infinite; }
        .splash-orbit-b { animation: splashOrbitB 9s linear infinite; }

        @keyframes splashMarkIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .splash-mark-in { animation: splashMarkIn 0.7s cubic-bezier(.2,.8,.2,1) both; }

        @keyframes splashStatusIn {
          from { opacity: 0; transform: translateY(4px); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .splash-status-in { animation: splashStatusIn 0.4s ease-out both; }

        @keyframes splashPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(0.85); }
        }
        .splash-pulse-dot { animation: splashPulseDot 1.6s ease-in-out infinite; }

        @keyframes splashBarShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .splash-bar-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: splashBarShimmer 1.4s ease-in-out infinite;
        }

        .splash-ellipsis::after {
          content: '';
          animation: splashEllipsis 1.2s steps(4, end) infinite;
        }
        @keyframes splashEllipsis {
          0%  { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-scan,
          .splash-border-spin,
          .splash-orbit-a,
          .splash-orbit-b,
          .splash-mark-in,
          .splash-status-in,
          .splash-pulse-dot,
          .splash-bar-shimmer {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
