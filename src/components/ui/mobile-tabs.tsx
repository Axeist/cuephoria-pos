
import React from 'react';
import { cn } from '@/lib/utils';

interface MobileTabsProps {
  tabs: Array<{
    id: string;
    label: string;
    isActive?: boolean;
  }>;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const MobileTabs: React.FC<MobileTabsProps> = ({ tabs, onTabChange, className }) => {
  return (
    <div className={cn("w-full overflow-x-auto cuephoria-scrollbar-hide", className)}>
      <div className="flex gap-1 min-w-max px-1 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "cuephoria-filter-tag whitespace-nowrap text-sm px-3 py-2",
              tab.isActive && "data-[state=active]"
            )}
            data-state={tab.isActive ? "active" : "inactive"}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileTabs;
