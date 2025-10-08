import React, { useState, useEffect } from 'react';
import { StockLog } from '@/types/stockLog.types';
import { getStockLogs } from '@/utils/stockLogger';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, AlertCircle, Package, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const StockLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<StockLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = logs.filter(log => 
        log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logs);
    }
  }, [searchTerm, logs]);

  const loadLogs = () => {
    const allLogs = getStockLogs();
    const sortedLogs = allLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(sortedLogs);
    setFilteredLogs(sortedLogs);
  };

  const getChangeTypeIcon = (type: StockLog['changeType']) => {
    switch (type) {
      case 'addition':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'deduction':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'adjustment':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'initial':
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getChangeTypeBadge = (type: StockLog['changeType']) => {
    const variants: Record<StockLog['changeType'], 'default' | 'destructive' | 'secondary'> = {
      addition: 'default',
      deduction: 'destructive',
      adjustment: 'secondary',
      initial: 'secondary',
    };
    return (
      <Badge variant={variants[type]} className="capitalize">
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by product or user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
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
              {searchTerm ? 'Try adjusting your search' : 'Stock changes will appear here'}
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
                      {getChangeTypeIcon(log.changeType)}
                      {getChangeTypeBadge(log.changeType)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {log.previousStock}
                  </TableCell>
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
                  <TableCell className="text-right font-medium">
                    {log.newStock}
                  </TableCell>
                  <TableCell className="text-sm">{log.performedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {log.notes || log.reason || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
};

export default StockLogsViewer;
