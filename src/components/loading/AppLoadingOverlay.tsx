import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";

export type AppLoadingOverlayProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  /** Bottom hint under the progress bar. Pass null to hide. */
  footerNote?: string | null;
  /** Match branch-switch / full-app blocking overlays. */
  stack?: "default" | "critical";
  variant?: "cafe" | "default";
};

const AppLoadingOverlay: React.FC<AppLoadingOverlayProps> = ({
  visible,
  title = "Signing you in",
  subtitle = "Securing your session…",
  footerNote = "Encrypted session · please wait",
  stack = "default",
  variant = "default",
}) => {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const accent =
    variant === "cafe"
      ? "from-orange-400 via-amber-300 to-violet-500"
      : "from-violet-400 via-fuchsia-400 to-indigo-500";

  const glowA =
    variant === "cafe"
      ? "radial-gradient(circle, rgba(249,115,22,0.45), transparent 68%)"
      : "radial-gradient(circle, rgba(139,92,246,0.45), transparent 68%)";
  const glowB =
    variant === "cafe"
      ? "radial-gradient(circle, rgba(139,92,246,0.35), transparent 65%)"
      : "radial-gradient(circle, rgba(59,130,246,0.3), transparent 65%)";

  return (
    <AnimatePresence>
      {visible && mounted && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.28 }}
          className={`fixed inset-0 flex flex-col items-center justify-center px-5 ${
            stack === "critical" ? "z-[9999]" : "z-[200]"
          }`}
          style={{
            background:
              "linear-gradient(165deg, rgba(4,6,14,0.97) 0%, rgba(10,8,22,0.95) 42%, rgba(6,8,18,0.98) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {!reduceMotion && (
            <>
              <div
                className="pointer-events-none absolute -top-40 left-1/4 h-[420px] w-[420px] opacity-50 blur-3xl"
                style={{ background: glowA }}
              />
              <div
                className="pointer-events-none absolute -bottom-36 right-1/4 h-[380px] w-[380px] opacity-45 blur-3xl"
                style={{ background: glowB }}
              />
              <div
                className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 opacity-20 blur-3xl"
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)",
                }}
              />
            </>
          )}

          {/* Grain */}
          <div
            className="pointer-events-none fixed inset-0 z-[1] opacity-[0.04]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="relative z-[2] flex w-full max-w-md flex-col items-center">
            {/* Glass morphism card */}
            <div
              className="relative w-full overflow-hidden rounded-[1.75rem] border border-white/[0.12] p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
              style={{
                background:
                  "linear-gradient(155deg, rgba(255,255,255,0.09) 0%, rgba(15,18,30,0.65) 48%, rgba(8,10,20,0.85) 100%)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.15]"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
                  animation: reduceMotion ? "none" : "cafeSplashShine 2.8s ease-in-out infinite",
                }}
              />

              {variant === "cafe" && (
                <p className="relative mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                  Choco Loca × Cuephoria
                </p>
              )}

              <div className="relative mx-auto mb-8 flex h-32 w-32 items-center justify-center">
                {!reduceMotion && (
                  <>
                    <motion.div
                      className={`absolute inset-[-6px] rounded-full bg-gradient-to-br ${accent} opacity-50 blur-xl`}
                      animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.96, 1.04, 0.96] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "conic-gradient(from 0deg, rgba(249,115,22,0.95), rgba(139,92,246,0.95), rgba(34,211,238,0.75), rgba(249,115,22,0.95))",
                        padding: 2,
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-[#070812]/95 backdrop-blur-sm">
                        <Sparkles
                          className={`h-11 w-11 ${variant === "cafe" ? "text-orange-200" : "text-violet-200"}`}
                        />
                      </div>
                    </motion.div>
                    <motion.div
                      className="absolute inset-3 rounded-full border border-dashed border-white/20"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    />
                  </>
                )}
                {reduceMotion && (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-[#070812]">
                    <Sparkles
                      className={`h-10 w-10 ${variant === "cafe" ? "text-orange-200" : "text-violet-200"}`}
                    />
                  </div>
                )}
              </div>

              <h2 className="relative text-center font-heading text-xl font-bold tracking-tight text-white">
                {title}
              </h2>
              <p className="relative mt-1.5 text-center text-sm text-zinc-400">{subtitle}</p>

              <div className="relative mt-8 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className={`absolute top-0 bottom-0 w-[38%] rounded-full bg-gradient-to-r ${accent} shadow-[0_0_20px_rgba(249,115,22,0.35)]`}
                  initial={false}
                  animate={reduceMotion ? { left: "31%" } : { left: ["-45%", "108%"] }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 1.35, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.06 }
                  }
                />
              </div>

              {footerNote != null && footerNote !== "" && (
                <div className="relative mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                  <Loader2
                    className={`h-3.5 w-3.5 ${reduceMotion ? "" : "animate-spin"} ${
                      variant === "cafe" ? "text-orange-400/90" : "text-violet-400/90"
                    }`}
                  />
                  <span className="font-quicksand">{footerNote}</span>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes cafeSplashShine {
              0%, 100% { transform: translateX(-60%); opacity: 0; }
              50% { opacity: 0.12; }
              100% { transform: translateX(60%); opacity: 0; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLoadingOverlay;
