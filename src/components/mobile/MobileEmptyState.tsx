import * as React from "react";
import { cn } from "@/lib/utils";

export type MobileEmptyStateProps = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function MobileEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: MobileEmptyStateProps) {
  return (
    <div
      className={cn(
        "mobile-empty-state flex flex-col items-center justify-center text-center py-10 px-4",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] text-white/70">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4 w-full max-w-xs">{action}</div> : null}
    </div>
  );
}
