
import React, { useState, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, Search } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import SalesWidgets from '@/components/reports/SalesWidgets';
import ExpandableBillRow from '@/components/reports/ExpandableBillRow';

const Reports = () => {
  const { bills, customers, sessions } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  // Helper function to get customer name
  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Walk-in Customer';
  };

  // Helper function to get customer phone
  const getCustomerPhone = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.phone : '';
  };

  // Filter bills based on date range and search term
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      
      // Date range filter
      const withinDateRange = !dateRange?.from || !dateRange?.to || 
        isWithinInterval(billDate, { 
          start: dateRange.from, 
          end: new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000 - 1) 
        });

      // Search filter
      if (!searchTerm) return withinDateRange;
      
      const customerName = getCustomerName(bill.customerId).toLowerCase();
      const customerPhone = getCustomerPhone(bill.customerId);
      const billId = bill.id.toLowerCase();
      const itemNames = bill.items.map(item => item.name.toLowerCase()).join(' ');
      
      const matchesSearch = customerName.includes(searchTerm.toLowerCase()) ||
        customerPhone.includes(searchTerm) ||
        billId.includes(searchTerm.toLowerCase()) ||
        itemNames.includes(searchTerm.toLowerCase());

      return withinDateRange && matchesSearch;
    });
  }, [bills, dateRange, searchTerm, customers]);

  const exportData = () => {
    // Export functionality can be implemented here
    console.log('Exporting data...');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[300px] justify-start text-left font-normal',
                  !dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd MMM yyyy')} -{' '}
                      {format(dateRange.to, 'dd MMM yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd MMM yyyy')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={exportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="bills" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-6">
          {/* Sales Widgets */}
          <SalesWidgets filteredBills={filteredBills} />

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <p className="text-muted-foreground">
                View all transactions from {dateRange?.from ? format(dateRange.from, 'MMM do, yyyy') : 'beginning'} to{' '}
                {dateRange?.to ? format(dateRange.to, 'MMM do, yyyy') : 'now'}
              </p>
              <div className="flex items-center gap-2 mt-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name, phone, or bill ID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Showing {filteredBills.length} of {bills.length} transactions
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Bill ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Points Used</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Split Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.length === 0 ? (
                      <TableRow>
                        <td colSpan={10} className="text-center py-8 text-muted-foreground">
                          No transactions found for the selected criteria
                        </td>
                      </TableRow>
                    ) : (
                      filteredBills.map((bill) => (
                        <ExpandableBillRow
                          key={bill.id}
                          bill={bill}
                          getCustomerName={getCustomerName}
                          getCustomerPhone={getCustomerPhone}
                          searchTerm={searchTerm}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Customer analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Session analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Business Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Business summary coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
