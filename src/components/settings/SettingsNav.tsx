import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type SettingsTabId =
  | "general"
  | "branding"
  | "subscription"
  | "branches"
  | "booking"
  | "payments"
  | "team"
  | "tournaments"
  | "leaderboard";

export type SettingsNavItem = {
  id: SettingsTabId;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** @deprecated use permissionKey */
  adminOnly?: boolean;
  permissionKey?: string;
};

export type SettingsNavGroup = {
  label: string;
  items: SettingsNavItem[];
};

type Props = {
  groups: SettingsNavGroup[];
  activeTab: SettingsTabId;
  onSelect: (id: SettingsTabId) => void;
  canAccess: (item: SettingsNavItem) => boolean;
};

export default function SettingsNav({ groups, activeTab, onSelect, canAccess }: Props) {
  return (
    <nav className="space-y-6" aria-label="Settings sections">
      {groups.map((group) => {
        const visible = group.items.filter((item) => canAccess(item));
        if (visible.length === 0) return null;
        return (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {visible.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        active
                          ? "bg-primary/10 text-foreground border border-primary/20 shadow-sm"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          active ? "text-primary" : "opacity-70",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-none">{item.label}</span>
                        {item.description && (
                          <span className="block text-xs text-muted-foreground mt-1 leading-snug">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
