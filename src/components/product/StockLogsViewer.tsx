import React, { useState, useEffect, useMemo } from 'react';
import { StockLog, StockLogFilterOptions } from '@/types/stockLog.types';
import { getStockLogs } from '@/utils/stockLogger';
import { getStockLogTypeBadge, getStockLogTypeIcon, STOCK_LOG_TYPE_LABELS } from '@/utils/stockLogDisplay';
import { format, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Search, Trash2, AlertTriangle, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const CHANGE_TYPE_OPTIONS: StockLog['changeType'][] = [
  'restock',
  'adjustment',
  'addition',
  'deduction',
  'initial',
];

const DEFAULT_FILTERS: StockLogFilterOptions = {};

function applyStockLogFilters(logs: StockLog[], filters: StockLogFilterOptions): StockLog[] {
  return logs.filter((log) => {
    if (filters.changeTypes?.length && !filters.changeTypes.includes(log.changeType)) {
      return false;
    }

    const logDate = new Date(log.timestamp);
    if (filters.dateFrom) {
      const from = startOfDay(parseISO(filters.dateFrom));
      if (isValid(from) && logDate < from) return false;
    }
    if (filters.dateTo) {
      const to = endOfDay(parseISO(filters.dateTo));
      if (isValid(to) && logDate > to) return false;
    }

    const search = filters.searchTerm?.trim().toLowerCase();
    if (search) {
      const haystack = `${log.productName} ${log.notes ?? ''} ${log.reason ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    const userSearch = filters.performedBy?.trim().toLowerCase();
    if (userSearch && !log.performedBy.toLowerCase().includes(userSearch)) {
      return false;
    }

    return true;
  });
}

function countActiveFilters(filters: StockLogFilterOptions): number {
  let count = 0;
  if (filters.changeTypes?.length) count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  if (filters.performedBy?.trim()) count++;
  return count;
}

const StockLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [filters, setFilters] = useState<StockLogFilterOptions>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<StockLogFilterOptions>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<StockLog | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAction, setDeleteAction] = useState<'single' | 'all' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (filtersOpen) {
      setDraftFilters(filters);
    }
  }, [filtersOpen, filters]);

  const loadLogs = () => {
    const allLogs = getStockLogs();
    const sortedLogs = allLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(sortedLogs);
  };

  const filteredLogs = useMemo(() => applyStockLogFilters(logs, filters), [logs, filters]);
  const activeFilterCount = countActiveFilters(filters);

  const handleDeleteClick = (log: StockLog) => {
    setSelectedLog(log);
    setDeleteAction('single');
    setShowDeleteDialog(true);
  };

  const handleClearAllClick = () => {
    setDeleteAction('all');
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteDialog(false);
    if (deleteAction === 'single' && selectedLog) {
      deleteSingleLog(selectedLog.id);
    } else if (deleteAction === 'all') {
      clearAllLogs();
    }
    setSelectedLog(null);
    setDeleteAction(null);
  };

  const deleteSingleLog = (logId: string) => {
    try {
      const storedLogs = localStorage.getItem('stockLogs');
      if (storedLogs) {
        const allLogs: StockLog[] = JSON.parse(storedLogs);
        const updatedLogs = allLogs.filter((log) => log.id !== logId);
        localStorage.setItem('stockLogs', JSON.stringify(updatedLogs));
        toast({
          title: 'Log Deleted',
          description: 'Stock log entry has been removed successfully.',
        });
        loadLogs();
      }
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete log entry.',
        variant: 'destructive',
      });
    }
  };

  const clearAllLogs = () => {
    try {
      localStorage.removeItem('stockLogs');
      localStorage.removeItem('stockSnapshotInitialized');
      localStorage.removeItem('lastOpeningSnapshotDate');
      localStorage.removeItem('lastClosingSnapshotDate');
      toast({
        title: 'All Logs Cleared',
        description: 'All stock logs and snapshot data have been removed.',
      });
      loadLogs();
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear logs.',
        variant: 'destructive',
      });
    }
  };

  const toggleDraftChangeType = (type: StockLog['changeType']) => {
    const current = draftFilters.changeTypes ?? [];
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setDraftFilters({
      ...draftFilters,
      changeTypes: next.length ? next : undefined,
    });
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters });
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product or notes..."
              value={filters.searchTerm ?? ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value || undefined }))
              }
              className="pl-10"
            />
          </div>
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative whitespace-nowrap">
                <Filter className="h-4 w-4 mr-2" />
                Filters
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
                  <h4 className="font-semibold">Filter Logs</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8">
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Change type</Label>
                  <div className="space-y-2">
                    {CHANGE_TYPE_OPTIONS.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`log-type-${type}`}
                          checked={draftFilters.changeTypes?.includes(type) ?? false}
                          onCheckedChange={() => toggleDraftChangeType(type)}
                        />
                        <Label htmlFor={`log-type-${type}`} className="text-sm font-normal cursor-pointer">
                          {STOCK_LOG_TYPE_LABELS[type]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="log-date-from">From</Label>
                    <Input
                      id="log-date-from"
                      type="date"
                      value={draftFilters.dateFrom ?? ''}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="log-date-to">To</Label>
                    <Input
                      id="log-date-to"
                      type="date"
                      value={draftFilters.dateTo ?? ''}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-user">Performed by</Label>
                  <Input
                    id="log-user"
                    placeholder="Filter by user name..."
                    value={draftFilters.performedBy ?? ''}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        performedBy: e.target.value || undefined,
                      }))
                    }
                  />
                </div>

                <Button onClick={applyFilters} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {logs.length > 0 && (
            <Button variant="destructive" onClick={handleClearAllClick} className="whitespace-nowrap">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.changeTypes?.map((type) => (
              <Badge key={type} variant="secondary">
                {STOCK_LOG_TYPE_LABELS[type]}
              </Badge>
            ))}
            {filters.dateFrom && (
              <Badge variant="secondary">From {filters.dateFrom}</Badge>
            )}
            {filters.dateTo && (
              <Badge variant="secondary">To {filters.dateTo}</Badge>
            )}
            {filters.performedBy && (
              <Badge variant="secondary">User: {filters.performedBy}</Badge>
            )}
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} log entries
      </div>

      <ScrollArea className="h-[600px] w-full rounded-md border">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No stock change logs found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {filters.searchTerm || activeFilterCount > 0
                ? 'Try adjusting your search or filters'
                : 'Stock changes will appear here'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Previous</TableHead>
                <TableHead className="text-center">Change</TableHead>
                <TableHead className="text-right">New</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {format(new Date(log.timestamp), 'dd/MM/yy HH:mm')}
                  </TableCell>
                  <TableCell className="font-medium">{log.productName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStockLogTypeIcon(log.changeType)}
                      {getStockLogTypeBadge(log.changeType)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{log.previousStock}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        log.quantityChanged >= 0
                          ? 'text-green-600 font-semibold'
                          : 'text-red-600 font-semibold'
                      }
                    >
                      {log.quantityChanged >= 0 ? '+' : ''}
                      {log.quantityChanged}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{log.newStock}</TableCell>
                  <TableCell className="text-sm">{log.performedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.notes || log.reason || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(log)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAction === 'single'
                ? `Are you sure you want to delete this stock log entry for "${selectedLog?.productName}"? This action cannot be undone.`
                : 'Are you sure you want to delete ALL stock logs? This will permanently remove all stock change history and cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedLog(null);
                setDeleteAction(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StockLogsViewer;
