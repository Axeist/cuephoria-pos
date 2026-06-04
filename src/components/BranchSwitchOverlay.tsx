import React, { useEffect, useRef, useState } from "react";
import { VenueLocation } from "@/context/LocationContext";
import { useTenantBrandingOptional } from "@/branding/BrandingProvider";

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

const LITE_PRIMARY = "#06b6d4";
const DEFAULT_PRIMARY = "#9b87f5";

export function BranchSwitchOverlay({ isVisible, targetLocation }: Props) {
  const branding = useTenantBrandingOptional();
  const override = branding?.override ?? {};
  const logoUrl =
    override.logo_url ||
    branding?.brand.assets.logoDarkUrl ||
    branding?.brand.assets.logoLightUrl;
  const workspaceName =
    override.display_name?.trim() || branding?.brand.name || "Workspace";
  const [logoBroken, setLogoBroken] = useState(false);

  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const lineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLite = targetLocation?.slug === "lite";
  const primary = override.primary_color ?? (isLite ? LITE_PRIMARY : DEFAULT_PRIMARY);
  const accent = override.accent_color ?? primary;
  const gradFrom = isLite && !override.primary_color ? "from-cyan-950" : "from-purple-950";
  const initial = workspaceName.charAt(0).toUpperCase() || "W";

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

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
      const hideTimer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(hideTimer);
    }

    return () => {
      if (lineTimer.current) clearTimeout(lineTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [isVisible]);

  if (!visible || !targetLocation) return null;

  const showLogo = logoUrl && !logoBroken;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center
        bg-gradient-to-br ${gradFrom}/95 via-slate-950/98 to-black
        transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div className="relative flex items-center justify-center mb-10">
        <div
          className="w-32 h-32 rounded-full border-4 border-transparent animate-spin absolute"
          style={{
            animationDuration: "1s",
            borderColor: `${primary}66`,
            borderTopColor: primary,
          }}
        />
        <div
          className="w-24 h-24 rounded-full border-4 border-transparent animate-spin absolute"
          style={{
            animationDuration: "1.6s",
            animationDirection: "reverse",
            borderColor: `${accent}33`,
            borderRightColor: accent,
          }}
        />
        <div
          className="relative z-10 h-14 w-14 rounded-xl overflow-hidden grid place-items-center shadow-lg"
          style={{
            background: showLogo
              ? "rgba(15,12,28,0.9)"
              : `linear-gradient(135deg, ${primary}, ${accent})`,
            boxShadow: `0 0 20px ${primary}80`,
          }}
        >
          {showLogo ? (
            <img
              src={logoUrl}
              alt={workspaceName}
              className="h-full w-full object-contain p-1.5 animate-pulse-soft"
              onError={() => setLogoBroken(true)}
            />
          ) : (
            <span className="text-xl font-bold text-white drop-shadow-sm">{initial}</span>
          )}
        </div>
      </div>

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
