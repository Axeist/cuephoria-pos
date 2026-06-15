import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Ghost, Home, ArrowRight, Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="lp-root min-h-screen relative overflow-hidden bg-[#05060b]">
      {/* Aurora + grid + grain */}
      <div className="lp-aurora" />
      <div className="lp-grid" />

      {/* content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="lp-glass lp-border-glow lp-grain mx-auto flex w-full flex-col items-center gap-6 p-10 text-center">
            <span className="lp-chip text-violet-200">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" /> Cuetronix
            </span>

            <div className="flex items-center justify-center gap-3">
              <Ghost className="h-9 w-9 text-violet-300/80" />
              <h1 className="lp-display lp-holo text-6xl font-bold leading-none">
                404
              </h1>
            </div>

            {/* Quirky gamer-friendly message */}
            <p className="lp-display text-xl font-semibold text-white/90">
              Respawn failed! This map doesn’t exist.
            </p>
            <p className="text-sm text-white/50">
              You wandered into the void:{" "}
              <span className="lp-mono text-white/70">{location.pathname}</span>
            </p>

            <a
              href="/"
              className="lp-btn group mt-2 h-12 px-6"
            >
              <Home className="h-4 w-4" />
              Return to safe zone
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>

            <div className="pt-2 text-xs text-white/40">
              Need a revive? Contact{" "}
              <a
                href="mailto:contact@cuephoria.in"
                className="text-violet-300 hover:underline"
              >
                contact@cuephoria.in
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
