import * as React from "react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";

export type MobileSectionProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
};

/**
 * Full-width glass card section — standard content block on mobile staff pages.
 */
export function MobileSection({
  title,
  description,
  action,
  noPadding = false,
  className,
  children,
  ...props
}: MobileSectionProps) {
  const { isMobile } = useViewMode();

  return (
    <section
      className={cn(
        "mobile-section glass-card w-full min-w-0 max-w-full overflow-x-hidden",
        isMobile ? "rounded-2xl" : "rounded-2xl",
        !noPadding && (isMobile ? "p-3" : "p-4 sm:p-5"),
        className,
      )}
      {...props}
    >
      {(title || description || action) && (
        <div
          className={cn(
            "flex flex-col gap-2",
            action && "sm:flex-row sm:items-start sm:justify-between",
            children && "mb-3",
          )}
        >
          <div className="min-w-0 space-y-0.5">
            {title ? (
              <h2 className="text-base sm:text-lg font-bold text-white font-heading tracking-tight">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
