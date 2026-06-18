import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CafePageShellProps = {
  children: ReactNode;
  /** Small caps label above the title */
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Right-side actions (buttons) */
  action?: ReactNode;
  /** default: content max width; wide: POS / dense layouts; full: edge-to-edge (e.g. kitchen) */
  variant?: "default" | "wide" | "full";
  className?: string;
  /** Applied to the scrollable content column below the optional header */
  contentClassName?: string;
};

/**
 * Shared cafe layout: consistent padding, max width, and optional page chrome.
 */
export function CafePageShell({
  children,
  eyebrow,
  title,
  description,
  action,
  variant = "default",
  className,
  contentClassName,
}: CafePageShellProps) {
  const max =
    variant === "full"
      ? "max-w-none"
      : "max-w-none";

  const showHeader = Boolean(eyebrow || title || description || action);

  return (
    <div
      className={cn(
        "relative z-[1] flex min-h-0 flex-1 flex-col overflow-x-hidden",
        max,
        "mx-auto w-full",
        variant === "full" ? "px-0 py-0" : "px-4 py-4 sm:px-5 sm:py-5 lg:px-6",
        className
      )}
    >
      {showHeader && (
        <header className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="font-heading text-2xl font-bold tracking-tight text-transparent bg-gradient-to-r from-orange-100 via-amber-100 to-violet-200 bg-clip-text sm:text-3xl">
                {title}
              </h1>
            )}
            {description && <p className="max-w-2xl text-sm leading-relaxed text-zinc-500">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn("flex min-h-0 flex-1 flex-col gap-4", contentClassName)}>{children}</div>
    </div>
  );
}
