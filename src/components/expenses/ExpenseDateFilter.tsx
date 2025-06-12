import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ExpenseDateFilterProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onExport?: () => void;
}

const ExpenseDateFilter: React.FC<ExpenseDateFilterProps> = ({ 
  onDateRangeChange,
  onExport 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [showCustomRange, setShowCustomRange] = useState(false);

  const getPeriodDates = (period: string) => {
    const now = new Date();
    
    switch (period) {
      case 'this-month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: 'This month'
        };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
          label: 'Last month'
        };
      case 'last-3-months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
          label: 'Last 3 months'
        };
      case 'this-year':
        return {
          start: startOfYear(now),
          end: endOfYear(now),
          label: 'This year'
        };
      case 'last-year':
        const lastYear = subYears(now, 1);
        return {
          start: startOfYear(lastYear),
          end: endOfYear(lastYear),
          label: 'Last year'
        };
      case 'custom':
        return {
          start: customStartDate || startOfMonth(now),
          end: customEndDate || endOfMonth(now),
          label: 'Custom range'
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: 'This month'
        };
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setShowCustomRange(period === 'custom');
    
    const { start, end } = getPeriodDates(period);
    onDateRangeChange(start, end);
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onDateRangeChange(customStartDate, customEndDate);
    }
  };

  React.useEffect(() => {
    handleCustomDateChange();
  }, [customStartDate, customEndDate]);

  React.useEffect(() => {
    // Initialize with current month
    const { start, end } = getPeriodDates('this-month');
    onDateRangeChange(start, end);
  }, []);

  const getDateRangeLabel = () => {
    const { start, end } = getPeriodDates(selectedPeriod);
    
    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      return `${format(customStartDate, 'dd MMM yyyy')} - ${format(customEndDate, 'dd MMM yyyy')}`;
    }
    
    return `${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}`;
  };

  return (
    <div className="flex items-center justify-between w-full gap-3">
      <div className="flex items-center gap-3 flex-1">
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="this-month" className="text-white hover:bg-gray-700">
              This month
            </SelectItem>
            <SelectItem value="last-month" className="text-white hover:bg-gray-700">
              Last month
            </SelectItem>
            <SelectItem value="last-3-months" className="text-white hover:bg-gray-700">
              Last 3 months
            </SelectItem>
            <SelectItem value="this-year" className="text-white hover:bg-gray-700">
              This year
            </SelectItem>
            <SelectItem value="last-year" className="text-white hover:bg-gray-700">
              Last year
            </SelectItem>
            <SelectItem value="custom" className="text-white hover:bg-gray-700">
              Custom range
            </SelectItem>
          </SelectContent>
        </Select>

        {showCustomRange ? (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {customStartDate ? format(customStartDate, 'dd MMM yyyy') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                <CalendarComponent
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <span className="text-gray-400">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {customEndDate ? format(customEndDate, 'dd MMM yyyy') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                <CalendarComponent
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 flex-1 max-w-xs"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {getDateRangeLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
              <div className="grid grid-cols-2 gap-2 p-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">From</label>
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    className="p-3 pointer-events-auto"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">To</label>
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    className="p-3 pointer-events-auto"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {onExport && (
        <Button
          onClick={onExport}
          className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      )}
    </div>
  );
};

export default ExpenseDateFilter;
