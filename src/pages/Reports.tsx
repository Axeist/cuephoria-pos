import React, { useState, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Search, Calendar as CalendarIcon, Download, Filter, TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import SalesWidgets from '@/components/reports/SalesWidgets';
import ExpandableBillRow from '@/components/reports/ExpandableBillRow';
import { MobileLayout } from '@/components/mobile/MobileLayout';

const Reports = () => {
  const { bills, customers, products, sessions } = usePOS();
  const { expenses } = useExpenses();
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredBills = useMemo(() => {
    let filtered = bills;

    if (dateRange.from && dateRange.to) {
      const fromDate = startOfDay(dateRange.from);
      const toDate = endOfDay(dateRange.to);
      filtered = filtered.filter(bill => 
        isWithinInterval(new Date(bill.createdAt), { start: fromDate, end: toDate })
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        const customerName = customer?.name?.toLowerCase() || '';
        const customerPhone = customer?.phone || '';
        const billId = bill.id.toLowerCase();
        const itemNames = bill.items.map(item => item.name.toLowerCase()).join(' ');
        
        return customerName.includes(term) || 
               customerPhone.includes(term) ||
               billId.includes(term) ||
               itemNames.includes(term);
      });
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(bill => bill.paymentMethod === paymentFilter);
    }

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'amount':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'customer':
          const customerA = customers.find(c => c.id === a.customerId);
          const customerB = customers.find(c => c.id === b.customerId);
          aValue = customerA?.name || '';
          bValue = customerB?.name || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [bills, customers, dateRange, searchTerm, paymentFilter, sortBy, sortOrder]);

  const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  const totalBills = filteredBills.length;
  const averageBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getCustomerPhone = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.phone || '';
  };

  const handleExport = () => {
    try {
      if (filteredBills.length === 0) {
        toast({
          title: 'No Data to Export',
          description: 'There are no bills in the selected date range to export.',
          variant: 'destructive'
        });
        return;
      }

      const exportData = filteredBills.map(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        return {
          'Date': format(new Date(bill.createdAt), 'yyyy-MM-dd HH:mm'),
          'Bill ID': bill.id,
          'Customer': customer?.name || 'Unknown',
          'Phone': customer?.phone || '',
          'Items': bill.items.map(item => `${item.name} (${item.quantity})`).join(', '),
          'Subtotal': bill.subtotal,
          'Discount': bill.discountValue || 0,
          'Loyalty Points Used': bill.loyaltyPointsUsed || 0,
          'Total': bill.total,
          'Payment Method': bill.paymentMethod,
          'Cash Amount': bill.cashAmount || '',
          'UPI Amount': bill.upiAmount || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      
      const columnWidths = [
        { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 40 },
        { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }
      ];
      worksheet['!cols'] = columnWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

      const filename = dateRange.from && dateRange.to 
        ? `sales_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`
        : `sales_report_all_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredBills.length} bills to ${filename}`,
      });

    } catch (error) {
      console.error('Error exporting sales data:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the sales data. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <MobileLayout title="Reports">
      <div className="space-y-6">
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Sales Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            <SalesWidgets />
            
            <Card className="bg-card border">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-xl font-bold">Sales Transactions</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from && dateRange.to
                            ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                            : "Select dates"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                          numberOfMonths={1}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button onClick={handleExport} size="sm" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by customer, phone, bill ID, or items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="split">Split Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [field, order] = value.split('-');
                    setSortBy(field as 'date' | 'amount' | 'customer');
                    setSortOrder(order as 'asc' | 'desc');
                  }}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Date (Latest)</SelectItem>
                      <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                      <SelectItem value="amount-desc">Amount (High)</SelectItem>
                      <SelectItem value="amount-asc">Amount (Low)</SelectItem>
                      <SelectItem value="customer-asc">Customer (A-Z)</SelectItem>
                      <SelectItem value="customer-desc">Customer (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                    <div className="text-lg font-semibold">
                      <CurrencyDisplay amount={totalRevenue} />
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Total Bills</div>
                    <div className="text-lg font-semibold">{totalBills}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground">Average Bill</div>
                    <div className="text-lg font-semibold">
                      <CurrencyDisplay amount={averageBillValue} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white">Date & Time</TableHead>
                        <TableHead className="text-white">Bill ID</TableHead>
                        <TableHead className="text-white">Customer</TableHead>
                        <TableHead className="text-white">Items</TableHead>
                        <TableHead className="text-white">Subtotal</TableHead>
                        <TableHead className="text-white">Discount</TableHead>
                        <TableHead className="text-white">Points</TableHead>
                        <TableHead className="text-white">Total</TableHead>
                        <TableHead className="text-white">Payment</TableHead>
                        <TableHead className="text-white">Split Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map((bill) => (
                        <ExpandableBillRow
                          key={bill.id}
                          bill={bill}
                          getCustomerName={getCustomerName}
                          getCustomerPhone={getCustomerPhone}
                          searchTerm={searchTerm}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {filteredBills.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No bills found matching your criteria.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-r from-blue-900/20 to-blue-700/10 border-blue-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">
                        <CurrencyDisplay amount={totalRevenue} />
                      </p>
                    </div>
                    <div className="rounded-full bg-blue-900/30 p-3">
                      <TrendingUp className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-900/20 to-green-700/10 border-green-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Customers</p>
                      <p className="text-2xl font-bold">{customers.length}</p>
                    </div>
                    <div className="rounded-full bg-green-900/30 p-3">
                      <Users className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-900/20 to-purple-700/10 border-purple-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Products Sold</p>
                      <p className="text-2xl font-bold">
                        {filteredBills.reduce((sum, bill) => 
                          sum + bill.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                        )}
                      </p>
                    </div>
                    <div className="rounded-full bg-purple-900/30 p-3">
                      <Package className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-900/20 to-orange-700/10 border-orange-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Bill Value</p>
                      <p className="text-2xl font-bold">
                        <CurrencyDisplay amount={averageBillValue} />
                      </p>
                    </div>
                    <div className="rounded-full bg-orange-900/30 p-3">
                      <DollarSign className="h-6 w-6 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default Reports;
