import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { CUETRONIX_ASSETS } from "@/branding/assets";
import CuephoriaTechAttribution from "@/components/branding/CuephoriaTechAttribution";
import SiteAmbientBackground from "@/components/landing/SiteAmbientBackground";

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

const SEGMENTS = 12;

export default function SplashScreen({ variant, onDone }: SplashScreenProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
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
    ? { from: "#34d399", mid: "#6ee7b7", to: "#a78bfa", glow: "rgba(52,211,153,0.38)", line: "#6ee7b7" }
    : { from: "#8b5cf6", mid: "#c084fc", to: "#22d3ee", glow: "rgba(139,92,246,0.42)", line: "#c084fc" };

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
  const filledSegments = Math.floor((progress * SEGMENTS) + 0.001);
  const status = statusLines[statusIndex];
  const exitMs = exitSource === "click" ? 380 : 480;
  const motion = !prefersReducedMotion && !exiting;
  const nodeId = isSuccess ? "AUTH-OK" : "BOOT-SEQ";

  return (
    <div
      className={[
        "fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-[#05060b] px-5 sm:px-6",
        "transition-opacity ease-out",
        exiting ? "opacity-0" : "opacity-100",
      ].join(" ")}
      style={{ transitionDuration: `${exitMs}ms` }}
      aria-live="polite"
      aria-label={isSuccess ? "Loading workspace" : "Starting application"}
    >
      {/* Same animated galaxy field as login / signup (SiteAmbientBackground) */}
      <SiteAmbientBackground />

      {/* Corner HUD */}
      <div aria-hidden className="pointer-events-none absolute left-5 top-5 z-[2] hidden font-mono text-[9px] uppercase tracking-[0.24em] text-violet-300/35 sm:block">
        <div>Node · {nodeId}</div>
        <div className="mt-1 text-cyan-300/30">Channel · TLS 1.3</div>
      </div>
      <div aria-hidden className="pointer-events-none absolute right-5 top-5 z-[2] hidden text-right font-mono text-[9px] uppercase tracking-[0.24em] text-violet-300/35 sm:block">
        <div>Mesh · online</div>
        <div className="mt-1 text-cyan-300/30">RLS · enforced</div>
      </div>

      {/* Panel */}
      <div
        className={[
          "relative z-10 w-full max-w-[460px] transform-gpu transition-all ease-out",
          exiting ? "translate-y-2 scale-[0.985] opacity-0 blur-[2px]" : "translate-y-0 scale-100 opacity-100 blur-0",
        ].join(" ")}
        style={{ transitionDuration: `${exitMs}ms` }}
      >
        <div
          aria-hidden
          className={["pointer-events-none absolute -inset-12 rounded-[44px]", motion ? "splash-card-glow" : ""].join(" ")}
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${accent.glow}, transparent 70%)`,
            filter: "blur(32px)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[1px] rounded-[27px]"
          style={{
            boxShadow: `0 0 56px ${accent.from}50, 0 0 110px ${accent.to}28`,
          }}
        />

        <div
          className="relative overflow-hidden rounded-[26px] border border-white/[0.11]"
          style={{
            background:
              "linear-gradient(168deg, rgba(18,12,34,0.9) 0%, rgba(10,8,22,0.94) 50%, rgba(8,6,18,0.97) 100%)",
            backdropFilter: "blur(52px) saturate(190%)",
            WebkitBackdropFilter: "blur(52px) saturate(190%)",
            boxShadow: "0 36px 90px -36px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Inner holo grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Holographic scan */}
          {motion ? (
            <div
              aria-hidden
              className="splash-holo-scan pointer-events-none absolute inset-x-0 z-[1] h-[2px]"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent.line}88, ${accent.to}cc, ${accent.line}88, transparent)`,
                boxShadow: `0 0 24px ${accent.from}66`,
              }}
            />
          ) : null}

          {/* HUD corners */}
          <span aria-hidden className="absolute left-3 top-3 h-4 w-4 border-l border-t border-violet-400/50" />
          <span aria-hidden className="absolute right-3 top-3 h-4 w-4 border-r border-t border-cyan-400/45" />
          <span aria-hidden className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-violet-400/35" />
          <span aria-hidden className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-cyan-400/35" />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-5 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
          />

          <div className="relative px-8 py-10 sm:px-10 sm:py-11">
            {/* Logo */}
            <div className="relative mx-auto mb-7 flex h-[92px] w-[92px] items-center justify-center">
              <svg aria-hidden className="absolute h-[92px] w-[92px] text-violet-400/20" viewBox="0 0 92 92" fill="none">
                <circle cx="46" cy="46" r="42" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 7" />
              </svg>
              <svg
                aria-hidden
                className={["absolute h-[76px] w-[76px] text-cyan-400/15", motion ? "splash-ring-pulse" : ""].join(" ")}
                viewBox="0 0 76 76"
                fill="none"
              >
                <circle cx="38" cy="38" r="34" stroke="currentColor" strokeWidth="0.5" />
              </svg>
              <div
                aria-hidden
                className={["absolute inset-2 rounded-3xl", motion ? "splash-logo-glow" : ""].join(" ")}
                style={{
                  background: `radial-gradient(circle, ${accent.glow}, transparent 72%)`,
                  filter: "blur(14px)",
                }}
              />
              <div
                className={[
                  "relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-2xl",
                  "border border-white/14 bg-black/55",
                  motion ? "splash-mark-in" : "",
                ].join(" ")}
                style={{
                  boxShadow: `0 0 36px ${accent.from}60, inset 0 1px 0 rgba(255,255,255,0.12)`,
                }}
              >
                <img src={CUETRONIX_ASSETS.iconUrl} alt="" className="h-12 w-12 object-contain" draggable={false} />
                {isSuccess ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0a0814] bg-emerald-400 text-[#04120d] shadow-[0_0_16px_rgba(52,211,153,0.6)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </div>
            </div>

            <img
              src={CUETRONIX_ASSETS.logoUrl}
              alt={CUETRONIX_ASSETS.logoAlt}
              className="mx-auto h-7 w-auto max-w-[250px] object-contain opacity-95"
              draggable={false}
            />

            <CuephoriaTechAttribution variant="built-by" className="mt-4 text-center" />

            <div className="mt-5 flex items-center justify-center gap-2.5">
              <span
                className={["inline-flex h-1.5 w-1.5 rounded-full", isSuccess ? "bg-emerald-400" : "bg-violet-400", motion ? "splash-pulse-dot" : ""].join(" ")}
                style={{ boxShadow: `0 0 12px ${isSuccess ? "#34d399" : "#a78bfa"}` }}
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-300/80">
                {isSuccess ? "Access granted" : "System boot"}
              </p>
            </div>

            <p
              key={status}
              className={["mt-3 min-h-[22px] text-center font-mono text-[13px] tracking-wide text-zinc-200/90", motion ? "splash-status-in" : ""].join(" ")}
            >
              <span className="text-violet-400/70">› </span>
              {status}
              <span className="splash-ellipsis text-cyan-300/60" />
            </p>

            {/* Segmented LED progress */}
            <div className="mt-9">
              <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                <span>Load sequence</span>
                <span className="tabular-nums text-zinc-300/80">{pct.toString().padStart(3, "0")}%</span>
              </div>

              <div className="flex gap-[3px]">
                {Array.from({ length: SEGMENTS }).map((_, i) => {
                  const lit = i < filledSegments;
                  const edge = i === filledSegments - 1 && filledSegments > 0;
                  return (
                    <div
                      key={i}
                      className="relative h-[5px] flex-1 overflow-hidden rounded-[2px]"
                      style={{
                        background: lit ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.03)",
                        boxShadow: lit ? `inset 0 0 0 1px ${accent.from}33` : undefined,
                      }}
                    >
                      {lit ? (
                        <div
                          className="absolute inset-0 rounded-[2px]"
                          style={{
                            background: `linear-gradient(180deg, ${accent.to}, ${accent.from})`,
                            boxShadow: edge ? `0 0 14px ${accent.from}88` : `0 0 6px ${accent.from}44`,
                            opacity: edge ? 1 : 0.85,
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                    Encrypted · multi-tenant RLS
                  </p>
                  <p className="mt-1 truncate font-mono text-[9px] text-zinc-700">
                    {isSuccess ? "session://verified" : "boot://cuephoriatech.in"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => beginExit("click")}
                  className={[
                    "shrink-0 rounded-md border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    "border-violet-400/25 bg-violet-500/[0.08] text-violet-100/90",
                    "transition hover:border-cyan-400/35 hover:bg-cyan-500/[0.1] hover:text-white",
                    "hover:shadow-[0_0_28px_rgba(139,92,246,0.35)]",
                  ].join(" ")}
                >
                  Enter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-6 z-10 font-mono text-[9px] tracking-[0.22em] text-zinc-600/80">
        [ ENTER ] SKIP SEQUENCE
      </p>

      <style>{`
        @keyframes splashFloorGrid {
          0%   { background-position: 0 0, 0 0; }
          100% { background-position: 0 64px, 64px 0; }
        }
        .splash-floor-grid { animation: splashFloorGrid 5s linear infinite; }

        @keyframes splashGlowA {
          0%, 100% { opacity: 0.55; transform: translate(0, 0) scale(1); }
          50%      { opacity: 0.9; transform: translate(14px, -10px) scale(1.07); }
        }
        @keyframes splashGlowB {
          0%, 100% { opacity: 0.45; transform: translate(0, 0) scale(1); }
          50%      { opacity: 0.8; transform: translate(-12px, 8px) scale(1.06); }
        }
        @keyframes splashGlowC {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 0.9; transform: translate(-50%, -50%) scale(1.1); }
        }
        .splash-glow-a { animation: splashGlowA 7s ease-in-out infinite; }
        .splash-glow-b { animation: splashGlowB 8.5s ease-in-out infinite; }
        .splash-glow-c { animation: splashGlowC 6s ease-in-out infinite; }

        @keyframes splashEnergyBeam {
          0%, 100% { opacity: 0.35; transform: scaleX(0.92); }
          50%      { opacity: 0.75; transform: scaleX(1); }
        }
        .splash-energy-beam { animation: splashEnergyBeam 4s ease-in-out infinite; }

        @keyframes splashHoloScan {
          0%   { top: 0%; opacity: 0; }
          8%   { opacity: 0.9; }
          92%  { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        .splash-holo-scan { animation: splashHoloScan 4.2s ease-in-out infinite; }

        @keyframes splashCardGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.04); }
        }
        .splash-card-glow { animation: splashCardGlow 4.5s ease-in-out infinite; }

        @keyframes splashRingPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.98); }
          50%      { opacity: 1; transform: scale(1.02); }
        }
        .splash-ring-pulse { animation: splashRingPulse 3.8s ease-in-out infinite; }

        @keyframes splashLogoGlow {
          0%, 100% { opacity: 0.75; transform: scale(0.96); }
          50%      { opacity: 1; transform: scale(1.06); }
        }
        .splash-logo-glow { animation: splashLogoGlow 3.5s ease-in-out infinite; }

        @keyframes splashMarkIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .splash-mark-in { animation: splashMarkIn 0.7s cubic-bezier(.2,.8,.2,1) both; }

        @keyframes splashStatusIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .splash-status-in { animation: splashStatusIn 0.4s ease-out both; }

        @keyframes splashPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.85); }
        }
        .splash-pulse-dot { animation: splashPulseDot 1.6s ease-in-out infinite; }

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
          .splash-floor-grid, .splash-glow-a, .splash-glow-b, .splash-glow-c,
          .splash-energy-beam, .splash-holo-scan, .splash-card-glow,
          .splash-ring-pulse, .splash-logo-glow, .splash-mark-in,
          .splash-status-in, .splash-pulse-dot {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
