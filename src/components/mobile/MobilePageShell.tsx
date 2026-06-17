import * as React from "react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";

/**
 * Standard page wrapper for staff app screens — full width on mobile,
 * safe overflow, consistent padding. Desktop padding unchanged.
 *
 * Staff mobile layout must use `useViewMode().isMobile`, not `useIsMobile()`.
 */
export function MobilePageShell({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isMobile } = useViewMode();

  return (
    <div
      className={cn(
        "mobile-page-shell flex-1 w-full min-w-0 max-w-full box-border",
        isMobile && "overflow-x-hidden",
        isMobile ? "space-y-3 p-3" : "space-y-4 p-4 sm:p-6 md:p-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
