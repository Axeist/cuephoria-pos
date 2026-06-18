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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* floating glow particles */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-2 h-2 rounded-full bg-cuephoria-purple/50 blur-[1px] animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-3 h-3 rounded-full bg-cuephoria-lightpurple/40 blur-[2px] animate-pulse [animation-delay:600ms]" />
        <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-cuephoria-blue/40 blur-[1px] animate-pulse [animation-delay:1200ms]" />
      </div>

      {/* content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <div className="mx-auto flex w-full flex-col items-center gap-6 rounded-2xl border border-white/10 bg-black/30 p-10 text-center shadow-2xl shadow-cuephoria-purple/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-cuephoria-lightpurple">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs tracking-widest uppercase">Cuephoria</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Ghost className="h-8 w-8 text-cuephoria-purple/80" />
              <h1 className="text-5xl font-extrabold leading-none bg-gradient-to-r from-cuephoria-purple via-cuephoria-lightpurple to-cuephoria-blue bg-clip-text text-transparent">
                404
              </h1>
            </div>

            {/* Quirky gamer-friendly message */}
            <p className="text-xl font-semibold text-white/90">
              Respawn failed! This map doesn’t exist.
            </p>
            <p className="text-sm text-gray-400">
              You wandered into the void:{" "}
              <span className="font-mono text-gray-300">{location.pathname}</span>
            </p>

            <a
              href="/"
              className="group mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple px-5 py-3 font-medium text-white shadow-lg shadow-cuephoria-lightpurple/20 transition-transform duration-150 hover:scale-[1.02] focus:outline-none"
            >
              <Home className="h-4 w-4" />
              Return to Safe Zone
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>

            <div className="pt-2 text-xs text-gray-500">
              Need a revive? Contact{" "}
              <a
                href="mailto:contact@cuephoria.in"
                className="text-cuephoria-lightpurple hover:underline"
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
