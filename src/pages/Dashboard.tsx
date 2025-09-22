import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { isWithinInterval, format, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek } from 'date-fns';
import StatCardSection from '@/components/dashboard/StatCardSection';
import ActionButtonSection from '@/components/dashboard/ActionButtonSection';
import SalesChart from '@/components/dashboard/SalesChart';
import BusinessSummarySection from '@/components/dashboard/BusinessSummarySection';
import ActiveSessions from '@/components/dashboard/ActiveSessions';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import CustomerActivityChart from '@/components/dashboard/CustomerActivityChart';
import ProductInventoryChart from '@/components/dashboard/ProductInventoryChart';
import CustomerSpendingCorrelation from '@/components/dashboard/CustomerSpendingCorrelation';
import HourlyRevenueDistribution from '@/components/dashboard/HourlyRevenueDistribution';
import ProductPerformance from '@/components/dashboard/ProductPerformance';
import ExpenseList from '@/components/expenses/ExpenseList';
import ExpenseDateFilter from '@/components/expenses/ExpenseDateFilter';
import FilteredExpenseList from '@/components/expenses/FilteredExpenseList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Edit2, Trash2, TrendingUp, TrendingDown, DollarSign, PiggyBank } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { normalizeBills, isBetween } from '@/lib/date';
import { cn } from '@/lib/utils';

interface CashTransaction {
  id: string;
  type: 'in' | 'out';
  amount: number;
  source: string;
  purpose: string;
  notes: string;
  timestamp: string;
}

