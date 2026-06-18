import React, { useEffect, useRef, useState } from "react";
import { VenueLocation } from "@/context/LocationContext";

interface Props {
  isVisible: boolean;
  targetLocation: VenueLocation | null;
}

const LINES = [
  "Flushing active caches...",
  "Rebinding location context...",
  "Hydrating branch data...",
  "Syncing sessions...",
  "Branch switch complete.",
];

export function BranchSwitchOverlay({ isVisible, targetLocation }: Props) {
  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const lineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLite = targetLocation?.slug === "lite";
  const primary = isLite ? "#06b6d4" : "#9b87f5";
  const ring1 = isLite
    ? "border-cyan-500/40 border-t-cyan-400"
    : "border-purple-500/40 border-t-purple-400";
  const ring2 = isLite
    ? "border-cyan-600/20 border-r-cyan-500"
    : "border-purple-600/20 border-r-purple-500";
  const gradFrom = isLite ? "from-cyan-950" : "from-purple-950";

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
      setLineIdx(0);
      setProgress(0);

      let idx = 0;
      const advance = () => {
        idx++;
        setLineIdx(idx);
        if (idx < LINES.length - 1) {
          lineTimer.current = setTimeout(advance, 340);
        }
      };
      lineTimer.current = setTimeout(advance, 280);

      let p = 0;
      progressTimer.current = setInterval(() => {
        p += 2.2;
        setProgress(Math.min(p, 100));
        if (p >= 100 && progressTimer.current) {
          clearInterval(progressTimer.current);
        }
      }, 40);
    } else {
      if (lineTimer.current) clearTimeout(lineTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
      // Delay removal so fade-out animation plays
      const hideTimer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(hideTimer);
    }

    return () => {
      if (lineTimer.current) clearTimeout(lineTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [isVisible]);

  if (!visible || !targetLocation) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center
        bg-gradient-to-br ${gradFrom}/95 via-slate-950/98 to-black
        transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
      style={{ backdropFilter: "blur(8px)" }}
    >
      {/* Spinning rings */}
      <div className="relative flex items-center justify-center mb-10">
        <div
          className={`w-32 h-32 rounded-full border-4 animate-spin absolute ${ring1}`}
          style={{ animationDuration: "1s" }}
        />
        <div
          className={`w-24 h-24 rounded-full border-4 border-transparent animate-spin absolute ${ring2}`}
          style={{ animationDuration: "1.6s", animationDirection: "reverse" }}
        />
        <img
          src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
          alt="Cuephoria"
          className="h-14 relative z-10 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse-soft"
        />
      </div>

      {/* Branch badge */}
      <div
        className="mb-5 px-5 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase border"
        style={{
          borderColor: primary,
          color: primary,
          background: `${primary}18`,
          boxShadow: `0 0 18px ${primary}30`,
        }}
      >
        {targetLocation.name}
      </div>

      {/* Terminal lines */}
      <div className="font-mono text-[11px] text-left w-72 mb-6 space-y-0.5">
        {LINES.slice(0, Math.min(lineIdx + 1, LINES.length)).map((line, i) => (
          <div
            key={i}
            className={`transition-all duration-200 ${
              i === Math.min(lineIdx, LINES.length - 1)
                ? "text-white"
                : "text-white/30"
            }`}
          >
            <span style={{ color: primary }} className="mr-2">
              {i < Math.min(lineIdx, LINES.length - 1) ? "✓" : "▸"}
            </span>
            {line}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-72 h-[3px] bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${primary}80, ${primary})`,
            boxShadow: `0 0 8px ${primary}`,
          }}
        />
      </div>
      <p className="mt-2 text-[10px] font-mono text-white/30 tracking-widest">
        {Math.round(progress)}%
      </p>
    </div>
  );
}
