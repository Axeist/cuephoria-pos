import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MobileTabItem } from "./MobileTabBar";

export type MobileTabSelectProps = {
  tabs: MobileTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  placeholder?: string;
};

/**
 * Full-width section picker for mobile — replaces horizontal tab scroll.
 */
export function MobileTabSelect({
  tabs,
  activeId,
  onChange,
  className,
  placeholder = "Select section",
}: MobileTabSelectProps) {
  const active = tabs.find((t) => t.id === activeId);

  return (
    <Select value={activeId} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "w-full h-11 rounded-xl border-white/10 bg-white/[0.04] text-sm font-medium",
          className,
        )}
      >
        <SelectValue placeholder={placeholder}>
          {active?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tabs.map((tab) => (
          <SelectItem
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
          >
            {tab.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
