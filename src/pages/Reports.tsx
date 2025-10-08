import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { usePOS } from '@/context/POSContext';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Download, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// ExpandableBillRow Component
const ExpandableBillRow = ({ bill, customer, onDelete }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isComplimentary = bill.paymentMethod === 'complimentary';

  return (
    <>
      <TableRow 
        className={`cursor-pointer ${isComplimentary ? 'bg-orange-950/10 hover:bg-orange-950/20' : 'hover:bg-gray-800/50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="font-mono text-xs">{bill.id.substring(0, 8)}</TableCell>
        <TableCell>
          <div>
            <p className="font-medium">{customer?.name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{customer?.phone}</p>
          </div>
        </TableCell>
        <TableCell>
          <div>
            <p>{format(new Date(bill.createdAt), 'MMM dd, yyyy')}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(bill.createdAt), 'hh:mm a')}</p>
          </div>
        </TableCell>
        <TableCell className={isComplimentary ? 'text-orange-400 font-semibold' : 'font-semibold'}>
          <CurrencyDisplay amount={bill.total} />
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={
              bill.paymentMethod === 'cash' ? 'border-green-500 text-green-500' :
              bill.paymentMethod === 'upi' ? 'border-blue-500 text-blue-500' :
              bill.paymentMethod === 'credit' ? 'border-yellow-500 text-yellow-500' :
              bill.paymentMethod === 'split' ? 'border-purple-500 text-purple-500' :
              'border-orange-500 text-orange-500'
            }
          >
            {bill.paymentMethod === 'complimentary' ? 'Comp' : bill.paymentMethod?.toUpperCase()}
          </Badge>
        </TableCell>
        <TableCell>
          {isComplimentary ? (
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
              <Gift className="h-3 w-3 mr-1" />
              Complimentary
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-500 text-green-500">
              Paid
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(bill);
            }}
            className="text-red-500 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className={isComplimentary ? 'bg-orange-950/10' : 'bg-gray-800/30'}>
          <TableCell colSpan={7} className="p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-white">Items</h4>
                <div className="space-y-2">
                  {bill.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm text-gray-300">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="font-semibold"><CurrencyDisplay amount={item.total} /></span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal:</span>
                    <span className="text-white font-semibold"><CurrencyDisplay amount={bill.subtotal} /></span>
                  </div>
                  {bill.discountValue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Discount ({bill.discountType === 'percentage' ? `${bill.discount}%` : 'Fixed'}):</span>
                      <span className="text-red-400 font-semibold">-<CurrencyDisplay amount={bill.discountValue} /></span>
                    </div>
                  )}
                  {bill.loyaltyPointsUsed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loyalty Points Used:</span>
                      <span className="text-orange-400 font-semibold">{bill.loyaltyPointsUsed} points</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-700">
                    <span className="text-white font-semibold">Total:</span>
                    <span className={`font-bold ${isComplimentary ? 'text-orange-400' : 'text-white'}`}>
                      <CurrencyDisplay amount={bill.total} />
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className={`font-semibold ${isComplimentary ? 'text-orange-400' : 'text-white'}`}>
                      {bill.paymentMethod === 'complimentary' ? 'Complimentary' : bill.paymentMethod?.toUpperCase()}
                    </span>
                  </div>
                  {isComplimentary && bill.compNote && (
                    <div className="pt-2 border-t border-orange-800/30">
                      <span className="text-gray-400 block mb-1">Complimentary Note:</span>
                      <span className="text-orange-400 italic text-sm">{bill.compNote}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// SalesWidgets Component
const SalesWidgets = ({ data }: any) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Revenue (Paid)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={data.totalRevenue} />
          </div>
          <p className="text-xs text-gray-400">From {data.totalBills} paid transactions</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Average Bill Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={data.avgBillValue} />
          </div>
          <p className="text-xs text-gray-400">Per paid transaction</p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Discount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={data.totalDiscount} />
          </div>
          <p className="text-xs text-gray-400">Discounts given</p>
        </CardContent>
      </Card>

      <Card className="bg-orange-950/20 border-orange-500/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-orange-400 flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Complimentary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-400">
            <CurrencyDisplay amount={data.complimentaryValue} />
          </div>
          <p className="text-xs text-orange-400">{data.complimentaryCount} transactions given free</p>
        </CardContent>
      </Card>
    </div>
  );
};

// BusinessSummaryReport Component
const BusinessSummaryReport = ({ data }: any) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Business Summary</CardTitle>
        <CardDescription className="text-gray-400">Financial overview for selected period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-300">Total Revenue (Paid Sales):</span>
          <span className="text-lg font-bold text-white"><CurrencyDisplay amount={data.totalRevenue} /></span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-300">Total Expenses:</span>
          <span className="text-lg font-bold text-red-400"><CurrencyDisplay amount={data.totalExpenses} /></span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-700 pt-4">
          <span className="text-sm font-medium text-white">Net Profit:</span>
          <span className={`text-xl font-bold ${data.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            <CurrencyDisplay amount={data.netProfit} />
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-orange-800/30 pt-4">
          <span className="text-sm font-medium text-orange-400">Complimentary Value (Not Revenue):</span>
          <span className="text-lg font-bold text-orange-400">
            <CurrencyDisplay amount={data.complimentaryValue} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const ReportsPage = () => {
  const { bills, customers, products, sessions, deleteBill } = usePOS();
  const { expenses } = useExpenses();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const [selectedPreset, setSelectedPreset] = useState('thisMonth');
  const [activeTab, setActiveTab] = useState('bills');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!dateRange?.from) return { filteredBills: bills, filteredExpenses: expenses, filteredSessions: sessions };

    const startDate = startOfDay(dateRange.from);
    const endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return {
      filteredBills: bills.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= startDate && billDate <= endDate;
      }),
      filteredExpenses: expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      }),
      filteredSessions: sessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startDate && sessionDate <= endDate;
      })
    };
  }, [bills, expenses, sessions, dateRange]);

  // Separate paid and complimentary bills
  const paidBills = useMemo(() => 
    filteredData.filteredBills.filter(bill => bill.paymentMethod !== 'complimentary'),
    [filteredData.filteredBills]
  );

  const complimentaryBills = useMemo(() => 
    filteredData.filteredBills.filter(bill => bill.paymentMethod === 'complimentary'),
    [filteredData.filteredBills]
  );

  // Apply filters and search
  const processedBills = useMemo(() => {
    let result = [...filteredData.filteredBills];

    // Payment filter
    if (paymentFilter !== 'all') {
      result = result.filter(bill => bill.paymentMethod === paymentFilter);
    }

    // Status filter
    if (statusFilter === 'paid') {
      result = result.filter(bill => bill.paymentMethod !== 'complimentary');
    } else if (statusFilter === 'complimentary') {
      result = result.filter(bill => bill.paymentMethod === 'complimentary');
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        return (
          bill.id.toLowerCase().includes(query) ||
          customer?.name.toLowerCase().includes(query) ||
          customer?.phone.includes(query)
        );
      });
    }

    return result;
  }, [filteredData.filteredBills, paymentFilter, statusFilter, searchQuery, customers]);

  // Sort bills
  const sortedBills = useMemo(() => {
    if (!sortConfig) return processedBills;

    return [...processedBills].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof typeof a];
      let bValue: any = b[sortConfig.key as keyof typeof b];

      if (sortConfig.key === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedBills, sortConfig]);
  // Calculate summary metrics - PAID ONLY
  const summaryMetrics = useMemo(() => {
    const totalRevenue = paidBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalDiscount = paidBills.reduce((sum, bill) => sum + bill.discountValue, 0);
    const avgBillValue = paidBills.length > 0 ? totalRevenue / paidBills.length : 0;
    const totalExpenses = filteredData.filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    const complimentaryValue = complimentaryBills.reduce((sum, bill) => sum + bill.total, 0);
    const complimentaryCount = complimentaryBills.length;

    // Payment breakdown - PAID ONLY
    const paymentBreakdown = {
      cash: paidBills.filter(b => b.paymentMethod === 'cash').reduce((sum, b) => sum + b.total, 0),
      upi: paidBills.filter(b => b.paymentMethod === 'upi').reduce((sum, b) => sum + b.total, 0),
      credit: paidBills.filter(b => b.paymentMethod === 'credit').reduce((sum, b) => sum + b.total, 0),
      split: paidBills.filter(b => b.paymentMethod === 'split').reduce((sum, b) => sum + b.total, 0),
    };

    return {
      totalRevenue,
      totalBills: paidBills.length,
      avgBillValue,
      totalDiscount,
      totalExpenses,
      netProfit,
      complimentaryValue,
      complimentaryCount,
      paymentBreakdown
    };
  }, [paidBills, complimentaryBills, filteredData.filteredExpenses]);

  // Top products - PAID ONLY
  const topProducts = useMemo(() => {
    const productStats = new Map<string, { quantity: number; revenue: number }>();
    
    paidBills.forEach(bill => {
      bill.items?.forEach((item: any) => {
        const current = productStats.get(item.id) || { quantity: 0, revenue: 0 };
        productStats.set(item.id, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + item.total
        });
      });
    });

    return Array.from(productStats.entries())
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        return product ? { ...product, ...stats } : null;
      })
      .filter(p => p !== null)
      .sort((a, b) => (b?.revenue || 0) - (a?.revenue || 0))
      .slice(0, 10);
  }, [paidBills, products]);

  // Top customers - PAID ONLY
  const topCustomers = useMemo(() => {
    const customerTotals = new Map<string, number>();
    
    paidBills.forEach(bill => {
      const current = customerTotals.get(bill.customerId) || 0;
      customerTotals.set(bill.customerId, current + bill.total);
    });

    return Array.from(customerTotals.entries())
      .map(([customerId, total]) => {
        const customer = customers.find(c => c.id === customerId);
        return customer ? { ...customer, totalSpent: total } : null;
      })
      .filter(c => c !== null)
      .sort((a, b) => (b?.totalSpent || 0) - (a?.totalSpent || 0))
      .slice(0, 10);
  }, [paidBills, customers]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const today = new Date();
    
    switch (preset) {
      case 'today':
        setDateRange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case 'thisWeek':
        setDateRange({ from: startOfWeek(today), to: endOfWeek(today) });
        break;
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subDays(today, 7));
        const lastWeekEnd = endOfWeek(subDays(today, 7));
        setDateRange({ from: lastWeekStart, to: lastWeekEnd });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        break;
      case 'thisYear':
        setDateRange({ from: startOfYear(today), to: endOfYear(today) });
        break;
      default:
        break;
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleDeleteClick = (bill: any) => {
    setBillToDelete(bill);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!billToDelete) return;

    try {
      await deleteBill(billToDelete.id, billToDelete.customerId);
      toast({
        title: 'Bill Deleted',
        description: 'The bill has been successfully deleted.',
      });
      setDeleteDialogOpen(false);
      setBillToDelete(null);
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the bill. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const exportToExcel = () => {
    try {
      const billsData = sortedBills.map(bill => {
        const customer = customers.find(c => c.id === bill.customerId);
        return {
          'Bill ID': bill.id,
          'Customer': customer?.name || 'Unknown',
          'Phone': customer?.phone || '',
          'Date': format(new Date(bill.createdAt), 'yyyy-MM-dd'),
          'Time': format(new Date(bill.createdAt), 'HH:mm:ss'),
          'Subtotal': bill.subtotal,
          'Discount': bill.discountValue,
          'Total': bill.total,
          'Payment Method': bill.paymentMethod,
          'Status': bill.paymentMethod === 'complimentary' ? 'Complimentary' : 'Paid',
          'Complimentary Note': bill.compNote || '',
          'Items': bill.items?.map((item: any) => `${item.name} x${item.quantity}`).join(', ') || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(billsData);
      const workbook = XLSX.utils.book_new();
      
      worksheet['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
        { wch: 30 }, { wch: 50 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const filename = `bills_report_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}.xlsx`;
      saveAs(blob, filename);

      toast({
        title: 'Export Successful',
        description: `Exported ${sortedBills.length} bills to ${filename}`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the data',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">Reports & Analytics</h2>
        <div className="flex items-center gap-4">
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="bg-gray-800 text-white"
              />
            </PopoverContent>
          </Popover>

          <Button onClick={exportToExcel} variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* BILLS TAB */}
        <TabsContent value="bills" className="space-y-6">
          <SalesWidgets data={summaryMetrics} />

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Transaction History</CardTitle>
              <CardDescription className="text-gray-400">All transactions in the selected period</CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by ID, customer name, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="split">Split Payment</SelectItem>
                    <SelectItem value="complimentary">Complimentary</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="complimentary">Complimentary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-900">
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300 cursor-pointer" onClick={() => handleSort('id')}>
                        Bill ID
                        {sortConfig?.key === 'id' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="inline ml-1 h-3 w-3" /> : <ArrowDown className="inline ml-1 h-3 w-3" />
                        )}
                      </TableHead>
                      <TableHead className="text-gray-300">Customer</TableHead>
                      <TableHead className="text-gray-300 cursor-pointer" onClick={() => handleSort('createdAt')}>
                        Date & Time
                        {sortConfig?.key === 'createdAt' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="inline ml-1 h-3 w-3" /> : <ArrowDown className="inline ml-1 h-3 w-3" />
                        )}
                      </TableHead>
                      <TableHead className="text-gray-300 cursor-pointer" onClick={() => handleSort('total')}>
                        Total
                        {sortConfig?.key === 'total' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="inline ml-1 h-3 w-3" /> : <ArrowDown className="inline ml-1 h-3 w-3" />
                        )}
                      </TableHead>
                      <TableHead className="text-gray-300">Payment</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedBills.length > 0 ? (
                      sortedBills.map((bill) => {
                        const customer = customers.find(c => c.id === bill.customerId);
                        return (
                          <ExpandableBillRow
                            key={bill.id}
                            bill={bill}
                            customer={customer}
                            onDelete={handleDeleteClick}
                          />
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                          No bills found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
              {sortedBills.length > 0 && (
                <div className="mt-4 text-sm text-gray-400">
                  Showing {sortedBills.length} of {filteredData.filteredBills.length} total bills
                </div>
              )}
            </CardContent>
          </Card>

          {/* Complimentary Insights Widget */}
          {complimentaryBills.length > 0 && (
            <Card className="bg-gradient-to-br from-orange-950/20 to-gray-800 border-orange-500/50">
              <CardHeader>
                <CardTitle className="text-orange-400 flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Complimentary Insights
                </CardTitle>
                <CardDescription className="text-gray-400">Detailed breakdown of complimentary transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-orange-400">Total Value Given</p>
                    <p className="text-2xl font-bold text-orange-400">
                      <CurrencyDisplay amount={summaryMetrics.complimentaryValue} />
                    </p>
                    <p className="text-xs text-gray-400">
                      Across {summaryMetrics.complimentaryCount} transactions
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-orange-400">Average Value</p>
                    <p className="text-2xl font-bold text-orange-400">
                      <CurrencyDisplay amount={summaryMetrics.complimentaryCount > 0 ? summaryMetrics.complimentaryValue / summaryMetrics.complimentaryCount : 0} />
                    </p>
                    <p className="text-xs text-gray-400">
                      Per complimentary transaction
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-orange-400">Top Reasons</p>
                    <div className="space-y-1">
                      {Array.from(new Set(complimentaryBills.filter(b => b.compNote).map(b => b.compNote)))
                        .slice(0, 3)
                        .map((note, idx) => (
                          <p key={idx} className="text-sm text-orange-400 italic truncate">
                            • {note}
                          </p>
                        ))}
                      {complimentaryBills.filter(b => b.compNote).length === 0 && (
                        <p className="text-sm text-gray-400">No notes recorded</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-orange-400">Recent Complimentary Transactions</h4>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {complimentaryBills.slice(0, 10).map(bill => {
                        const customer = customers.find(c => c.id === bill.customerId);
                        return (
                          <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-950/30 border border-orange-800/30">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-white">{customer?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">
                                {format(new Date(bill.createdAt), 'MMM dd, yyyy • hh:mm a')}
                              </p>
                              {bill.compNote && (
                                <p className="text-xs text-orange-400 italic mt-1">{bill.compNote}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-orange-400">
                                <CurrencyDisplay amount={bill.total} />
                              </p>
                              <p className="text-xs text-gray-400">
                                {bill.items?.length || 0} items
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Top Customers</CardTitle>
              <CardDescription className="text-gray-400">Highest spending customers (Paid transactions only)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-gray-900">
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Rank</TableHead>
                    <TableHead className="text-gray-300">Customer Name</TableHead>
                    <TableHead className="text-gray-300">Phone</TableHead>
                    <TableHead className="text-gray-300">Member Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Transactions</TableHead>
                    <TableHead className="text-gray-300 text-right">Total Spent</TableHead>
                    <TableHead className="text-gray-300 text-right">Loyalty Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.length > 0 ? (
                    topCustomers.map((customer, index) => {
                      const customerBillCount = paidBills.filter(b => b.customerId === customer?.id).length;
                      return (
                        <TableRow key={customer?.id} className="border-gray-700">
                          <TableCell>
                            <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          </TableCell>
                          <TableCell className="font-medium text-white">{customer?.name}</TableCell>
                          <TableCell className="text-gray-300">{customer?.phone}</TableCell>
                          <TableCell>
                            {customer?.isMember ? (
                              <Badge variant="outline" className="border-purple-500 text-purple-400">
                                Member
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-500 text-gray-400">Regular</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-white">{customerBillCount}</TableCell>
                          <TableCell className="text-right font-bold text-white">
                            <CurrencyDisplay amount={customer?.totalSpent || 0} />
                          </TableCell>
                          <TableCell className="text-right text-orange-400">{customer?.loyaltyPoints}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                        No customer data available for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SESSIONS TAB */}
        <TabsContent value="sessions" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{filteredData.filteredSessions.length}</div>
                <p className="text-xs text-gray-400">In selected period</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Session Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  <CurrencyDisplay amount={filteredData.filteredSessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0)} />
                </div>
                <p className="text-xs text-gray-400">From all sessions</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Avg Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {filteredData.filteredSessions.length > 0 
                    ? Math.round(
                        filteredData.filteredSessions.reduce((sum, s) => {
                          const duration = s.endTime 
                            ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60)
                            : 0;
                          return sum + duration;
                        }, 0) / filteredData.filteredSessions.length
                      )
                    : 0
                  } min
                </div>
                <p className="text-xs text-gray-400">Average time per session</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {filteredData.filteredSessions.filter(s => !s.endTime).length}
                </div>
                <p className="text-xs text-gray-400">Currently running</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Session History</CardTitle>
              <CardDescription className="text-gray-400">All gaming sessions in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="bg-gray-900">
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Station</TableHead>
                      <TableHead className="text-gray-300">Customer</TableHead>
                      <TableHead className="text-gray-300">Start Time</TableHead>
                      <TableHead className="text-gray-300">End Time</TableHead>
                      <TableHead className="text-gray-300">Duration</TableHead>
                      <TableHead className="text-gray-300 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.filteredSessions.length > 0 ? (
                      filteredData.filteredSessions.map((session) => {
                        const customer = customers.find(c => c.id === session.customerId);
                        const duration = session.endTime
                          ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
                          : null;
                        
                        return (
                          <TableRow key={session.id} className="border-gray-700">
                            <TableCell className="font-medium text-white">{session.stationName}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-white">{customer?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">{customer?.phone}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {format(new Date(session.startTime), 'MMM dd, yyyy hh:mm a')}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {session.endTime ? format(new Date(session.endTime), 'MMM dd, yyyy hh:mm a') : (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {duration ? `${duration} min` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-white">
                              <CurrencyDisplay amount={session.totalAmount || 0} />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                          No sessions found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUMMARY TAB */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <BusinessSummaryReport data={summaryMetrics} />

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Payment Method Breakdown</CardTitle>
                <CardDescription className="text-gray-400">Distribution across payment methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-white">Cash</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">
                        {paidBills.filter(b => b.paymentMethod === 'cash').length} bills
                      </span>
                      <span className="text-sm font-bold text-white">
                        <CurrencyDisplay amount={summaryMetrics.paymentBreakdown.cash} />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-white">UPI</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">
                        {paidBills.filter(b => b.paymentMethod === 'upi').length} bills
                      </span>
                      <span className="text-sm font-bold text-white">
                        <CurrencyDisplay amount={summaryMetrics.paymentBreakdown.upi} />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="text-sm font-medium text-white">Credit</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">
                        {paidBills.filter(b => b.paymentMethod === 'credit').length} bills
                      </span>
                      <span className="text-sm font-bold text-white">
                        <CurrencyDisplay amount={summaryMetrics.paymentBreakdown.credit} />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium text-white">Split</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">
                        {paidBills.filter(b => b.paymentMethod === 'split').length} bills
                      </span>
                      <span className="text-sm font-bold text-white">
                        <CurrencyDisplay amount={summaryMetrics.paymentBreakdown.split} />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-orange-800/30 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500" />
                      <span className="text-sm font-medium text-orange-400">Complimentary</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-orange-400">
                        {complimentaryBills.length} bills
                      </span>
                      <span className="text-sm font-bold text-orange-400">
                        <CurrencyDisplay amount={summaryMetrics.complimentaryValue} />
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Top Products</CardTitle>
                <CardDescription className="text-gray-400">Best performing products by revenue (Paid only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product?.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        <div>
                          <p className="font-medium text-white">{product?.name}</p>
                          <p className="text-sm text-gray-400">{product?.quantity} sold</p>
                        </div>
                      </div>
                      <span className="font-bold text-white">
                        <CurrencyDisplay amount={product?.revenue || 0} />
                      </span>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No product data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Top Customers</CardTitle>
                <CardDescription className="text-gray-400">Highest spending customers (Paid only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={customer?.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        <div>
                          <p className="font-medium text-white">{customer?.name}</p>
                          <p className="text-sm text-gray-400">{customer?.phone}</p>
                        </div>
                      </div>
                      <span className="font-bold text-white">
                        <CurrencyDisplay amount={customer?.totalSpent || 0} />
                      </span>
                    </div>
                  ))}
                  {topCustomers.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No customer data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this bill? This action will revert inventory, adjust customer points, and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReportsPage;
