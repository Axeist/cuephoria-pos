import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";

export type MobileStickyFooterProps = React.HTMLAttributes<HTMLDivElement> & {
  visible?: boolean;
};

/**
 * Pins primary actions above the bottom tab bar on staff mobile.
 * Coordinates with --app-bottom-nav-height and --mobile-sticky-footer-height.
 */
export function MobileStickyFooter({
  visible = true,
  className,
  children,
  style,
  ...props
}: MobileStickyFooterProps) {
  const { isMobile } = useViewMode();

  if (!isMobile || !visible) return null;

  return createPortal(
    <div
      className={cn(
        "mobile-sticky-footer fixed inset-x-0 z-40 border-t border-white/10",
        "bg-[linear-gradient(180deg,rgba(10,6,22,0.97)_0%,rgba(7,3,15,0.98)_100%)]",
        "backdrop-blur-xl px-3 pt-2.5 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.55)]",
        className,
      )}
      style={{
        bottom: "var(--app-bottom-nav-height, 56px)",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}
