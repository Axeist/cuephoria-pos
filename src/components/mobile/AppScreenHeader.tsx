import React from "react";
import { Menu, Sparkles } from "lucide-react";
import { GlobalNotificationBell } from "@/components/GlobalNotificationBell";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { useTenantBrandingOptional } from "@/branding/BrandingProvider";
import { useViewMode } from "@/context/ViewModeContext";
import { useMobileNav } from "./MobileNavContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sticky app header for mobile — sits inside #app-main so content scrolls
 * naturally beneath it with no phantom gap from fixed + padding-top.
 */
export function AppScreenHeader() {
  const { isMobile } = useViewMode();
  const { openSheet } = useMobileNav();
  const branding = useTenantBrandingOptional();
  const override = branding?.override ?? {};
  const brandName =
    override.display_name || branding?.brand?.name || "Cuephoria";
  const brandLogo = override.logo_url;

  if (!isMobile) return null;

  return (
    <header
      className={cn(
        "app-mobile-header sticky top-0 z-40 w-full shrink-0 md:hidden",
        "border-b border-white/[0.08]",
        "bg-[linear-gradient(180deg,rgba(12,7,24,0.97)_0%,rgba(10,6,20,0.92)_100%)]",
        "backdrop-blur-xl backdrop-saturate-150",
        "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.55)]",
      )}
      style={{
        paddingTop: "max(0px, env(safe-area-inset-top))",
      }}
    >
      <div className="flex h-12 items-center gap-2 px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-white hover:bg-white/10 touch-manipulation"
          onClick={openSheet}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg shadow-[0_6px_18px_-6px_var(--brand-primary-hex)]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))",
            }}
          >
            {brandLogo ? (
              <img
                src={brandLogo}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Sparkles className="h-4 w-4 text-white" />
            )}
          </div>
          <span className="truncate text-sm font-bold tracking-tight text-white">
            {brandName}
          </span>
        </div>

        <LocationSwitcher variant="compact" className="min-w-0 max-w-[38%] shrink" />

        <div className="flex shrink-0 items-center">
          <GlobalNotificationBell />
        </div>
      </div>
    </header>
  );
}
