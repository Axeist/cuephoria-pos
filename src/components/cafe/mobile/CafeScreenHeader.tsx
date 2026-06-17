import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewMode } from "@/context/ViewModeContext";
import { useCafeMobileNav } from "./CafeMobileNavContext";
import { cn } from "@/lib/utils";

export function CafeScreenHeader() {
  const { isMobile } = useViewMode();
  const { openSheet } = useCafeMobileNav();

  if (!isMobile) return null;

  return (
    <header
      className={cn(
        "app-mobile-header sticky top-0 z-40 w-full shrink-0 lg:hidden",
        "border-b border-white/[0.08]",
        "bg-[linear-gradient(180deg,rgba(9,9,11,0.97)_0%,rgba(9,9,11,0.9)_100%)]",
        "backdrop-blur-xl shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]",
      )}
      style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
    >
      <div className="flex h-12 items-center justify-between px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-zinc-300 hover:bg-white/10 touch-manipulation"
          onClick={openSheet}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-display text-sm font-semibold text-white">
          Choco Loca
        </span>
        <div className="w-9" aria-hidden />
      </div>
    </header>
  );
}
