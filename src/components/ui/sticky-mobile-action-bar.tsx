import * as React from "react";

import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";

/**
 * <StickyMobileActionBar>
 *
 * Fixed-to-bottom action strip for mobile-only views. Renders nothing on
 * desktop. Respects safe-area-inset-bottom so the primary CTA never sits
 * under the home indicator.
 *
 * Usage:
 *
 *   <StickyMobileActionBar>
 *     <Button onClick={onCheckout} className="w-full">Checkout</Button>
 *   </StickyMobileActionBar>
 *
 * Pages should add bottom padding (typically `pb-24` mobile) to the scroll
 * container so the bar doesn't cover the last row.
 */

interface StickyMobileActionBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If false the bar stays hidden — handy for conditional CTAs (e.g. cart
   * empty → hide).
   */
  visible?: boolean;
  /**
   * Visual treatment. `solid` matches the page background more strongly;
   * `glass` is the default lightweight variant.
   */
  variant?: "glass" | "solid";
  /**
   * Force render on desktop too. Off by default.
   */
  alwaysShow?: boolean;
}

export const StickyMobileActionBar = React.forwardRef<
  HTMLDivElement,
  StickyMobileActionBarProps
>(
  (
    {
      className,
      visible = true,
      variant = "glass",
      alwaysShow = false,
      style,
      ...props
    },
    ref,
  ) => {
    const { isMobile } = useViewMode();
    if (!visible) return null;
    if (!isMobile && !alwaysShow) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 px-3 pt-3",
          // Tailwind can't easily express safe-area math so we do it inline.
          variant === "glass"
            ? "border-t border-white/10 bg-[color:hsl(var(--background))]/85 backdrop-blur-xl shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.6)]"
            : "border-t border-white/10 bg-[color:hsl(var(--card))] shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.6)]",
          // Allow desktop hide override when alwaysShow=false.
          !alwaysShow ? "md:hidden" : "",
          className,
        )}
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          ...style,
        }}
        {...props}
      />
    );
  },
);
StickyMobileActionBar.displayName = "StickyMobileActionBar";

export default StickyMobileActionBar;
