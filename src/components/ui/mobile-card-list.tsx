import * as React from "react";

import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";

/**
 * <MobileCardList>
 *
 * Renders a card-style stacked list on mobile and falls back to a
 * caller-supplied desktop node (typically a `<Table>`) on larger screens.
 *
 * This keeps page logic linear:
 *
 *   <MobileCardList
 *     items={bills}
 *     keyExtractor={(b) => b.id}
 *     renderCard={(b) => <BillMobileCard bill={b} />}
 *     desktopFallback={<BillsTable bills={bills} />}
 *   />
 */

interface MobileCardListProps<T> {
  items: ReadonlyArray<T>;
  keyExtractor: (item: T, index: number) => string;
  renderCard: (item: T, index: number) => React.ReactNode;
  /**
   * What to render on desktop instead of cards. Almost always a `<Table>`
   * that already worked fine pre-mobile-refactor.
   */
  desktopFallback: React.ReactNode;
  /** Optional empty state for the mobile branch. */
  emptyState?: React.ReactNode;
  /** Optional class on the mobile list container. */
  className?: string;
  /** Spacing between cards on mobile. Defaults to `gap-3`. */
  gapClassName?: string;
  /**
   * Force the mobile branch regardless of viewport — useful for storybook /
   * preview tools, or for nested lists where we always want cards.
   */
  forceMobile?: boolean;
}

export function MobileCardList<T>({
  items,
  keyExtractor,
  renderCard,
  desktopFallback,
  emptyState,
  className,
  gapClassName = "gap-3",
  forceMobile,
}: MobileCardListProps<T>) {
  const { isMobile } = useViewMode();

  if (!isMobile && !forceMobile) {
    return <>{desktopFallback}</>;
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("flex flex-col", gapClassName, className)}>
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor(item, index)}>
          {renderCard(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Reusable card chrome — pages can compose this for consistent visuals.
 * Inherits the app's glass-card system without forcing it.
 */
export const MobileListCard: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div
    className={cn(
      "rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md",
      "p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]",
      className,
    )}
    {...props}
  />
);

export const MobileListCardRow: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-3 text-sm",
      className,
    )}
    {...props}
  />
);

export const MobileListCardLabel: React.FC<
  React.HTMLAttributes<HTMLSpanElement>
> = ({ className, ...props }) => (
  <span
    className={cn(
      "text-[11px] uppercase tracking-[0.14em] text-white/45",
      className,
    )}
    {...props}
  />
);

export const MobileListCardValue: React.FC<
  React.HTMLAttributes<HTMLSpanElement>
> = ({ className, ...props }) => (
  <span
    className={cn("text-sm font-medium text-white/90 truncate", className)}
    {...props}
  />
);

export default MobileCardList;
