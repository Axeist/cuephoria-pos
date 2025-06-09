import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
interface ZeroStockFilterProps {
  showZeroStockOnly: boolean;
  onToggle: (checked: boolean) => void;
  zeroStockCount: number;
}
const ZeroStockFilter: React.FC<ZeroStockFilterProps> = ({
  showZeroStockOnly,
  onToggle,
  zeroStockCount
}) => {
  return <div className="flex items-center space-x-2 px-3 py-2 border border-red-200 dark:border-red-800 rounded-md bg-transparent">
      <Checkbox id="zero-stock-filter" checked={showZeroStockOnly} onCheckedChange={onToggle} />
      <Label htmlFor="zero-stock-filter" className="text-sm flex items-center gap-1 cursor-pointer">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        Show only zero stock items ({zeroStockCount})
      </Label>
    </div>;
};
export default ZeroStockFilter;