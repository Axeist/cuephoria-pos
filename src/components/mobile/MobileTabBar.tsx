import * as React from "react";
import { cn } from "@/lib/utils";

export type MobileTabItem = {
  id: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export type MobileTabBarProps = {
  tabs: MobileTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  /** Extra classes applied to each tab button */
  tabClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
};

/**
 * Horizontally scrollable pill tab bar for mobile — prevents cramped grids.
 */
export function MobileTabBar({
  tabs,
  activeId,
  onChange,
  className,
  tabClassName,
  activeClassName = "btn-gradient text-white",
  inactiveClassName = "text-white/60 hover:text-white hover:bg-white/5",
}: MobileTabBarProps) {
  return (
    <div
      className={cn(
        "tabs-list mobile-tab-bar flex w-full max-w-full gap-1 rounded-xl glass-card p-1 h-10",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "whitespace-nowrap flex-shrink-0 rounded-lg px-2.5 sm:px-4 text-[10px] sm:text-sm font-medium transition-all duration-200 touch-manipulation min-h-[32px]",
              active ? activeClassName : inactiveClassName,
              tab.disabled && "opacity-40 pointer-events-none",
              tabClassName,
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
