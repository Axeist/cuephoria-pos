import React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useViewMode } from "@/context/ViewModeContext";
import { useCafeMobileNav } from "./CafeMobileNavContext";

export function CafeScreenHeader() {
  const { isMobile } = useViewMode();
  const { openSheet } = useCafeMobileNav();

  if (!isMobile) return null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.08] bg-zinc-950/90 px-4 backdrop-blur-xl lg:hidden"
      style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-zinc-300 hover:bg-white/10 touch-manipulation"
        onClick={openSheet}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-display text-base font-semibold text-white">
        Choco Loca
      </span>
      <div className="w-10" aria-hidden />
    </header>
  );
}
