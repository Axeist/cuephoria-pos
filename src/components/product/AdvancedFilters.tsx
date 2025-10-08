// src/components/product/AdvancedFilters.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { FilterOptions } from '@/types/stockLog.types';
import { Badge } from '@/components/ui/badge';

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

  const handleStockStatusChange = (value: string) => {
    const newFilters = {
      ...localFilters,
      stockStatus: value as FilterOptions['stockStatus'],
    };
    setLocalFilters(newFilters);
  };

  const handlePriceRangeChange = (field: 'min' | 'max', value: string) => {
    const newFilters = {
      ...localFilters,
      priceRange: {
        ...localFilters.priceRange,
        min: localFilters.priceRange?.min || 0,
        max: localFilters.priceRange?.max || 99999,
        [field]: Number(value) || 0,
      },
    };
    setLocalFilters(newFilters);
  };

  const handleProfitMarginChange = (field: 'min' | 'max', value: string) => {
    const newFilters = {
      ...localFilters,
      profitMargin: {
        ...localFilters.profitMargin,
        min: localFilters.profitMargin?.min || 0,
        max: localFilters.profitMargin?.max || 100,
        [field]: Number(value) || 0,
      },
    };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = { stockStatus: 'all' };
    setLocalFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.stockStatus !== 'all') count++;
    if (localFilters.priceRange) count++;
    if (localFilters.profitMargin) count++;
    if (localFilters.dateRange) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Advanced Filters</h4>
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

          <div className="space-y-2">
            <Label htmlFor="stockStatus">Stock Status</Label>
            <Select
              value={localFilters.stockStatus}
              onValueChange={handleStockStatusChange}
            >
              <SelectTrigger id="stockStatus">
                <SelectValue placeholder="Select stock status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock (≤10)</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Price Range (₹)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.priceRange?.min || ''}
                onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.priceRange?.max || ''}
                onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profit Margin (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.profitMargin?.min || ''}
                onChange={(e) => handleProfitMarginChange('min', e.target.value)}
                className="w-full"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.profitMargin?.max || ''}
                onChange={(e) => handleProfitMarginChange('max', e.target.value)}
                className="w-full"
              />
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
