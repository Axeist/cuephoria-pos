import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileListRowProps = React.HTMLAttributes<HTMLDivElement> & {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
};

/**
 * Tappable list row (min 48px) for mobile settings, bookings, customers, etc.
 */
export function MobileListRow({
  leading,
  title,
  subtitle,
  trailing,
  showChevron = false,
  onPress,
  className,
  children,
  ...props
}: MobileListRowProps) {
  const interactive = Boolean(onPress);

  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white truncate">{title}</div>
        {subtitle ? (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {subtitle}
          </div>
        ) : null}
        {children}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {showChevron && !trailing ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
      ) : null}
    </>
  );

  const rowClass = cn(
    "mobile-list-row flex items-center gap-3 min-h-[48px] w-full min-w-0 rounded-xl px-3 py-2.5",
    interactive &&
      "touch-manipulation active:scale-[0.99] transition-transform cursor-pointer hover:bg-white/[0.04]",
    className,
  );

  if (interactive) {
    return (
      <button type="button" className={rowClass} onClick={onPress} {...(props as object)}>
        {content}
      </button>
    );
  }

  return (
    <div className={rowClass} {...props}>
      {content}
    </div>
  );
}
