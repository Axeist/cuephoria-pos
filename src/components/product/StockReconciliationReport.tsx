import React, { useState, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Download, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrencyDisplay } from '@/components/ui/currency';
import { getStockLogs } from '@/utils/stockLogger';

interface ReconciliationData {
  productId: string;
  productName: string;
  category: string;
  openingStock: number;
  openingValue: number;
  additions: number;
  additionsValue: number;
  salesQuantity: number;
  salesValue: number;
  expectedClosingStock: number;
  actualClosingStock: number;
  variance: number;
  varianceValue: number;
  buyingPrice: number;
}

const StockReconciliationReport: React.FC = () => {
  const { products, transactions } = usePOS();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get stock logs for the selected date
  const getStockLogsForDate = (productId: string, date: Date) => {
    const allLogs = getStockLogs(productId);
    const startOfSelectedDay = startOfDay(date);
    const endOfSelectedDay = endOfDay(date);

    return allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startOfSelectedDay && logDate <= endOfSelectedDay;
    });
  };

  // Get opening stock for a product on selected date
  const getOpeningStock = (productId: string, date: Date): number => {
    const allLogs = getStockLogs(productId);
    const startOfSelectedDay = startOfDay(date);
    
    // Find the last log before the selected date
    const logsBeforeDate = allLogs.filter(log => 
      new Date(log.timestamp) < startOfSelectedDay
    );

    if (logsBeforeDate.length === 0) {
      // No logs before this date, check if there's an initial log on this date
      const initialLog = allLogs.find(log => 
        log.changeType === 'initial' && 
        new Date(log.timestamp) >= startOfSelectedDay
      );
      return initialLog ? 0 : 0;
    }

    // Sort by timestamp descending and get the most recent
    const sortedLogs = logsBeforeDate.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedLogs[0].newStock;
  };

  // Calculate reconciliation data
  const reconciliationData = useMemo((): ReconciliationData[] => {
    const foodAndDrinks = products.filter(p => {
      const category = p.category.toLowerCase();
      return (category === 'food' || category === 'drinks') && p.buyingPrice;
    });

    return foodAndDrinks.map(product => {
      // Get opening stock
      const openingStock = getOpeningStock(product.id, selectedDate);
      const openingValue = openingStock * (product.buyingPrice || 0);

      // Get stock additions for the day
      const logsForDate = getStockLogsForDate(product.id, selectedDate);
      const additions = logsForDate
        .filter(log => log.changeType === 'addition' || log.changeType === 'initial')
        .reduce((sum, log) => sum + log.quantityChanged, 0);
      const additionsValue = additions * (product.buyingPrice || 0);

      // Get sales for the day
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);
      
      const daySales = transactions.filter(t => {
        const transactionDate = new Date(t.timestamp);
        return transactionDate >= startOfSelectedDay && 
               transactionDate <= endOfSelectedDay &&
               t.status === 'completed';
      });

      const salesQuantity = daySales.reduce((sum, transaction) => {
        const productInTransaction = transaction.items.find(item => item.id === product.id);
        return sum + (productInTransaction?.quantity || 0);
      }, 0);

      const salesValue = salesQuantity * (product.buyingPrice || 0);

      // Calculate expected vs actual closing stock
      const expectedClosingStock = openingStock + additions - salesQuantity;
      const actualClosingStock = product.stock;
      const variance = actualClosingStock - expectedClosingStock;
      const varianceValue = variance * (product.buyingPrice || 0);

      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        openingStock,
        openingValue,
        additions,
        additionsValue,
        salesQuantity,
        salesValue,
        expectedClosingStock,
        actualClosingStock,
        variance,
        varianceValue,
        buyingPrice: product.buyingPrice || 0,
      };
    });
  }, [products, transactions, selectedDate]);

  // Calculate totals
  const totals = useMemo(() => {
    return reconciliationData.reduce(
      (acc, item) => ({
        openingValue: acc.openingValue + item.openingValue,
        additionsValue: acc.additionsValue + item.additionsValue,
        salesValue: acc.salesValue + item.salesValue,
        expectedClosingValue: acc.expectedClosingValue + (item.expectedClosingStock * item.buyingPrice),
        actualClosingValue: acc.actualClosingValue + (item.actualClosingStock * item.buyingPrice),
        varianceValue: acc.varianceValue + item.varianceValue,
      }),
      {
        openingValue: 0,
        additionsValue: 0,
        salesValue: 0,
        expectedClosingValue: 0,
        actualClosingValue: 0,
        varianceValue: 0,
      }
    );
  }, [reconciliationData]);

  // Get items with variance
  const itemsWithVariance = reconciliationData.filter(item => item.variance !== 0);
  const missingItems = reconciliationData.filter(item => item.variance < 0);
  const excessItems = reconciliationData.filter(item => item.variance > 0);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Product',
      'Category',
      'Opening Stock',
      'Opening Value',
      'Additions',
      'Additions Value',
      'Sales Qty',
      'Sales Value',
      'Expected Closing',
      'Actual Closing',
      'Variance Qty',
      'Variance Value',
    ];

    const rows = reconciliationData.map(item => [
      item.productName,
      item.category,
      item.openingStock,
      item.openingValue.toFixed(2),
      item.additions,
      item.additionsValue.toFixed(2),
      item.salesQuantity,
      item.salesValue.toFixed(2),
      item.expectedClosingStock,
      item.actualClosingStock,
      item.variance,
      item.varianceValue.toFixed(2),
    ]);

    const csvContent = [
      ['Stock Reconciliation Report'],
      [`Date: ${format(selectedDate, 'dd/MM/yyyy')}`],
      [],
      headers,
      ...rows,
      [],
      ['Summary'],
      ['Opening Stock Value', totals.openingValue.toFixed(2)],
      ['Additions Value', totals.additionsValue.toFixed(2)],
      ['Sales Value', totals.salesValue.toFixed(2)],
      ['Expected Closing Value', totals.expectedClosingValue.toFixed(2)],
      ['Actual Closing Value', totals.actualClosingValue.toFixed(2)],
      ['Variance Value', totals.varianceValue.toFixed(2)],
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-reconciliation-${format(selectedDate, 'dd-MM-yyyy')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stock Reconciliation Report</h2>
          <p className="text-sm text-muted-foreground">
            Track opening stock, sales, and closing stock to identify missing inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Opening Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totals.openingValue} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totals.salesValue} />
            </div>
          </CardContent>
        </Card>

        <Card className={totals.varianceValue !== 0 ? 'border-red-500' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Stock Variance
              {totals.varianceValue !== 0 && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              totals.varianceValue < 0 && 'text-red-500',
              totals.varianceValue > 0 && 'text-green-500'
            )}>
              <CurrencyDisplay amount={Math.abs(totals.varianceValue)} />
              {totals.varianceValue < 0 && ' (Missing)'}
              {totals.varianceValue > 0 && ' (Excess)'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Summary */}
      {itemsWithVariance.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Variance Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Items with Variance</p>
                <p className="text-2xl font-bold">{itemsWithVariance.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Missing Stock
                </p>
                <p className="text-2xl font-bold text-red-500">{missingItems.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Excess Stock
                </p>
                <p className="text-2xl font-bold text-green-500">{excessItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Additions</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Value Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationData.map((item) => (
                  <TableRow 
                    key={item.productId}
                    className={item.variance !== 0 ? 'bg-yellow-50 dark:bg-yellow-950/10' : ''}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{item.openingStock}</div>
                      <div className="text-xs text-muted-foreground">
                        ₹{item.openingValue.toFixed(0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{item.additions > 0 ? `+${item.additions}` : item.additions}</div>
                      <div className="text-xs text-muted-foreground">
                        ₹{item.additionsValue.toFixed(0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{item.salesQuantity}</div>
                      <div className="text-xs text-muted-foreground">
                        ₹{item.salesValue.toFixed(0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.expectedClosingStock}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.actualClosingStock}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.variance !== 0 ? (
                        <Badge variant={item.variance < 0 ? 'destructive' : 'default'}>
                          {item.variance > 0 ? '+' : ''}{item.variance}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'font-medium',
                        item.varianceValue < 0 && 'text-red-500',
                        item.varianceValue > 0 && 'text-green-500'
                      )}>
                        {item.varianceValue < 0 ? '-' : '+'}
                        ₹{Math.abs(item.varianceValue).toFixed(0)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reconciliation Formula</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Expected Closing Stock</strong> = Opening Stock + Additions - Sales</p>
          <p><strong>Variance</strong> = Actual Closing Stock - Expected Closing Stock</p>
          <p className="text-xs">• Negative variance indicates missing stock (theft/wastage/unrecorded sales)</p>
          <p className="text-xs">• Positive variance indicates excess stock (unrecorded purchases/returns)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReconciliationReport;
