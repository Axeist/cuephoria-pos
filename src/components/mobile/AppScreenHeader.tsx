import React from "react";
import { Sparkles } from "lucide-react";
import { GlobalNotificationBell } from "@/components/GlobalNotificationBell";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { useTenantBrandingOptional } from "@/branding/BrandingProvider";
import { useViewMode } from "@/context/ViewModeContext";
import { useMobileNav } from "./MobileNavContext";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

/**
 * Compact sticky app header for mobile — brand, branch switcher, notifications.
 */
export function AppScreenHeader() {
  const { isMobile } = useViewMode();
  const { openSheet } = useMobileNav();
  const branding = useTenantBrandingOptional();
  const override = branding?.override ?? {};
  const brandName =
    override.display_name || branding?.brand?.name || "Cuephoria";

  if (!isMobile) return null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 md:hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,6,22,0.95) 0%, rgba(10,6,22,0.88) 100%)",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        paddingTop: "max(0px, env(safe-area-inset-top))",
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 min-h-[52px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-white h-9 w-9 shrink-0 hover:bg-white/10 touch-manipulation"
            onClick={openSheet}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div
            className="h-8 w-8 rounded-lg grid place-items-center shrink-0 shadow-[0_6px_18px_-6px_var(--brand-primary-hex)]"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary-hex), var(--brand-accent-hex))",
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white truncate tracking-tight">
            {brandName}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <GlobalNotificationBell />
        </div>
      </div>
      <div className="px-3 pb-2 flex items-center gap-2 [&:empty]:hidden">
        <LocationSwitcher />
      </div>
    </header>
  );
}
