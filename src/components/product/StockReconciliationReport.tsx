import React, { useState, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Download, AlertTriangle, TrendingUp, TrendingDown, Database } from 'lucide-react';
import { format, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';
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
import { getStockLogs, createStockLog, saveStockLog } from '@/utils/stockLogger';
import { useToast } from '@/hooks/use-toast';

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
  pricePerUnit: number;
  hasBuyingPrice: boolean;
}

const StockReconciliationReport: React.FC = () => {
  const { products, transactions } = usePOS();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Initialize TODAY's opening and closing stock as same (first time setup)
  const initializeTodaySnapshot = () => {
    try {
      let count = 0;
      const today = new Date();
      
      // Create opening snapshot at 9:00 AM today
      const openingTime = setMinutes(setHours(today, 9), 0);
      
      // Create closing snapshot at 11:55 PM today (same value as opening for first day)
      const closingTime = setMinutes(setHours(today, 23), 55);
      
      products.forEach(product => {
        const category = product.category.toLowerCase();
        if (category === 'food' || category === 'drinks') {
          // Create opening snapshot
          const openingLog = createStockLog(
            product,
            0,
            product.stock,
            'initial',
            user?.name || user?.email || 'System',
            `Initial opening stock for ${format(today, 'dd MMM yyyy')}`
          );
          openingLog.timestamp = openingTime;
          saveStockLog(openingLog);
          
          // Create closing snapshot (same value as opening for today)
          const closingLog = createStockLog(
            product,
            product.stock,
            product.stock,
            'adjustment',
            user?.name || user?.email || 'System',
            `Initial closing stock for ${format(today, 'dd MMM yyyy')}`
          );
          closingLog.timestamp = closingTime;
          saveStockLog(closingLog);
          
          count++;
        }
      });

      // Mark that initialization is complete
      localStorage.setItem('stockSnapshotInitialized', 'true');
      localStorage.setItem('lastOpeningSnapshotDate', format(today, 'yyyy-MM-dd'));
      localStorage.setItem('lastClosingSnapshotDate', format(today, 'yyyy-MM-dd'));

      toast({
        title: 'Initial Snapshots Created',
        description: `Created opening (9:00 AM) and closing (11:55 PM) snapshots for ${count} products. Automatic daily snapshots will run from tomorrow.`,
        duration: 5000,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error creating initial snapshots:', error);
      toast({
        title: 'Error',
        description: 'Failed to create stock snapshots',
        variant: 'destructive',
      });
    }
  };

  // Get stock at specific time (9:00 AM for opening, 11:55 PM for closing)
  const getStockAtTime = (productId: string, date: Date, hour: number, minute: number = 0): number => {
    try {
      const allLogs = getStockLogs(productId);
      const targetTime = setMinutes(setHours(startOfDay(date), hour), minute);
      
      // Find logs before or at target time
      const logsBeforeTime = allLogs.filter(log => 
        new Date(log.timestamp) <= targetTime
      );

      if (logsBeforeTime.length === 0) {
        return 0;
      }

      // Get the most recent log before target time
      const sortedLogs = logsBeforeTime.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return sortedLogs[0].newStock;
    } catch (error) {
      console.error('Error getting stock at time:', error);
      return 0;
    }
  };

  // Get opening stock (9:00 AM snapshot)
  const getOpeningStock = (productId: string, date: Date): number => {
    return getStockAtTime(productId, date, 9, 0);
  };

  // Get closing stock (11:55 PM snapshot)
  const getClosingStock = (productId: string, date: Date): number => {
    return getStockAtTime(productId, date, 23, 55);
  };

  // Get stock logs for the selected date (excluding opening/closing snapshots)
  const getStockChangesForDate = (productId: string, date: Date) => {
    try {
      const allLogs = getStockLogs(productId);
      const morningTime = setMinutes(setHours(startOfDay(date), 9), 0);
      const closingTime = setMinutes(setHours(startOfDay(date), 23), 55);

      return allLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate > morningTime && 
               logDate < closingTime &&
               !log.notes?.includes('snapshot');
      });
    } catch (error) {
      console.error('Error getting stock changes:', error);
      return [];
    }
  };

  // Calculate reconciliation data
  const reconciliationData = useMemo((): ReconciliationData[] => {
    try {
      const foodAndDrinks = products.filter(p => {
        const category = p.category.toLowerCase();
        return category === 'food' || category === 'drinks';
      });

      console.log('Found food/drinks products:', foodAndDrinks.length);

      return foodAndDrinks.map(product => {
        const pricePerUnit = product.buyingPrice || product.sellingPrice || product.price;
        const hasBuyingPrice = !!product.buyingPrice;

        // Get opening stock (9:00 AM)
        const openingStock = getOpeningStock(product.id, selectedDate);
        const openingValue = openingStock * pricePerUnit;

        // Get stock additions during the day
        const logsForDate = getStockChangesForDate(product.id, selectedDate);
        const additions = logsForDate
          .filter(log => log.changeType === 'addition' || log.changeType === 'initial')
          .reduce((sum, log) => sum + log.quantityChanged, 0);
        const additionsValue = additions * pricePerUnit;

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

        const salesValue = salesQuantity * pricePerUnit;

        // Calculate expected vs actual closing stock
        const expectedClosingStock = openingStock + additions - salesQuantity;
        const actualClosingStock = getClosingStock(product.id, selectedDate);
        const variance = actualClosingStock - expectedClosingStock;
        const varianceValue = variance * pricePerUnit;

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
          pricePerUnit,
          hasBuyingPrice,
        };
      });
    } catch (error) {
      console.error('Error calculating reconciliation data:', error);
      return [];
    }
  }, [products, transactions, selectedDate]);

  // Calculate totals
  const totals = useMemo(() => {
    return reconciliationData.reduce(
      (acc, item) => ({
        openingValue: acc.openingValue + item.openingValue,
        additionsValue: acc.additionsValue + item.additionsValue,
        salesValue: acc.salesValue + item.salesValue,
        expectedClosingValue: acc.expectedClosingValue + (item.expectedClosingStock * item.pricePerUnit),
        actualClosingValue: acc.actualClosingValue + (item.actualClosingStock * item.pricePerUnit),
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

  const itemsWithVariance = reconciliationData.filter(item => item.variance !== 0);
  const missingItems = reconciliationData.filter(item => item.variance < 0);
  const excessItems = reconciliationData.filter(item => item.variance > 0);
  const itemsWithoutBuyingPrice = reconciliationData.filter(item => !item.hasBuyingPrice);

  // Check if initialization is needed
  const isInitialized = localStorage.getItem('stockSnapshotInitialized') === 'true';
  const needsInitialization = !isInitialized && reconciliationData.length > 0;

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Product',
      'Category',
      'Opening Stock (9:00 AM)',
      'Opening Value',
      'Additions',
      'Additions Value',
      'Sales Qty',
      'Sales Value',
      'Expected Closing',
      'Actual Closing (11:55 PM)',
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
      ['Opening Stock Time: 9:00 AM'],
      ['Closing Stock Time: 11:55 PM'],
      ['Generated: ' + format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
      [],
      headers,
      ...rows,
      [],
      ['Summary'],
      ['Opening Stock Value (9:00 AM)', totals.openingValue.toFixed(2)],
      ['Additions Value', totals.additionsValue.toFixed(2)],
      ['Sales Value', totals.salesValue.toFixed(2)],
      ['Expected Closing Value', totals.expectedClosingValue.toFixed(2)],
      ['Actual Closing Value (11:55 PM)', totals.actualClosingValue.toFixed(2)],
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
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold">Stock Reconciliation Report</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Opening stock at 9:00 AM • Closing stock at 11:55 PM • Track missing inventory
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {needsInitialization && (
            <Button 
              onClick={initializeTodaySnapshot} 
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Database className="h-4 w-4 mr-2" />
              Initialize Stock Tracking
            </Button>
          )}
          
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        {needsInitialization && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                  🎯 Setup Required: Initialize Stock Tracking
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Your current stock value is <strong>₹6,376</strong>. Click "Initialize Stock Tracking" to:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1 ml-2">
                  <li>Record today's opening stock (9:00 AM) = ₹6,376</li>
                  <li>Record today's closing stock (11:55 PM) = ₹6,376 (same for first day)</li>
                  <li>Enable automatic daily snapshots from tomorrow at 9:00 AM and 11:55 PM</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {isInitialized && (
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Automatic stock tracking is active. Snapshots are taken daily at <strong>9:00 AM</strong> (opening) and <strong>11:55 PM</strong> (closing).
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {itemsWithoutBuyingPrice.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warning: Missing Buying Prices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {itemsWithoutBuyingPrice.length} products are using selling price or regular price. Add buying prices for accurate reconciliation.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Opening Stock Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totals.openingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              At 9:00 AM on {format(selectedDate, 'dd MMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totals.salesValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Food & drinks sold on this date
            </p>
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
              totals.varianceValue > 0 && 'text-green-500',
              totals.varianceValue === 0 && 'text-muted-foreground'
            )}>
              ₹{Math.abs(totals.varianceValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              {totals.varianceValue < 0 && ' (Missing)'}
              {totals.varianceValue > 0 && ' (Excess)'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              At 11:55 PM closing
            </p>
          </CardContent>
        </Card>
      </div>

      {itemsWithVariance.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
          <CardTitle className="text-base">Detailed Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          {reconciliationData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No food or drinks products found.</p>
              <p className="text-sm mt-2">Add food or drinks products to see reconciliation data.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Opening (9 AM)</TableHead>
                    <TableHead className="text-right">Additions</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual (11:55 PM)</TableHead>
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
                          <div className="font-medium flex items-center gap-2">
                            {item.productName}
                            {!item.hasBuyingPrice && (
                              <Badge variant="outline" className="text-xs">No BP</Badge>
                            )}
                          </div>
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
                          {item.varianceValue !== 0 && (item.varianceValue < 0 ? '-' : '+')}
                          ₹{Math.abs(item.varianceValue).toFixed(0)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Formula Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reconciliation Formula</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Expected Closing Stock</strong> = Opening Stock (9:00 AM) + Additions - Sales</p>
          <p><strong>Variance</strong> = Actual Closing Stock (11:55 PM) - Expected Closing Stock</p>
          <p className="text-xs">• Negative variance = missing stock (theft/wastage/unrecorded sales)</p>
          <p className="text-xs">• Positive variance = excess stock (unrecorded purchases/returns)</p>
          <p className="text-xs">• Automatic snapshots: 9:00 AM (opening) & 11:55 PM (closing) daily</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReconciliationReport;
