import React, { useEffect, useMemo, useRef, useState } from "react";

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

const BOOT_LINES: string[] = [
  "GH/BIOS v2.8.14 — initializing secure runtime",
  "Checking device bus... OK",
  "Verifying shaders... OK",
  "Mounting encrypted volumes... OK",
  "Loading cuephoria-pos modules...",
  "Networking stack: online",
  "Auth subsystem: ready",
  "UI compositor: ready",
  "Warming caches...",
  "Boot sequence complete.",
];

const LOGIN_SUCCESS_LINES: string[] = [
  "AUTH: token accepted",
  "ACL: role binding applied",
  "Session: hardened",
  "Sync: fetching dashboards",
  "Realtime: subscribing channels",
  "Welcome back, operator.",
];

type MatrixRainCanvasProps = {
  enabled: boolean;
  className?: string;
};

function MatrixRainCanvas({ enabled, className }: MatrixRainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const columnsRef = useRef<number>(0);
  const dropsRef = useRef<Float32Array | null>(null);
  const speedsRef = useRef<Float32Array | null>(null);

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

      const fontSize = 14;
      const cols = Math.max(1, Math.floor(w / fontSize));
      columnsRef.current = cols;

      const drops = new Float32Array(cols);
      const speeds = new Float32Array(cols);
      for (let i = 0; i < cols; i++) {
        drops[i] = -Math.random() * 60;
        speeds[i] = 0.75 + Math.random() * 2.25;
      }
      dropsRef.current = drops;
      speedsRef.current = speeds;
    });

    ro.observe(el);
    resizeObsRef.current = ro;
    return () => {
      ro.disconnect();
      resizeObsRef.current = null;
    };
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

    const glyphs = "アァカサタナハマヤャラワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%*+";
    const fontSize = 14;
    ctx.font =
      `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, ` +
      `"Liberation Mono", "Courier New", monospace`;
    ctx.textBaseline = "top";

    const draw = () => {
      const { w, h } = sizeRef.current;
      const cols = columnsRef.current;
      const drops = dropsRef.current;
      const speeds = speedsRef.current;
      if (!w || !h || !cols || !drops || !speeds) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Trail fade
      ctx.fillStyle = "rgba(0,0,0,0.065)";
      ctx.fillRect(0, 0, w, h);

      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(120, 255, 170, 0.25)";

      for (let i = 0; i < cols; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        const ch = glyphs[Math.floor(Math.random() * glyphs.length)] || "0";

        // body (slightly dimmer)
        ctx.fillStyle = "rgba(0, 255, 140, 0.22)";
        ctx.fillText(ch, x, y - fontSize);

        // head (bright)
        ctx.fillStyle = "rgba(170, 255, 210, 0.92)";
        ctx.fillText(ch, x, y);

        drops[i] += speeds[i];
        if (y > h && Math.random() > 0.975) {
          drops[i] = -Math.random() * 50;
          speeds[i] = 0.75 + Math.random() * 2.25;
        }
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
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

export default function SplashScreen({ variant, onDone }: SplashScreenProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [exiting, setExiting] = useState(false);
  const [exitSource, setExitSource] = useState<"auto" | "click" | null>(null);

  const exitTimerRef = useRef<number | null>(null);
  const exitingRef = useRef(false);
  exitingRef.current = exiting;

  const allLines = useMemo(() => {
    return variant === "boot" ? BOOT_LINES : LOGIN_SUCCESS_LINES;
  }, [variant]);

  const beginExit = (source: "auto" | "click") => {
    if (exitingRef.current) return;
    setExitSource(source);
    setExiting(true);

    const delayMs = source === "click" ? 650 : 750;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      onDone();
    }, delayMs);
  };

  useEffect(() => {
    setProgress(0);
    setLines([]);
    setExiting(false);
    setExitSource(null);
    exitingRef.current = false;
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;

    const durationMs = 3500;
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

  useEffect(() => {
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 1;
      setLines(allLines.slice(0, idx));
      if (idx >= allLines.length) window.clearInterval(timer);
    }, 260);
    return () => window.clearInterval(timer);
  }, [allLines]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  const pct = Math.round(progress * 100);
  const exitDurationClass =
    exitSource === "click" ? "duration-[650ms]" : "duration-[750ms]";

  return (
    <div
      className={[
        "fixed inset-0 z-[99999] pointer-events-auto select-none",
        "flex items-center justify-center p-4 sm:p-6",
        "transition-opacity ease-out",
        exitDurationClass,
        exiting ? "opacity-0" : "opacity-100",
      ].join(" ")}
      aria-live="polite"
      aria-label={variant === "boot" ? "Boot splash screen" : "Login success splash screen"}
    >
      {/* base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060611] via-[#070a14] to-[#0b0720]" />

      {/* matrix (behind card) */}
      <MatrixRainCanvas
        enabled={!prefersReducedMotion}
        className="absolute inset-0 opacity-[0.42] blur-[0.2px]"
      />

      {/* micro textures */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.07]" />
      <div className="absolute inset-0 bg-noise-soft opacity-[0.10] mix-blend-overlay" />
      <div className="absolute inset-0 bg-scanlines opacity-[0.18] mix-blend-overlay" />
      <div className="absolute inset-0 gh-scanline opacity-[0.30] pointer-events-none" />

      {/* glow blobs */}
      <div className="absolute -top-28 -left-28 h-[380px] w-[380px] rounded-full bg-emerald-400/12 blur-3xl gh-splash-float" />
      <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-fuchsia-400/10 blur-3xl gh-splash-float2" />

      {/* card */}
      <div
        className={[
          "relative z-10 w-full max-w-[740px]",
          "rounded-3xl border border-white/10 bg-black/45 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.65)]",
          "overflow-hidden",
          "transform-gpu transition-all ease-[cubic-bezier(.2,.8,.2,1)]",
          exitDurationClass,
          exiting
            ? "opacity-0 translate-y-2 scale-[0.985] blur-[1px]"
            : "opacity-100 translate-y-0 scale-100 blur-0",
          "gh-splash-shimmer",
        ].join(" ")}
      >
        {/* inner wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-fuchsia-500/10" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl" />
                <div className="relative rounded-2xl border border-white/10 bg-black/40 p-2">
                  <img
                    src="/lovable-uploads/edbcb263-8fde-45a9-b66b-02f664772425.png"
                    alt="Cuephoria"
                    className="h-12 w-12 sm:h-14 sm:w-14 object-contain drop-shadow-[0_0_18px_rgba(16,185,129,0.25)] gh-splash-pop"
                    draggable={false}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <div
                  className="gh-glitch text-xl sm:text-2xl font-semibold tracking-wide text-white"
                  data-text="CUEPHORIA OS"
                >
                  CUEPHORIA OS
                </div>
                <div className="mt-1 text-xs sm:text-sm text-white/70">
                  Powered by <span className="font-semibold text-white">Cuephoria Tech</span>
                </div>
                <div className="mt-1 text-[11px] sm:text-sm text-white/55">
                  {variant === "boot" ? "Booting secure runtime…" : "Login verified — initializing session…"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="text-right">
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-white/50">
                  progress
                </div>
                <div className="text-sm sm:text-base font-mono text-emerald-200/90 tabular-nums">
                  {pct.toString().padStart(3, "0")}%
                </div>
              </div>

              <button
                type="button"
                onClick={() => beginExit("click")}
                className={[
                  "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white",
                  "hover:bg-white/10 active:scale-[0.98] transition transform-gpu",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70",
                ].join(" ")}
              >
                Enter
              </button>
            </div>
          </div>

          {/* terminal */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/55 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">
                {variant === "boot" ? "BOOT LOG" : "SESSION LOG"}
              </div>
              <div className="text-[10px] font-mono text-white/40">
                cuephoria://os/splash/{variant}
              </div>
            </div>

            <div className="mt-3 space-y-1.5 font-mono text-xs sm:text-sm text-emerald-100/85">
              {lines.map((l, i) => (
                <div key={`${i}-${l}`} className="flex gap-2">
                  <span className="text-emerald-300/80">›</span>
                  <span className="min-w-0 break-words">{l}</span>
                </div>
              ))}
              <div className="flex gap-2">
                <span className="text-emerald-300/80">›</span>
                <span className="text-emerald-100/80">
                  <span className="opacity-80">_</span>
                  <span className="inline-block w-[8px] h-[14px] bg-emerald-200/80 align-[-2px] ml-1 gh-blink-cursor" />
                </span>
              </div>
            </div>
          </div>

          {/* progress bar */}
          <div className="mt-5">
            <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-200 to-fuchsia-300 transition-[width] duration-150 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