const Dashboard = () => {
  const { customers, bills, stations, sessions, products } = usePOS();
  const { expenses, businessSummary } = useExpenses();
  const { toast } = useToast();

  // Normalize bills once; createdAtDate is safe UTC Date
  const billsN = useMemo(() => normalizeBills(bills), [bills]);

  const [activeTab, setActiveTab] = useState('daily');
  const [chartData, setChartData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentDashboardTab, setCurrentDashboardTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    salesChange: '',
    activeSessionsCount: 0,
    newMembersCount: 0,
    lowStockCount: 0,
    lowStockItems: [] as any[]
  });

  // Expense filter states
  const [expenseCategory, setExpenseCategory] = useState<string>('all');
  const [expenseDateStart, setExpenseDateStart] = useState<Date | null>(null);
  const [expenseDateEnd, setExpenseDateEnd] = useState<Date | null>(null);

  // Vault states
  const [currentCash, setCurrentCash] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
  
  // Vault form states
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Memoized stats
  const lowStockItems = useMemo(
    () => products.filter(p => p.stock < 5).sort((a, b) => a.stock - b.stock),
    [products]
  );
  const activeSessionsCount = useMemo(
    () => stations.filter(s => s.isOccupied).length,
    [stations]
  );
  const newMembersCount = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return customers.filter(c => new Date(c.createdAt) >= today).length;
  }, [customers]);

  // Enhanced expenses filter with category and date
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];
    
    // Category filter
    if (expenseCategory !== 'all') {
      filtered = filtered.filter(expense => expense.category === expenseCategory);
    }
    
    // Date range filter
    if (expenseDateStart && expenseDateEnd) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        return isWithinInterval(expenseDate, { start: expenseDateStart, end: expenseDateEnd });
      });
    }
    
    return filtered;
  }, [expenses, expenseCategory, expenseDateStart, expenseDateEnd]);

  // Load vault data from localStorage
  useEffect(() => {
    const savedCash = localStorage.getItem('vaultCurrentCash');
    const savedOpening = localStorage.getItem('vaultOpeningBalance');
    const savedTransactions = localStorage.getItem('vaultTransactions');
    
    if (savedCash) setCurrentCash(parseFloat(savedCash));
    if (savedOpening) setOpeningBalance(parseFloat(savedOpening));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  // Save vault data to localStorage
  useEffect(() => {
    localStorage.setItem('vaultCurrentCash', currentCash.toString());
    localStorage.setItem('vaultOpeningBalance', openingBalance.toString());
    localStorage.setItem('vaultTransactions', JSON.stringify(transactions));
  }, [currentCash, openingBalance, transactions]);

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRange({ start: startDate, end: endDate });
  };

  const handleExpenseExport = () => {
    try {
      if (filteredExpenses.length === 0) {
        toast({ title: 'No Data to Export', description: 'There are no expenses matching the filters to export.', variant: 'destructive' });
        return;
      }
      const exportData = filteredExpenses.map(expense => ({
        'Date': format(new Date(expense.date), 'yyyy-MM-dd'),
        'Name': expense.name,
        'Category': expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
        'Amount': expense.amount,
        'Recurring': expense.isRecurring ? 'Yes' : 'No',
        'Frequency': expense.isRecurring ? expense.frequency : 'N/A',
        'Notes': expense.notes || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      worksheet['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
      const filename = `expenses_filtered_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);
      toast({ title: 'Export Successful', description: `Exported ${filteredExpenses.length} expenses to ${filename}` });
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast({ title: 'Export Failed', description: 'There was an error exporting the expenses. Please try again.', variant: 'destructive' });
    }
  };

  // Vault transaction handlers
  const handleAddTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (editingTransaction) {
      // Update existing transaction
      const oldTransaction = editingTransaction;
      const updatedTransaction: CashTransaction = {
        ...oldTransaction,
        type: transactionType,
        amount: parseFloat(amount),
        source: source || (transactionType === 'in' ? 'Cash In' : 'Cash Out'),
        purpose: purpose || 'General',
        notes: notes || '',
      };

      // Reverse old transaction effect
      if (oldTransaction.type === 'in') {
        setCurrentCash(currentCash - oldTransaction.amount);
      } else {
        setCurrentCash(currentCash + oldTransaction.amount);
      }

      // Apply new transaction effect
      if (transactionType === 'in') {
        setCurrentCash(currentCash - oldTransaction.amount + parseFloat(amount));
      } else {
        setCurrentCash(currentCash + oldTransaction.amount - parseFloat(amount));
      }

      setTransactions(transactions.map(t => t.id === oldTransaction.id ? updatedTransaction : t));
      toast({ title: "Transaction Updated", description: "Transaction updated successfully" });
    } else {
      // Add new transaction
      const newTransaction: CashTransaction = {
        id: Date.now().toString(),
        type: transactionType,
        amount: parseFloat(amount),
        source: source || (transactionType === 'in' ? 'Cash In' : 'Cash Out'),
        purpose: purpose || 'General',
        notes: notes || '',
        timestamp: new Date().toISOString()
      };

      setTransactions([newTransaction, ...transactions]);
      
      if (transactionType === 'in') {
        setCurrentCash(currentCash + parseFloat(amount));
      } else {
        setCurrentCash(currentCash - parseFloat(amount));
      }

      toast({ title: "Transaction Added", description: `₹${amount} ${transactionType === 'in' ? 'added to' : 'removed from'} vault` });
    }

    // Reset form
    setAmount('');
    setSource('');
    setPurpose('');
    setNotes('');
    setShowAddTransaction(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction: CashTransaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setSource(transaction.source);
    setPurpose(transaction.purpose);
    setNotes(transaction.notes);
    setShowAddTransaction(true);
  };

  const handleDeleteTransaction = (transaction: CashTransaction) => {
    // Reverse transaction effect on current cash
    if (transaction.type === 'in') {
      setCurrentCash(currentCash - transaction.amount);
    } else {
      setCurrentCash(currentCash + transaction.amount);
    }

    setTransactions(transactions.filter(t => t.id !== transaction.id));
    toast({ title: "Transaction Deleted", description: "Transaction removed from vault" });
  };

  const resetForm = () => {
    setAmount('');
    setSource('');
    setPurpose('');
    setNotes('');
    setEditingTransaction(null);
    setTransactionType('in');
  };

  // Vault insights calculations
  const todayTransactions = transactions.filter(t => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const transactionDate = format(new Date(t.timestamp), 'yyyy-MM-dd');
    return today === transactionDate;
  });

  const weekTransactions = transactions.filter(t => {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const transactionDate = new Date(t.timestamp);
    return isWithinInterval(transactionDate, { start: weekStart, end: weekEnd });
  });

  const monthTransactions = transactions.filter(t => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const transactionDate = new Date(t.timestamp);
    return isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });
  });

  const calculatePeriodTotals = (periodTransactions: CashTransaction[]) => ({
    cashIn: periodTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0),
    cashOut: periodTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0),
  });

  const todayTotals = calculatePeriodTotals(todayTransactions);
  const weekTotals = calculatePeriodTotals(weekTransactions);
  const monthTotals = calculatePeriodTotals(monthTransactions);

  // Recompute charts/stats
  useEffect(() => {
    setChartData(generateChartData());
    setDashboardStats({
      totalSales: calculateTotalSales(),
      salesChange: calculatePercentChange(),
      activeSessionsCount,
      newMembersCount,
      lowStockCount: lowStockItems.length,
      lowStockItems
    });
  }, [billsN, customers, stations, sessions, products, activeTab, activeSessionsCount, newMembersCount, lowStockItems]);

  const generateChartData = () => {
    if (activeTab === 'hourly') return generateHourlyChartData();
    if (activeTab === 'daily')  return generateDailyChartData();
    if (activeTab === 'weekly') return generateWeeklyChartData();
    return generateMonthlyChartData();
  };

  const generateHourlyChartData = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourlyTotals = new Map<number, number>();
    billsN.forEach(bill => {
      if (bill.createdAtDate >= today) {
        const h = bill.createdAtDate.getUTCHours();
        hourlyTotals.set(h, (hourlyTotals.get(h) || 0) + bill.total);
      }
    });
    return hours.map(hour => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return { name: `${hour12}${ampm}`, amount: hourlyTotals.get(hour) || 0 };
    });
  };

  const generateDailyChartData = () => {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dailyTotals = new Map<string, number>();
    billsN.forEach(bill => {
      const d = bill.createdAtDate;
      const label = days[d.getUTCDay()];
      dailyTotals.set(label, (dailyTotals.get(label) || 0) + bill.total);
    });
    return days.map(day => ({ name: day, amount: dailyTotals.get(day) || 0 }));
  };

  const generateWeeklyChartData = () => {
    const weeks: { start: Date; end: Date; label: string }[] = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i * 7 - now.getUTCDay()));
      const weekEnd   = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + 6, 23, 59, 59, 999));
      weeks.push({ start: weekStart, end: weekEnd, label: `${weekStart.getUTCMonth()+1}/${weekStart.getUTCDate()} - ${weekEnd.getUTCMonth()+1}/${weekEnd.getUTCDate()}` });
    }
    return weeks.map(w => {
      const total = billsN.reduce((sum, b) => (isBetween(b.createdAtDate, w.start, w.end) ? sum + b.total : sum), 0);
      return { name: w.label, amount: total };
    });
  };

  const generateMonthlyChartData = () => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const y = new Date().getUTCFullYear();
    const monthlyTotals = new Map<string, number>();
    billsN.forEach(bill => {
      const d = bill.createdAtDate;
      if (d.getUTCFullYear() !== y) return;
      const label = months[d.getUTCMonth()];
      monthlyTotals.set(label, (monthlyTotals.get(label) || 0) + bill.total);
    });
    return months.map(m => ({ name: m, amount: monthlyTotals.get(m) || 0 }));
  };

  const calculateTotalSales = () => {
    let startDate = new Date();
    const now = new Date();
    if (activeTab === 'hourly') {
      startDate.setUTCHours(0,0,0,0);
    } else if (activeTab === 'daily') {
      const dow = startDate.getUTCDay();
      startDate.setUTCDate(startDate.getUTCDate() - dow);
      startDate.setUTCHours(0,0,0,0);
    } else if (activeTab === 'weekly') {
      startDate = startOfMonth(now);
    } else if (activeTab === 'monthly') {
      startDate = startOfYear(now);
    }
    const total = billsN
      .filter(b => isBetween(b.createdAtDate, startDate, now))
      .reduce((sum, b) => sum + b.total, 0);
    return total;
  };

  const calculatePercentChange = () => {
    const current = calculateTotalSales();
    let previousStart = new Date();
    let previousEnd = new Date();
    let currentStart = new Date();

    if (activeTab === 'hourly') {
      currentStart.setUTCHours(0,0,0,0);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - 1);
    } else if (activeTab === 'daily') {
      const dow = currentStart.getUTCDay();
      currentStart.setUTCDate(currentStart.getUTCDate() - dow);
      currentStart.setUTCHours(0,0,0,0);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - 7);
    } else if (activeTab === 'weekly') {
      const now = new Date();
      currentStart = startOfMonth(now);
      previousEnd = new Date(currentStart);
      previousStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    } else {
      const now = new Date();
      currentStart = startOfYear(now);
      previousEnd = new Date(currentStart);
      previousStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1));
    }

    const prev = billsN
      .filter(b => b.createdAtDate >= previousStart && b.createdAtDate < previousEnd)
      .reduce((sum, b) => sum + b.total, 0);

    if (prev === 0) return current > 0 ? '+100% from last period' : 'No previous data';
    const pct = ((current - prev) / prev) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% from last period`;
  };

  const getExpenseCategories = () => {
    const categories = new Set(expenses.map(expense => expense.category));
    return Array.from(categories);
  };

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight gradient-text font-heading">Dashboard</h2>
      </div>

      <Tabs defaultValue="overview" value={currentDashboardTab} onValueChange={setCurrentDashboardTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="w-auto">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
            <TabsTrigger value="vault" className="flex-1">Vault</TabsTrigger>
          </TabsList>

          {/* Enhanced Expense Filters */}
          {currentDashboardTab === 'expenses' && (
            <div className="flex items-center space-x-4">
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getExpenseCategories().map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-40">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expenseDateStart && expenseDateEnd 
                      ? `${format(expenseDateStart, 'MMM dd')} - ${format(expenseDateEnd, 'MMM dd')}`
                      : "Date Range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Calendar
                        mode="single"
                        selected={expenseDateStart}
                        onSelect={setExpenseDateStart}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Calendar
                        mode="single"
                        selected={expenseDateEnd}
                        onSelect={setExpenseDateEnd}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => {
                        setExpenseDateStart(null);
                        setExpenseDateEnd(null);
                      }}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button onClick={handleExpenseExport}>
                Export Filtered
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="overview" className="space-y-6">
          <StatCardSection
            totalSales={dashboardStats.totalSales}
            salesChange={dashboardStats.salesChange}
            activeSessionsCount={dashboardStats.activeSessionsCount}
            totalStations={stations.length}
            customersCount={customers.length}
            newMembersCount={dashboardStats.newMembersCount}
            lowStockCount={dashboardStats.lowStockCount}
            lowStockItems={dashboardStats.lowStockItems}
          />
          <ActionButtonSection />
          <SalesChart data={chartData} activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <ActiveSessions />
            <RecentTransactions bills={bills} customers={customers} />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <CustomerSpendingCorrelation />
            <HourlyRevenueDistribution />
          </div>
          <ProductPerformance />
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <CustomerActivityChart />
            <ProductInventoryChart />
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <BusinessSummarySection filteredExpenses={filteredExpenses} dateRange={dateRange} />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Filtered Expenses ({filteredExpenses.length})
              </h3>
              <div className="text-sm text-muted-foreground">
                {expenseCategory !== 'all' && `Category: ${expenseCategory} • `}
                {expenseDateStart && expenseDateEnd && `${format(expenseDateStart, 'MMM dd')} - ${format(expenseDateEnd, 'MMM dd')}`}
              </div>
            </div>
            {filteredExpenses.length > 0 ? (
              <FilteredExpenseList expenses={filteredExpenses} />
            ) : (
              <ExpenseList />
            )}
          </div>
        </TabsContent>

        <TabsContent value="vault" className="space-y-6">
          {/* Vault Insights Widgets */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Cash</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">₹{currentCash.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Available in vault</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(todayTotals.cashIn - todayTotals.cashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{(todayTotals.cashIn - todayTotals.cashOut).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Net change today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(weekTotals.cashIn - weekTotals.cashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{(weekTotals.cashIn - weekTotals.cashOut).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Net change this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(monthTotals.cashIn - monthTotals.cashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{(monthTotals.cashIn - monthTotals.cashOut).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Net change this month</p>
              </CardContent>
            </Card>
          </div>

          {/* Simple Cash Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Quick Actions
                <Dialog open={showAddTransaction} onOpenChange={(open) => {
                  setShowAddTransaction(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>Add Transaction</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingTransaction ? 'Edit Transaction' : 'Add Cash Transaction'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Type</label>
                          <Select value={transactionType} onValueChange={(value: 'in' | 'out') => setTransactionType(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in">Cash In</SelectItem>
                              <SelectItem value="out">Cash Out</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Amount</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">
                          {transactionType === 'in' ? 'Source' : 'Purpose'}
                        </label>
                        <Select value={transactionType === 'in' ? source : purpose} 
                               onValueChange={(value) => transactionType === 'in' ? setSource(value) : setPurpose(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${transactionType === 'in' ? 'source' : 'purpose'}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {transactionType === 'in' ? (
                              <>
                                <SelectItem value="Customer Payment">Customer Payment</SelectItem>
                                <SelectItem value="Bank Withdrawal">Bank Withdrawal</SelectItem>
                                <SelectItem value="Other Income">Other Income</SelectItem>
                                <SelectItem value="Change Fund">Change Fund</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="Bank Deposit">Bank Deposit</SelectItem>
                                <SelectItem value="Expenses">Expenses</SelectItem>
                                <SelectItem value="Petty Cash">Petty Cash</SelectItem>
                                <SelectItem value="Supplies">Supplies</SelectItem>
                                <SelectItem value="Utilities">Utilities</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Notes (Optional)</label>
                        <Textarea
                          placeholder="Add any additional notes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button onClick={handleAddTransaction} className="flex-1">
                          {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setShowAddTransaction(false);
                          resetForm();
                        }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <Button variant="outline" onClick={() => {
                  setTransactionType('out');
                  setPurpose('Bank Deposit');
                  setShowAddTransaction(true);
                }}>
                  Bank Deposit
                </Button>
                <Button variant="outline" onClick={() => {
                  setTransactionType('out');
                  setPurpose('Expenses');
                  setShowAddTransaction(true);
                }}>
                  Cash Out
                </Button>
                <Button variant="outline" onClick={() => {
                  setTransactionType('in');
                  setSource('Customer Payment');
                  setShowAddTransaction(true);
                }}>
                  Cash In
                </Button>
                <Button variant="outline" onClick={() => {
                  setOpeningBalance(currentCash);
                  toast({ title: "Opening Balance Set", description: `Set to ₹${currentCash}` });
                }}>
                  Set Opening
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History with Edit/Delete */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions recorded</p>
                ) : (
                  transactions.slice(0, 20).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={transaction.type === 'in' ? 'default' : 'secondary'}>
                            {transaction.type === 'in' ? 'IN' : 'OUT'}
                          </Badge>
                          <span className="font-medium">
                            {transaction.type === 'in' ? transaction.source : transaction.purpose}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(transaction.timestamp), 'dd MMM yyyy, hh:mm a')}
                        </p>
                        {transaction.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{transaction.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`text-lg font-semibold ${transaction.type === 'in' ? 'text-green-500' : 'text-red-500'}`}>
                          {transaction.type === 'in' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this transaction? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTransaction(transaction)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Period Summaries */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Today's Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-500">Cash In:</span>
                    <span className="font-semibold">₹{todayTotals.cashIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500">Cash Out:</span>
                    <span className="font-semibold">₹{todayTotals.cashOut.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Net:</span>
                    <span className={`${(todayTotals.cashIn - todayTotals.cashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{(todayTotals.cashIn - todayTotals.cashOut).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{todayTransactions.length} transactions</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-500">Cash In:</span>
                    <span className="font-semibold">₹{weekTotals.cashIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500">Cash Out:</span>
                    <span className="font-semibold">₹{weekTotals.cashOut.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Net:</span>
                    <span className={`${(weekTotals.cashIn - weekTotals.cashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{(weekTotals.cashIn - weekTotals.cashOut).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{weekTransactions.length} transactions</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-green-500">Cash In:</span>
                    <span className="font-semibold">₹{monthTotals.cashIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500">Cash Out:</span>
                    <span className="font-semibold">₹{monthTotals.cashOut.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Net:</span>
                    <span className={`${(monthTotals.cashIn - monthTotals.cashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{(monthTotals.cashIn - monthTotals.cashOut).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{monthTransactions.length} transactions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
