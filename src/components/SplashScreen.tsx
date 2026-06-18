import React, { useEffect, useMemo, useRef, useState } from "react";
import { Gamepad2, ShieldCheck, Sparkles } from "lucide-react";

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

    // Safari < 14
    // eslint-disable-next-line deprecation/deprecation
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => {
      // eslint-disable-next-line deprecation/deprecation
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}

// ─── Log lines ────────────────────────────────────────────────────────────────
const BOOT_LINES: string[] = [
  "› initializing cuetronix runtime",
  "› mounting secure session vault",
  "› establishing tenant channel",
  "› synchronising branding manifest",
  "› compositor ready",
  "› realtime sockets online",
  "› hello, operator",
];

const LOGIN_SUCCESS_LINES: string[] = [
  "› credentials verified",
  "› session hardened · 2FA ok",
  "› loading workspace manifest",
  "› restoring last view",
  "› welcome back",
];

// ─── Lightweight starfield canvas ─────────────────────────────────────────────
// Self-contained (no three.js), fits the 3-second splash budget without
// bringing in the heavy galaxy scene from the landing page.
type StarfieldCanvasProps = {
  enabled: boolean;
  className?: string;
};

function StarfieldCanvas({ enabled, className }: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const starsRef = useRef<
    Array<{ x: number; y: number; z: number; r: number; hue: number; tw: number }>
  >([]);

  // Resize + star regeneration
  useEffect(() => {
    const el = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      sizeRef.current = { w, h, dpr };

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(90, Math.min(260, Math.floor((w * h) / 9000)));
      const stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random() * 0.85 + 0.15,
          r: Math.random() * 1.4 + 0.2,
          hue: Math.random(),
          tw: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = stars;
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    let last = performance.now();

    const draw = (now: number) => {
      const { w, h } = sizeRef.current;
      const dt = Math.min(64, now - last);
      last = now;

      // Clear to fully transparent so layer underneath (gradient) shows through
      ctx.clearRect(0, 0, w, h);

      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Gentle rightward / downward drift in parallax to the star's depth
        s.x += (0.015 + s.z * 0.035) * dt;
        s.y += (0.008 + s.z * 0.02) * dt;
        s.tw += 0.002 * dt;

        if (s.x > w + 8) s.x = -8;
        if (s.y > h + 8) s.y = -8;

        // Twinkle + colour wheel across violet / fuchsia / blue
        const twinkle = 0.55 + Math.sin(s.tw) * 0.45;
        const alpha = clamp01(0.25 + s.z * 0.7) * twinkle;

        // Pick a warm violet / fuchsia / cool indigo hue based on `hue` slot
        let color: string;
        if (s.hue < 0.45) color = `rgba(167,139,250,${alpha.toFixed(3)})`; // violet
        else if (s.hue < 0.8) color = `rgba(240,171,252,${alpha.toFixed(3)})`; // fuchsia
        else color = `rgba(147,197,253,${alpha.toFixed(3)})`; // blue

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowBlur = 6 * s.z;
        ctx.shadowColor = color;
        ctx.arc(s.x, s.y, s.r * (0.8 + s.z * 1.1), 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled]);

  return (
    <div ref={wrapperRef} className={className}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function SplashScreen({ variant, onDone }: SplashScreenProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [exiting, setExiting] = useState(false);
  const [exitSource, setExitSource] = useState<"auto" | "click" | null>(null);

  const exitTimerRef = useRef<number | null>(null);
  const exitingRef = useRef(false);
  exitingRef.current = exiting;

  const allLines = useMemo(
    () => (variant === "boot" ? BOOT_LINES : LOGIN_SUCCESS_LINES),
    [variant],
  );

  const isSuccess = variant === "login_success";

  const beginExit = (source: "auto" | "click") => {
    if (exitingRef.current) return;
    setExitSource(source);
    setExiting(true);

    const delayMs = source === "click" ? 500 : 650;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      onDone();
    }, delayMs);
  };

  // Progress timer
  useEffect(() => {
    setProgress(0);
    setLines([]);
    setExiting(false);
    setExitSource(null);
    exitingRef.current = false;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;

    // Success variant finishes faster — user has already authenticated and is
    // just waiting. Boot takes a beat longer because we want the brand moment.
    const durationMs = isSuccess ? 2400 : 3200;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      if (exitingRef.current) return;
      const p = clamp01((now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
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

  // Stream log lines in, one at a time
  useEffect(() => {
    let idx = 0;
    const cadence = isSuccess ? 220 : 300;
    const timer = window.setInterval(() => {
      idx += 1;
      setLines(allLines.slice(0, idx));
      if (idx >= allLines.length) window.clearInterval(timer);
    }, cadence);
    return () => window.clearInterval(timer);
  }, [allLines, isSuccess]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Listen for Enter to skip
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
  const exitDurationClass =
    exitSource === "click"
      ? "[transition-duration:500ms]"
      : "[transition-duration:650ms]";

  return (
    <div
      className={[
        "fixed inset-0 z-[99999] select-none overflow-hidden",
        "flex items-center justify-center p-4 sm:p-6",
        "transition-opacity ease-out",
        exitDurationClass,
        exiting ? "opacity-0" : "opacity-100",
      ].join(" ")}
      aria-live="polite"
      aria-label={isSuccess ? "Access granted splash screen" : "Boot splash screen"}
    >
      {/* ── Deep gradient base ── */}
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

      {/* ── Starfield (violet/fuchsia) ── */}
      <StarfieldCanvas
        enabled={!prefersReducedMotion}
        className="absolute inset-0 opacity-90"
      />

      {/* ── Film-grain noise ── */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "220px",
        }}
      />

      {/* ── Vignette ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(7,3,15,0.65) 100%)",
        }}
      />

      {/* ── Floating ambient glows ── */}
      <div className="gh-splash-float pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-[100px]" />
      <div className="gh-splash-float2 pointer-events-none absolute -bottom-32 -right-24 h-[460px] w-[460px] rounded-full bg-fuchsia-500/18 blur-[110px]" />

      {/* ── Glass card ── */}
      <div
        className={[
          "relative z-10 w-full max-w-[720px]",
          "transform-gpu transition-all [transition-timing-function:cubic-bezier(.2,.8,.2,1)]",
          exitDurationClass,
          exiting
            ? "translate-y-2 scale-[0.985] opacity-0 blur-[1px]"
            : "translate-y-0 scale-100 opacity-100 blur-0",
        ].join(" ")}
      >
        {/* Blurred gradient halo behind card */}
        <div
          className="absolute -inset-px rounded-[30px] opacity-70 blur-2xl"
          style={{
            background: isSuccess
              ? "linear-gradient(135deg, rgba(124,58,237,0.45), rgba(236,72,153,0.35), rgba(52,211,153,0.28))"
              : "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(236,72,153,0.35), rgba(59,130,246,0.28))",
          }}
        />

        <div
          className="relative overflow-hidden rounded-[28px] border border-white/10"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,12,38,0.8) 0%, rgba(12,7,24,0.82) 100%)",
            backdropFilter: "blur(32px) saturate(170%)",
            WebkitBackdropFilter: "blur(32px) saturate(170%)",
            boxShadow:
              "0 30px 80px -30px rgba(124,58,237,0.5), 0 10px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Top accent shine line */}
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
            }}
          />

          {/* Inner radial tints */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(800px 300px at 15% 0%, rgba(167,139,250,0.18), transparent 60%)," +
                (isSuccess
                  ? "radial-gradient(700px 280px at 85% 100%, rgba(52,211,153,0.12), transparent 65%)"
                  : "radial-gradient(700px 280px at 85% 100%, rgba(236,72,153,0.12), transparent 65%)"),
            }}
          />

          <div className="relative p-6 sm:p-9">
            {/* ── Header row ── */}
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {/* Logo chip */}
                <div className="relative">
                  <div
                    className={`absolute inset-0 rounded-2xl blur-xl ${
                      isSuccess ? "bg-emerald-400/25" : "bg-violet-500/30"
                    }`}
                  />
                  {isSuccess ? (
                    <div
                      className={[
                        "gh-splash-pop relative flex h-14 w-14 items-center justify-center rounded-2xl",
                        "border border-white/15 shadow-lg shadow-emerald-500/30",
                      ].join(" ")}
                      style={{
                        background:
                          "linear-gradient(135deg, #10b981 0%, #8b5cf6 55%, #ec4899 100%)",
                      }}
                    >
                      {/* Checkmark */}
                      <svg
                        viewBox="0 0 24 24"
                        className="h-7 w-7 text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className={[
                        "gh-splash-pop relative flex h-14 w-14 items-center justify-center rounded-2xl",
                        "border border-white/15 shadow-lg shadow-violet-600/40",
                      ].join(" ")}
                      style={{
                        background:
                          "linear-gradient(135deg, #8b5cf6 0%, #ec4899 55%, #f43f5e 100%)",
                      }}
                    >
                      <Gamepad2
                        size={24}
                        className="text-white drop-shadow-[0_0_8px_rgba(236,72,153,0.45)]"
                      />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xl font-extrabold tracking-tight text-white sm:text-2xl"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      Cue
                      <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                        tronix
                      </span>
                    </span>
                    <span
                      className={[
                        "ml-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]",
                        isSuccess
                          ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : "border border-violet-400/30 bg-violet-400/10 text-violet-200",
                      ].join(" ")}
                    >
                      {isSuccess ? "Access Granted" : "OS v2.0"}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/55 sm:text-xs">
                    {isSuccess ? "Session ready" : "Premium lounge OS"}
                  </div>
                  <div className="mt-2 max-w-[360px] text-xs text-white/60 sm:text-sm">
                    {isSuccess
                      ? "Session verified and hardened. Spinning up your workspace…"
                      : "Booting secure runtime — compositing dashboards and station data…"}
                  </div>
                </div>
              </div>

              {/* Progress + Enter */}
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 sm:text-xs">
                    Progress
                  </div>
                  <div
                    className={[
                      "font-mono text-sm tabular-nums sm:text-base",
                      isSuccess ? "text-emerald-200/90" : "text-fuchsia-200/90",
                    ].join(" ")}
                  >
                    {pct.toString().padStart(3, "0")}%
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => beginExit("click")}
                  className={[
                    "group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl",
                    "border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white",
                    "transition hover:bg-white/[0.08] active:scale-[0.98]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70",
                  ].join(" ")}
                >
                  <Sparkles
                    size={12}
                    className={isSuccess ? "text-emerald-300" : "text-fuchsia-300"}
                  />
                  Enter
                </button>
              </div>
            </div>

            {/* ── Terminal block ── */}
            <div
              className="relative mt-6 overflow-hidden rounded-2xl border border-white/10"
              style={{
                background: "rgba(5,2,12,0.72)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400/60" />
                    <span className="h-2 w-2 rounded-full bg-amber-300/60" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
                  </div>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
                    {isSuccess ? "Session log" : "Boot log"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-white/35">
                  cuetronix://os/{variant}
                </span>
              </div>

              <div className="px-4 py-4 font-mono text-xs leading-relaxed text-white/80 sm:text-[13px]">
                {lines.map((l, i) => (
                  <div
                    key={`${i}-${l}`}
                    className={[
                      "flex gap-2 transition-opacity",
                      isSuccess ? "text-emerald-100/90" : "text-violet-100/90",
                    ].join(" ")}
                  >
                    <span className="break-words">{l}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-block h-[14px] w-[8px] align-[-2px]",
                      isSuccess ? "bg-emerald-200/80" : "bg-fuchsia-200/80",
                      "gh-blink-cursor",
                    ].join(" ")}
                  />
                </div>
              </div>
            </div>

            {/* ── Progress bar ── */}
            <div className="mt-6">
              <div
                className="h-2 w-full overflow-hidden rounded-full border border-white/10"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="relative h-full rounded-full transition-[width] duration-150 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: isSuccess
                      ? "linear-gradient(90deg, #34d399 0%, #a78bfa 50%, #f0abfc 100%)"
                      : "linear-gradient(90deg, #a78bfa 0%, #f0abfc 50%, #60a5fa 100%)",
                    boxShadow: isSuccess
                      ? "0 0 16px rgba(52,211,153,0.45)"
                      : "0 0 16px rgba(167,139,250,0.55)",
                  }}
                >
                  <span className="pointer-events-none absolute inset-0 gh-splash-shimmer" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-white/55">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck
                    size={11}
                    className={isSuccess ? "text-emerald-300" : "text-violet-300"}
                  />
                  {isSuccess
                    ? "Multi-tenant isolation · audited"
                    : "PBKDF2 · RLS · TOTP ready"}
                </span>
                <span className="hidden sm:inline">Press Enter to skip</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local keyframes */}
      <style>{`
        @keyframes ghSplashFloatA {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%      { transform: translate(20px, -12px) scale(1.05); }
        }
        @keyframes ghSplashFloatB {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%      { transform: translate(-16px, 10px) scale(1.04); }
        }
        .gh-splash-float  { animation: ghSplashFloatA 7s ease-in-out infinite; }
        .gh-splash-float2 { animation: ghSplashFloatB 9s ease-in-out infinite; }

        @keyframes ghSplashPop {
          0%   { transform: scale(0.88); opacity: 0; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .gh-splash-pop { animation: ghSplashPop 0.75s cubic-bezier(.2,.8,.2,1) both; }

        @keyframes ghBlinkCursor {
          0%, 48%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .gh-blink-cursor { animation: ghBlinkCursor 1.1s steps(2, end) infinite; }

        @keyframes ghSplashShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .gh-splash-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
          animation: ghSplashShimmer 1.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
