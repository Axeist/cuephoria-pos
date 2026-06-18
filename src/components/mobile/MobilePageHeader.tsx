import * as React from "react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";

export type MobilePageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Standard in-page header for staff mobile screens — large title with
 * actions stacked below on narrow viewports (not beside the title).
 */
export function MobilePageHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
}: MobilePageHeaderProps) {
  const { isMobile } = useViewMode();

  return (
    <header
      className={cn(
        "mobile-page-header w-full min-w-0 max-w-full",
        isMobile ? "space-y-2" : "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className={cn(
              "font-heading font-extrabold tracking-tight gradient-text-hero",
              isMobile
                ? "text-[length:var(--mobile-page-title,1.375rem)] leading-tight"
                : "text-2xl sm:text-3xl md:text-4xl",
            )}
          >
            {title}
          </h1>
          {badge}
        </div>
        {subtitle ? (
          <p className="text-sm text-muted-foreground leading-snug">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2",
            isMobile ? "w-full flex-wrap" : "ml-auto shrink-0 flex-nowrap justify-end",
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
