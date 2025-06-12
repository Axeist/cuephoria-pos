
import React, { useState, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Download, FileText, TrendingUp } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import SalesWidgets from '@/components/reports/SalesWidgets';
import ExpandableBillRow from '@/components/reports/ExpandableBillRow';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Reports = () => {
  const { bills, customers, products, sessions } = usePOS();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [activeTab, setActiveTab] = useState('sales');

  // Filter bills based on date range
  const filteredBills = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return bills;
    
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return isWithinInterval(billDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [bills, dateRange]);

  // Quick date filters
  const setThisWeek = () => {
    const now = new Date();
    setDateRange({
      from: startOfWeek(now),
      to: endOfWeek(now)
    });
  };

  const setThisMonth = () => {
    const now = new Date();
    setDateRange({
      from: startOfMonth(now),
      to: endOfMonth(now)
    });
  };

  const clearDateFilter = () => {
    setDateRange(undefined);
  };

  // Export functions
  const exportSalesReport = () => {
    try {
      const exportData = filteredBills.map(bill => ({
        'Date': format(new Date(bill.createdAt), 'yyyy-MM-dd HH:mm'),
        'Bill ID': bill.id,
        'Customer': bill.customerId ? customers.find(c => c.id === bill.customerId)?.name || 'Unknown' : 'Walk-in',
        'Items': bill.items.length,
        'Subtotal': bill.subtotal,
        'Tax': bill.tax,
        'Total': bill.total,
        'Payment Method': bill.paymentMethod || 'Cash'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      const columnWidths = [
        { wch: 16 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, 
        { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 15 }
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

      const filename = dateRange 
        ? `sales_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`
        : `sales_report_all_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredBills.length} sales records`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the sales report.',
        variant: 'destructive'
      });
    }
  };

  const exportProductReport = () => {
    try {
      const productSales = new Map();
      
      filteredBills.forEach(bill => {
        bill.items.forEach(item => {
          const current = productSales.get(item.name) || { 
            quantity: 0, 
            revenue: 0, 
            category: products.find(p => p.name === item.name)?.category || 'Unknown' 
          };
          current.quantity += item.quantity;
          current.revenue += item.price * item.quantity;
          productSales.set(item.name, current);
        });
      });

      const exportData = Array.from(productSales.entries()).map(([name, data]) => ({
        'Product': name,
        'Category': data.category,
        'Quantity Sold': data.quantity,
        'Revenue': data.revenue,
        'Average Price': (data.revenue / data.quantity).toFixed(2)
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      const columnWidths = [
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Report');

      const filename = dateRange 
        ? `product_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`
        : `product_report_all_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);

      toast({
        title: 'Export Successful',
        description: `Exported product performance report`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the product report.',
        variant: 'destructive'
      });
    }
  };

  const headerActions = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportSalesReport}>
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={exportProductReport}>
        <FileText className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <MobileLayout title="Reports" headerActions={headerActions}>
      <div className="space-y-6">
        {/* Date Filter Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DatePickerWithRange
              date={dateRange}
              setDate={setDateRange}
              className="w-full"
            />
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={setThisWeek}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={setThisMonth}>
                This Month
              </Button>
              <Button variant="outline" size="sm" onClick={clearDateFilter}>
                All Time
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {dateRange?.from && dateRange?.to ? (
                <>Showing data from {format(dateRange.from, 'MMM dd, yyyy')} to {format(dateRange.to, 'MMM dd, yyyy')}</>
              ) : (
                'Showing all available data'
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Widgets */}
        <SalesWidgets bills={filteredBills} />

        {/* Reports Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
            <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales Transactions</CardTitle>
                <CardDescription>
                  {filteredBills.length} transactions found
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredBills.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No sales data found for the selected period
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredBills
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 50)
                      .map((bill) => (
                        <ExpandableBillRow 
                          key={bill.id} 
                          bill={bill} 
                          customers={customers}
                        />
                      ))
                    }
                    {filteredBills.length > 50 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Showing latest 50 transactions. Use export for complete data.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Performance</CardTitle>
                <CardDescription>
                  Sales performance by product
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Product performance would go here */}
                <div className="text-center text-muted-foreground">
                  Product performance analytics coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Analytics</CardTitle>
                <CardDescription>
                  Customer behavior and spending patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Customer analytics would go here */}
                <div className="text-center text-muted-foreground">
                  Customer analytics coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Reports;
