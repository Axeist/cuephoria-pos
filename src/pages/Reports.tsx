
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { usePOS } from '@/context/POSContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Search, X, Trash2, Edit, Receipt, Eye } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Bill, Customer } from '@/types/pos.types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSessionsData } from '@/hooks/stations/useSessionsData';
import ExpandableBillRow from '@/components/reports/ExpandableBillRow';
import SalesWidgets from '@/components/reports/SalesWidgets';

interface DateFilter {
  from: Date | null;
  to: Date | null;
}

const formatDate = (date: Date | null): string => {
  return date ? format(date, 'yyyy-MM-dd') : '';
};

const Reports = () => {
  const { bills, customers } = usePOS();
  const { expenses } = useExpenses();
  const { sessions } = useSessionsData();

  const [dateFilter, setDateFilter] = useState<DateFilter>({
    from: null,
    to: null,
  });
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isViewBillDialogOpen, setIsViewBillDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  const filteredBills = useMemo(() => {
    let filtered = [...bills];

    if (dateFilter.from && dateFilter.to) {
      const startDate = startOfDay(dateFilter.from);
      const endDate = endOfDay(dateFilter.to);

      filtered = filtered.filter((bill) => {
        const billDate = typeof bill.createdAt === 'string' ? parseISO(bill.createdAt) : bill.createdAt;
        return isWithinInterval(billDate, { start: startDate, end: endDate });
      });
    }

    if (selectedCustomer) {
      filtered = filtered.filter((bill) => bill.customerId === selectedCustomer);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((bill) => {
        const customer = customers.find((c) => c.id === bill.customerId);
        const customerName = customer ? customer.name.toLowerCase() : '';

        return (
          bill.id.toLowerCase().includes(lowerSearchTerm) ||
          customerName.includes(lowerSearchTerm)
        );
      });
    }

    return filtered;
  }, [bills, dateFilter, selectedCustomer, searchTerm, customers]);

  const totalSales = useMemo(() => {
    return filteredBills.reduce((acc, bill) => acc + bill.total, 0);
  }, [filteredBills]);

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    
    setDateFilter({
      from: range.from || null,
      to: range.to || null
    });
  };

  const clearDateFilter = () => {
    setDateFilter({ from: null, to: null });
    setIsDatePopoverOpen(false);
  };

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === "all") {
      setSelectedCustomer(null);
    } else {
      setSelectedCustomer(customerId);
    }
  };

  const clearCustomerFilter = () => {
    setSelectedCustomer(null);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const viewBillDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setIsViewBillDialogOpen(true);
  };

  const closeBillDialog = () => {
    setIsViewBillDialogOpen(false);
    setSelectedBill(null);
  };

  const confirmDeleteBill = (billId: string) => {
    setBillToDelete(billId);
    setIsDeleteDialogOpen(true);
  };

  const cancelDeleteBill = () => {
    setIsDeleteDialogOpen(false);
    setBillToDelete(null);
  };

  const deleteBill = async () => {
    if (billToDelete) {
      try {
        // Optimistically update the UI
        const updatedBills = bills.filter((bill) => bill.id !== billToDelete);
        //setBills(updatedBills); // Assuming you have a setBills function from context

        // Here you would typically call your API to delete the bill
        // await deleteBillApi(billToDelete);

        // If the API call is successful, you can then update the context
        // If there's an error, you should revert the UI update and show an error message
        console.log(`Bill with ID ${billToDelete} deleted.`);
      } catch (error) {
        console.error("Error deleting bill:", error);
        // Revert the UI update and show an error message
        // setBills(bills); // Revert to the original bills state
        // toast.error("Failed to delete bill. Please try again.");
      } finally {
        setIsDeleteDialogOpen(false);
        setBillToDelete(null);
      }
    }
  };

  const exportToExcel = () => {
    // Implementation for exporting data to Excel
    console.log('Exporting to Excel...');
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const getCustomerPhone = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.phone || '';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Sales</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SalesWidgets 
            filteredBills={filteredBills}
          />
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            {/* Date Range Filter */}
            <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'justify-start text-left font-normal',
                    !dateFilter.from && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter.from && dateFilter.to ? (
                    `${format(dateFilter.from, 'MMM dd, yyyy')} - ${format(
                      dateFilter.to,
                      'MMM dd, yyyy'
                    )}`
                  ) : dateFilter.from ? (
                    `${format(dateFilter.from, 'MMM dd, yyyy')} - Select End Date`
                  ) : (
                    'Select Date Range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateFilter.from ? dateFilter.from : new Date()}
                  selected={dateFilter.from && dateFilter.to ? { from: dateFilter.from, to: dateFilter.to } : undefined}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                />
                {dateFilter.from && dateFilter.to && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setIsDatePopoverOpen(false)}
                  >
                    Close
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* Customer Filter */}
            <Select onValueChange={handleCustomerSelect} value={selectedCustomer || "all"}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Customers
                </SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Bills */}
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search by Bill ID or Customer Name..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Display Total Sales */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            </CardContent>
          </Card>

          {/* Detailed Sales Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <ExpandableBillRow 
                    key={bill.id} 
                    bill={bill} 
                    getCustomerName={getCustomerName}
                    getCustomerPhone={getCustomerPhone}
                    searchTerm={searchTerm}
                  />
                ))}
              </tbody>
            </table>
            {filteredBills.length === 0 && (
              <div className="text-center py-4">No bills found.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div>
            <h2>Analytics and Predictions</h2>
            <p>
              Here, you can view analytics and predictions based on the sales data.
            </p>
            {/* Add your analytics components here */}
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div>
            <h2>Expense Reports</h2>
            <p>View and manage your expenses.</p>
            {expenses.map((expense) => (
              <Card key={expense.id} className="mb-4">
                <CardHeader>
                  <CardTitle>{expense.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Amount: ${expense.amount.toFixed(2)}</p>
                  <p>Date: {format(parseISO(expense.date), 'MMM dd, yyyy')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Bill Dialog */}
      <Dialog open={isViewBillDialogOpen} onOpenChange={setIsViewBillDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div>
              <p>Bill ID: {selectedBill.id}</p>
              <p>
                Customer:{' '}
                {customers.find((c) => c.id === selectedBill.customerId)?.name ||
                  'N/A'}
              </p>
              <p>Date: {format(typeof selectedBill.createdAt === 'string' ? parseISO(selectedBill.createdAt) : selectedBill.createdAt, 'MMM dd, yyyy')}</p>
              <p>Total: ${selectedBill.total.toFixed(2)}</p>
              {/* Display line items here */}
            </div>
          )}
          <Button onClick={closeBillDialog}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this bill?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteBill}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteBill}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reports;
