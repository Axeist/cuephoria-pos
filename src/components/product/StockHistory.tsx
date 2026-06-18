// src/components/product/StockHistory.tsx
import React, { useState, useEffect } from 'react';
import { StockLog } from '@/types/stockLog.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, TrendingUp, TrendingDown, AlertCircle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StockHistoryProps {
  productId: string;
  productName: string;
  trigger?: React.ReactNode;
}

const StockHistory: React.FC<StockHistoryProps> = ({
  productId,
  productName,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStockLogs();
    }
  }, [isOpen, productId]);

  const loadStockLogs = () => {
    setIsLoading(true);
    try {
      const storedLogs = localStorage.getItem('stockLogs');
      if (storedLogs) {
        const allLogs: StockLog[] = JSON.parse(storedLogs);
        const productLogs = allLogs
          .filter(log => log.productId === productId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(productLogs);
      }
    } catch (error) {
      console.error('Error loading stock logs:', error);
    } finally {
      setIsLoading(false);
    }
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
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Stock Change History</DialogTitle>
            <DialogDescription>
              Complete history of stock changes for <strong>{productName}</strong>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No stock change history available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Stock changes will be tracked here going forward
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-center">Change</TableHead>
                    <TableHead className="text-right">New Stock</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
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
                      <TableCell>{log.performedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.notes || log.reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StockHistory;
