import React, { useState } from "react";
import { ChevronDown, MapPin, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "@/context/LocationContext";

const BRANCH_CONFIG: Record<string, { color: string; bg: string; ring: string; icon: React.ReactNode }> = {
  main: {
    color: "text-purple-300",
    bg: "bg-purple-500/15 border-purple-400/40 hover:bg-purple-500/25",
    ring: "shadow-[0_0_14px_rgba(168,85,247,0.3)]",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  lite: {
    color: "text-cyan-300",
    bg: "bg-cyan-500/15 border-cyan-400/40 hover:bg-cyan-500/25",
    ring: "shadow-[0_0_14px_rgba(6,182,212,0.3)]",
    icon: <MapPin className="h-3.5 w-3.5" />,
  },
};

const fallbackConfig = {
  color: "text-gray-300",
  bg: "bg-white/10 border-white/20 hover:bg-white/15",
  ring: "",
  icon: <MapPin className="h-3.5 w-3.5" />,
};

/**
 * Branch selector shown in the top admin bar.
 * Shows a prominent colored badge for the active branch with a dropdown to switch.
 */
export function LocationSwitcher() {
  const { locations, activeLocationId, activeLocation, setActiveLocationId, loading, isSwitching } =
    useLocation();
  const [open, setOpen] = useState(false);

  if (loading || locations.length <= 1) return null;

  const cfg = activeLocation
    ? (BRANCH_CONFIG[activeLocation.slug] ?? fallbackConfig)
    : fallbackConfig;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold
            tracking-wide transition-all duration-200 select-none outline-none
            ${cfg.bg} ${cfg.color} ${cfg.ring}
            ${isSwitching ? "opacity-60 pointer-events-none" : ""}
          `}
          aria-label="Switch branch"
        >
          {/* Pulsing dot */}
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                activeLocation?.slug === "lite" ? "bg-cyan-400" : "bg-purple-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                activeLocation?.slug === "lite" ? "bg-cyan-400" : "bg-purple-400"
              }`}
            />
          </span>

          <span className="hidden sm:inline">
            {cfg.icon}
          </span>

          <span className="max-w-[120px] truncate">
            {activeLocation?.name ?? "Select branch"}
          </span>

          {activeLocation && (
            <span className={`font-mono text-[10px] opacity-60 hidden sm:inline`}>
              [{activeLocation.short_code}]
            </span>
          )}

          <ChevronDown
            className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-52 bg-cuephoria-darker border-white/10"
      >
        <div className="px-2 pt-1 pb-1.5 text-[10px] font-mono text-white/30 uppercase tracking-widest">
          Active Branch
        </div>
        {locations.map((loc) => {
          const locCfg = BRANCH_CONFIG[loc.slug] ?? fallbackConfig;
          const isActive = loc.id === activeLocationId;
          return (
            <DropdownMenuItem
              key={loc.id}
              onSelect={() => {
                if (!isActive) setActiveLocationId(loc.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 cursor-pointer rounded-md my-0.5 ${
                isActive ? "bg-white/8" : "hover:bg-white/5"
              }`}
            >
              <span
                className={`flex h-2 w-2 rounded-full flex-shrink-0 ${
                  loc.slug === "lite" ? "bg-cyan-400" : "bg-purple-400"
                } ${isActive ? "opacity-100" : "opacity-30"}`}
              />
              <span className={`font-medium ${isActive ? locCfg.color : "text-white/60"}`}>
                {loc.name}
              </span>
              <span className="ml-auto font-mono text-[10px] text-white/30">{loc.short_code}</span>
              {isActive && (
                <span className={`text-[10px] font-mono ${locCfg.color}`}>✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
