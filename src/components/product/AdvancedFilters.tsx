import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { FilterOptions } from '@/types/stockLog.types';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onFilterChange,
  currentFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(currentFilters);
  const [isOpen, setIsOpen] = useState(false);

  // Stock status options
  const stockStatusOptions = [
    { value: 'in-stock', label: 'In Stock (≥2)' },
    { value: 'low-stock', label: 'Low Stock (1)' },
    { value: 'out-of-stock', label: 'Out of Stock (0)' },
  ];

  const handleStockStatusToggle = (value: string) => {
    const currentStatuses = localFilters.stockStatuses || [];
    const newStatuses = currentStatuses.includes(value)
      ? currentStatuses.filter(s => s !== value)
      : [...currentStatuses, value];
    
    setLocalFilters({
      ...localFilters,
      stockStatuses: newStatuses.length > 0 ? newStatuses : undefined,
    });
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {};
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.stockStatuses && localFilters.stockStatuses.length > 0) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();
  const selectedCount = localFilters.stockStatuses?.length || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Stock Filters
          {activeFilterCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {selectedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Stock Filters</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {/* Multi-Select Stock Status Filter */}
          <div className="space-y-3">
            <Label>Stock Status (select multiple)</Label>
            <div className="space-y-2">
              {stockStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.value}
                    checked={localFilters.stockStatuses?.includes(option.value) || false}
                    onCheckedChange={() => handleStockStatusToggle(option.value)}
                  />
                  <Label
                    htmlFor={option.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={applyFilters} className="w-full">
            Apply Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdvancedFilters;
