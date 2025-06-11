
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface DateFilterWidgetProps {
  dateRange: { start: Date; end: Date } | null;
  onDateRangeChange: (dateRange: { start: Date; end: Date } | null) => void;
}

const DateFilterWidget: React.FC<DateFilterWidgetProps> = ({ 
  dateRange, 
  onDateRangeChange 
}) => {
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(dateRange?.start);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(dateRange?.end);

  const handleApplyFilter = () => {
    if (tempStartDate && tempEndDate) {
      onDateRangeChange({ start: tempStartDate, end: tempEndDate });
    }
  };

  const handleClearFilter = () => {
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    onDateRangeChange(null);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Date Filter</CardTitle>
        {dateRange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilter}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {tempStartDate ? format(tempStartDate, 'MMM dd, yyyy') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={tempStartDate}
                onSelect={setTempStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {tempEndDate ? format(tempEndDate, 'MMM dd, yyyy') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={tempEndDate}
                onSelect={setTempEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleApplyFilter}
            disabled={!tempStartDate || !tempEndDate}
            size="sm"
          >
            Apply Filter
          </Button>
        </div>

        {dateRange && (
          <div className="mt-2 text-xs text-muted-foreground">
            Showing data from {format(dateRange.start, 'MMM dd, yyyy')} to {format(dateRange.end, 'MMM dd, yyyy')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DateFilterWidget;
