import React, { useState, useMemo, useEffect } from 'react';
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

  // Debug logging
  useEffect(() => {
    console.log('=== RECONCILIATION DEBUG ===');
    console.log('Total products loaded:', products.length);
    console.log('All categories:', [...new Set(products.map(p => p.category))]);
    console.log('Products sample:', products.slice(0, 3));
    
    const foodDrinks = products.filter(p => {
      const cat = p.category?.toLowerCase() || '';
      return cat === 'food' || cat === 'drinks';
    });
    console.log('Food/Drinks products found:', foodDrinks.length);
    console.log('Food/Drinks sample:', foodDrinks.slice(0, 3));
  }, [products]);

  const initializeTodaySnapshot = () => {
    try {
      let count = 0;
      const today = new Date();
      const openingTime = setMinutes(setHours(today, 9), 0);
      const closingTime = setMinutes(setHours(today, 23), 55);
      
      console.log('Starting initialization...');
      
      products.forEach(product => {
        const category = (product.category || '').toLowerCase().trim();
        
        // Exact match for "food" or "drinks"
        if (category === 'food' || category === 'drinks') {
          console.log(`Initializing: ${product.name} (${product.category}), Stock: ${product.stock}`);
          
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

      console.log(`Initialization complete. ${count} products initialized.`);

      if (count === 0) {
        toast({
          title: 'No Products Found',
          description: `Found ${products.length} total products, but none with category "Food" or "Drinks". Please check categories.`,
          variant: 'destructive',
        });
        return;
      }

      localStorage.setItem('stockSnapshotInitialized', 'true');
      localStorage.setItem('lastOpeningSnapshotDate', format(today, 'yyyy-MM-dd'));
      localStorage.setItem('lastClosingSnapshotDate', format(today, 'yyyy-MM-dd'));

      toast({
        title: 'Snapshots Created!',
        description: `Successfully initialized ${count} products with opening and closing snapshots.`,
        duration: 5000,
      });

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Initialization error:', error);
      toast({
        title: 'Error',
        description: `Failed to create snapshots: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const getStockAtTime = (productId: string, date: Date, hour: number, minute: number = 0): number => {
    try {
      const allLogs = getStockLogs(productId);
      const targetTime = setMinutes(setHours(startOfDay(date), hour), minute);
      
      const logsBeforeTime = allLogs.filter(log => 
        new Date(log.timestamp) <= targetTime
      );

      if (logsBeforeTime.length === 0) {
        return 0;
      }

      const sortedLogs = logsBeforeTime.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return sortedLogs[0].newStock;
    } catch (error) {
      return 0;
    }
  };

  const getOpeningStock = (productId: string, date: Date): number => {
    return getStockAtTime(productId, date, 9, 0);
  };

  const getClosingStock = (productId: string, date: Date): number => {
    return getStockAtTime(productId, date, 23, 55);
  };

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
      return [];
    }
  };

  const reconciliationData = useMemo((): ReconciliationData[] => {
    try {
      // Exact category match - case insensitive
      const foodAndDrinks = products.filter(p => {
        const cat = (p.category || '').toLowerCase().trim();
        return cat === 'food' || cat === 'drinks';
      });

      console.log('Reconciliation calculation - Food/Drinks found:', foodAndDrinks.length);

      return foodAndDrinks.map(product => {
        const pricePerUnit = product.buyingPrice || product.sellingPrice || product.price;
        const hasBuyingPrice = !!product.buyingPrice;

        const openingStock = getOpeningStock(product.id, selectedDate);
        const openingValue = openingStock * pricePerUnit;

        const logsForDate = getStockChangesForDate(product.id, selectedDate);
        const additions = logsForDate
          .filter(log => log.changeType === 'addition' || log.changeType === 'initial')
          .reduce((sum, log) => sum + log.quantityChanged, 0);
        const additionsValue = additions * pricePerUnit;

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
      console.error('Error calculating reconciliation:', error);
      return [];
    }
  }, [products, transactions, selectedDate]);

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

  const isInitialized = localStorage.getItem('stockSnapshotInitialized') === 'true';
  const needsInitialization = !isInitialized;

  const currentStockValue = useMemo(() => {
    return products
      .filter(p => {
        const cat = (p.category || '').toLowerCase().trim();
        return cat === 'food' || cat === 'drinks';
      })
      .reduce((total, p) => {
        const price = p.buyingPrice || p.sellingPrice || p.price;
        return total + (price * p.stock);
      }, 0);
  }, [products]);

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
      ['Opening: 9:00 AM | Closing: 11:55 PM'],
      ['Generated: ' + format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
      [],
      headers,
      ...rows,
      [],
      ['Summary'],
      ['Opening Stock Value', totals.openingValue.toFixed(2)],
      ['Sales Value', totals.salesValue.toFixed(2)],
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
    <div className="space-y-6 p-4">
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
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
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
                  Found <strong>{reconciliationData.length} Food/Drinks products</strong> with stock value: <strong>₹{currentStockValue.toLocaleString('en-IN')}</strong>
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Today's sales detected: <strong>₹{totals.salesValue.toLocaleString('en-IN')}</strong>
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  Check console (F12) for detailed debug information
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isInitialized && (
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Automatic tracking active. Snapshots at <strong>9:00 AM</strong> (opening) & <strong>11:55 PM</strong> (closing) daily.
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
              Missing Buying Prices ({itemsWithoutBuyingPrice.length} products)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Using selling/regular price as fallback. Add buying prices for accurate cost tracking.
            </p>
          </CardContent>
        </Card>
      )}

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
              Food & drinks (buying price basis)
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Reconciliation ({reconciliationData.length} products)</CardTitle>
        </CardHeader>
        <CardContent>
          {reconciliationData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No food or drinks products found.</p>
              <p className="text-sm mt-2">Open browser console (F12) to see debug information.</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reconciliation Formula</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Expected Closing</strong> = Opening (9:00 AM) + Additions - Sales</p>
          <p><strong>Variance</strong> = Actual Closing (11:55 PM) - Expected Closing</p>
          <p className="text-xs">• Negative = missing stock • Positive = excess stock</p>
          <p className="text-xs">• Auto snapshots: 9:00 AM & 11:55 PM daily • Sales at buying price basis</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReconciliationReport;
