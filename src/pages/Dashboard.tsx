// Dashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { isWithinInterval, format, startOfMonth, endOfMonth, startOfYear, subMonths, subDays } from 'date-fns';
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
import { Calendar, TrendingUp, TrendingDown, DollarSign, PiggyBank, ArrowUpCircle, ArrowDownCircle, Filter, BarChart3, PieChart, Target, AlertTriangle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { normalizeBills, isBetween } from '@/lib/date';

interface CashTransaction {
  id: string;
  type: 'in' | 'out';
  amount: number;
  source: string;
  purpose: string;
  notes: string;
  timestamp: string;
}

interface ExpenseFilters {
  dateRange: { start: Date; end: Date } | null;
  categories: string[];
  amountRange: { min: number | null; max: number | null };
  recurringOnly: boolean | null;
  searchTerm: string;
}

const Dashboard = () => {
  const { customers, bills, stations, sessions, products } = usePOS();
  const { expenses, businessSummary } = useExpenses();
  const { toast } = useToast();

  // Normalize bills once; createdAtDate is safe UTC Date
  const billsN = useMemo(() => normalizeBills(bills), [bills]);

  const [activeTab, setActiveTab] = useState('daily');
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentDashboardTab, setCurrentDashboardTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    salesChange: '',
    activeSessionsCount: 0,
    newMembersCount: 0,
    lowStockCount: 0,
    lowStockItems: [] as any[]
  });

  // Cash Vault States
  const [currentCash, setCurrentCash] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [vaultActiveTab, setVaultActiveTab] = useState('overview');
  
  // Cash Form states
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Expense States
  const [expenseActiveTab, setExpenseActiveTab] = useState('overview');
  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>({
    dateRange: null,
    categories: [],
    amountRange: { min: null, max: null },
    recurringOnly: null,
    searchTerm: ''
  });
  const [showExpenseFilters, setShowExpenseFilters] = useState(false);

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

  // Load cash vault data from localStorage
  useEffect(() => {
    const savedCash = localStorage.getItem('vaultCurrentCash');
    const savedOpening = localStorage.getItem('vaultOpeningBalance');
    const savedTransactions = localStorage.getItem('vaultTransactions');
    
    if (savedCash) setCurrentCash(parseFloat(savedCash));
    if (savedOpening) setOpeningBalance(parseFloat(savedOpening));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  // Save cash vault data to localStorage
  useEffect(() => {
    localStorage.setItem('vaultCurrentCash', currentCash.toString());
    localStorage.setItem('vaultOpeningBalance', openingBalance.toString());
    localStorage.setItem('vaultTransactions', JSON.stringify(transactions));
  }, [currentCash, openingBalance, transactions]);

  // Cash vault calculations
  const todayTransactions = useMemo(() => transactions.filter(t => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const transactionDate = format(new Date(t.timestamp), 'yyyy-MM-dd');
    return today === transactionDate;
  }), [transactions]);

  const weekTransactions = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return transactions.filter(t => new Date(t.timestamp) >= weekStart);
  }, [transactions]);

  const monthTransactions = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return transactions.filter(t => new Date(t.timestamp) >= monthStart);
  }, [transactions]);

  const todayCashIn = todayTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
  const todayCashOut = todayTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
  const weekCashIn = weekTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
  const weekCashOut = weekTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
  const monthCashIn = monthTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
  const monthCashOut = monthTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);

  // Enhanced Expense filtering and analytics
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];
    
    // Date range filter
    if (expenseFilters.dateRange) {
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        return isWithinInterval(expenseDate, { 
          start: expenseFilters.dateRange!.start, 
          end: expenseFilters.dateRange!.end 
        });
      });
    }
    
    // Category filter
    if (expenseFilters.categories.length > 0) {
      filtered = filtered.filter(expense => 
        expenseFilters.categories.includes(expense.category)
      );
    }
    
    // Amount range filter
    if (expenseFilters.amountRange.min !== null) {
      filtered = filtered.filter(expense => expense.amount >= expenseFilters.amountRange.min!);
    }
    if (expenseFilters.amountRange.max !== null) {
      filtered = filtered.filter(expense => expense.amount <= expenseFilters.amountRange.max!);
    }
    
    // Recurring filter
    if (expenseFilters.recurringOnly !== null) {
      filtered = filtered.filter(expense => expense.isRecurring === expenseFilters.recurringOnly);
    }
    
    // Search term filter
    if (expenseFilters.searchTerm) {
      filtered = filtered.filter(expense => 
        expense.name.toLowerCase().includes(expenseFilters.searchTerm.toLowerCase()) ||
        (expense.notes && expense.notes.toLowerCase().includes(expenseFilters.searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  }, [expenses, expenseFilters]);

  // Expense Analytics
  const expenseAnalytics = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categories = Array.from(new Set(expenses.map(exp => exp.category)));
    
    const categoryBreakdown = categories.map(category => {
      const categoryExpenses = filteredExpenses.filter(exp => exp.category === category);
      const amount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
        count: categoryExpenses.length,
        percentage: totalAmount > 0 ? (amount / totalAmount * 100) : 0
      };
    }).sort((a, b) => b.amount - a.amount);

    // Monthly trends
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
      });
      monthlyTrends.push({
        month: format(date, 'MMM yyyy'),
        amount: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        count: monthExpenses.length
      });
    }

    // Budget vs Actual (assuming a monthly budget)
    const monthlyBudget = businessSummary?.budget || 50000; // Default budget
    const currentMonthExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }).reduce((sum, exp) => sum + exp.amount, 0);

    const budgetUsage = monthlyBudget > 0 ? (currentMonthExpenses / monthlyBudget * 100) : 0;

    // Top spenders and high-value expenses
    const highValueExpenses = filteredExpenses
      .filter(exp => exp.amount > 1000)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Recurring vs One-time
    const recurringExpenses = filteredExpenses.filter(exp => exp.isRecurring);
    const oneTimeExpenses = filteredExpenses.filter(exp => !exp.isRecurring);
    const recurringTotal = recurringExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const oneTimeTotal = oneTimeExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      totalAmount,
      categoryBreakdown,
      monthlyTrends,
      budgetUsage,
      monthlyBudget,
      currentMonthExpenses,
      highValueExpenses,
      recurringTotal,
      oneTimeTotal,
      averageExpense: filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0
    };
  }, [filteredExpenses, expenses, businessSummary]);

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setExpenseFilters(prev => ({
      ...prev,
      dateRange: { start: startDate, end: endDate }
    }));
  };

  const handleExport = () => {
    try {
      if (filteredExpenses.length === 0) {
        toast({ title: 'No Data to Export', description: 'There are no expenses in the selected filters to export.', variant: 'destructive' });
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
      const filename = expenseFilters.dateRange
        ? `expenses_${format(expenseFilters.dateRange.start, 'yyyy-MM-dd')}_to_${format(expenseFilters.dateRange.end, 'yyyy-MM-dd')}.xlsx`
        : `expenses_filtered_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);
      toast({ title: 'Export Successful', description: `Exported ${filteredExpenses.length} expenses to ${filename}` });
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast({ title: 'Export Failed', description: 'There was an error exporting the expenses. Please try again.', variant: 'destructive' });
    }
  };

  // Cash vault functions
  const handleAddTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

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

    // Reset form
    setAmount('');
    setSource('');
    setPurpose('');
    setNotes('');
    setShowAddTransaction(false);
    
    toast({ title: "Transaction Added", description: `₹${amount} ${transactionType === 'in' ? 'added to' : 'removed from'} vault` });
  };

  const handleSetOpeningBalance = () => {
    setOpeningBalance(currentCash);
    toast({ title: "Opening Balance Set", description: `Opening balance set to ₹${currentCash}` });
  };

  const clearExpenseFilters = () => {
    setExpenseFilters({
      dateRange: null,
      categories: [],
      amountRange: { min: null, max: null },
      recurringOnly: null,
      searchTerm: ''
    });
  };

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

  // Cash Vault Charts Data
  const generateCashFlowChartData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.timestamp);
        return tDate.toDateString() === date.toDateString();
      });
      const cashIn = dayTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
      const cashOut = dayTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
      
      last7Days.push({
        name: format(date, 'MMM dd'),
        cashIn,
        cashOut,
        net: cashIn - cashOut
      });
    }
    return last7Days;
  };

  const cashFlowData = generateCashFlowChartData();

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
          {/* Enhanced Expense Dashboard */}
          <Tabs defaultValue="overview" value={expenseActiveTab} onValueChange={setExpenseActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="w-auto">
                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1">Transactions</TabsTrigger>
              </TabsList>
              <div className="flex space-x-2">
                <Dialog open={showExpenseFilters} onOpenChange={setShowExpenseFilters}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(expenseFilters.categories.length > 0 || 
                        expenseFilters.dateRange || 
                        expenseFilters.amountRange.min || 
                        expenseFilters.amountRange.max || 
                        expenseFilters.recurringOnly !== null ||
                        expenseFilters.searchTerm) && (
                        <Badge className="ml-2 h-2 w-2 p-0" />
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Expense Filters</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Search</label>
                        <Input
                          placeholder="Search expenses..."
                          value={expenseFilters.searchTerm}
                          onChange={(e) => setExpenseFilters(prev => ({
                            ...prev,
                            searchTerm: e.target.value
                          }))}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Categories</label>
                        <Select 
                          value={expenseFilters.categories.join(',')}
                          onValueChange={(value) => {
                            const categories = value ? value.split(',') : [];
                            setExpenseFilters(prev => ({
                              ...prev,
                              categories
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select categories" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from(new Set(expenses.map(exp => exp.category))).map(category => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm font-medium">Min Amount</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={expenseFilters.amountRange.min || ''}
                            onChange={(e) => setExpenseFilters(prev => ({
                              ...prev,
                              amountRange: {
                                ...prev.amountRange,
                                min: e.target.value ? parseFloat(e.target.value) : null
                              }
                            }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Max Amount</label>
                          <Input
                            type="number"
                            placeholder="∞"
                            value={expenseFilters.amountRange.max || ''}
                            onChange={(e) => setExpenseFilters(prev => ({
                              ...prev,
                              amountRange: {
                                ...prev.amountRange,
                                max: e.target.value ? parseFloat(e.target.value) : null
                              }
                            }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Type</label>
                        <Select 
                          value={expenseFilters.recurringOnly === null ? 'all' : expenseFilters.recurringOnly ? 'recurring' : 'one-time'}
                          onValueChange={(value) => {
                            let recurringOnly = null;
                            if (value === 'recurring') recurringOnly = true;
                            if (value === 'one-time') recurringOnly = false;
                            setExpenseFilters(prev => ({
                              ...prev,
                              recurringOnly
                            }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Expenses</SelectItem>
                            <SelectItem value="recurring">Recurring Only</SelectItem>
                            <SelectItem value="one-time">One-time Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex space-x-2">
                        <Button onClick={() => setShowExpenseFilters(false)} className="flex-1">
                          Apply Filters
                        </Button>
                        <Button variant="outline" onClick={clearExpenseFilters}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleExport}>
                  Export
                </Button>
              </div>
            </div>

            <TabsContent value="overview" className="space-y-6">
              {/* Expense Overview Stats */}
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{expenseAnalytics.totalAmount.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">{filteredExpenses.length} expenses</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{expenseAnalytics.budgetUsage.toFixed(1)}%</div>
                    <div className="w-full bg-secondary rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          expenseAnalytics.budgetUsage > 90 ? 'bg-red-500' :
                          expenseAnalytics.budgetUsage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(expenseAnalytics.budgetUsage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ₹{expenseAnalytics.currentMonthExpenses.toFixed(0)} / ₹{expenseAnalytics.monthlyBudget.toFixed(0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{expenseAnalytics.averageExpense.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Per transaction</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">High-Value Expenses</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{expenseAnalytics.highValueExpenses.length}</div>
                    <p className="text-xs text-muted-foreground">Above ₹1,000</p>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChart className="h-4 w-4" />
                      <span>Expense Categories</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {expenseAnalytics.categoryBreakdown.slice(0, 5).map((category, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{category.category}</span>
                            <span className="text-sm">₹{category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress value={category.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recurring vs One-time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-blue-500">Recurring Expenses</span>
                          <span className="text-sm">₹{expenseAnalytics.recurringTotal.toFixed(2)}</span>
                        </div>
                        <Progress 
                          value={expenseAnalytics.totalAmount > 0 ? (expenseAnalytics.recurringTotal / expenseAnalytics.totalAmount * 100) : 0} 
                          className="h-2" 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-green-500">One-time Expenses</span>
                          <span className="text-sm">₹{expenseAnalytics.oneTimeTotal.toFixed(2)}</span>
                        </div>
                        <Progress 
                          value={expenseAnalytics.totalAmount > 0 ? (expenseAnalytics.oneTimeTotal / expenseAnalytics.totalAmount * 100) : 0} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent High-Value Expenses */}
              {expenseAnalytics.highValueExpenses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>High-Value Expenses (Above ₹1,000)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {expenseAnalytics.highValueExpenses.slice(0, 5).map((expense, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">{expense.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} • 
                              {format(new Date(expense.date), 'dd MMM yyyy')}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-lg">
                            ₹{expense.amount.toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Expense Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {expenseAnalytics.monthlyTrends.map((month, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{month.month}</span>
                          <span className="text-sm">₹{month.amount.toFixed(2)} ({month.count} expenses)</span>
                        </div>
                        <Progress 
                          value={Math.max(...expenseAnalytics.monthlyTrends.map(m => m.amount)) > 0 ? 
                            (month.amount / Math.max(...expenseAnalytics.monthlyTrends.map(m => m.amount)) * 100) : 0
                          } 
                          className="h-2" 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Category Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenseAnalytics.categoryBreakdown.map((category, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{category.category}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({category.count} expenses)
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">₹{category.amount.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <Progress value={category.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              <BusinessSummarySection filteredExpenses={filteredExpenses} dateRange={expenseFilters.dateRange} />
              
              {/* Filtered Expenses List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Filtered Expenses 
                    <Badge variant="outline">{filteredExpenses.length} results</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredExpenses.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No expenses match the current filters</p>
                    ) : (
                      filteredExpenses.map((expense) => (
                        <div key={expense.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{expense.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                              </Badge>
                              {expense.isRecurring && (
                                <Badge variant="secondary" className="text-xs">
                                  Recurring
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(expense.date), 'dd MMM yyyy')}
                            </p>
                            {expense.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{expense.notes}</p>
                            )}
                          </div>
                          <div className="text-lg font-semibold text-red-500">
                            ₹{expense.amount.toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="vault" className="space-y-6">
          {/* Vault Dashboard */}
          <Tabs defaultValue="overview" value={vaultActiveTab} onValueChange={setVaultActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="w-auto">
                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1">Transactions</TabsTrigger>
                <TabsTrigger value="insights" className="flex-1">Insights</TabsTrigger>
              </TabsList>
              <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
                <DialogTrigger asChild>
                  <Button>Add Transaction</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Cash Transaction</DialogTitle>
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
                              <SelectItem value="Loan/Advance">Loan/Advance</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Bank Deposit">Bank Deposit</SelectItem>
                              <SelectItem value="Expenses">Expenses</SelectItem>
                              <SelectItem value="Petty Cash">Petty Cash</SelectItem>
                              <SelectItem value="Supplies">Supplies</SelectItem>
                              <SelectItem value="Utilities">Utilities</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
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
                        Add Transaction
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddTransaction(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value="overview" className="space-y-6">
              {/* Current Status Cards */}
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current Cash</CardTitle>
                    <PiggyBank className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">₹{currentCash.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Total available cash</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's In</CardTitle>
                    <ArrowUpCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">₹{todayCashIn.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">{todayTransactions.filter(t => t.type === 'in').length} transactions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today's Out</CardTitle>
                    <ArrowDownCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">₹{todayCashOut.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">{todayTransactions.filter(t => t.type === 'out').length} transactions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Change</CardTitle>
                    {(todayCashIn - todayCashOut) >= 0 ? 
                      <TrendingUp className="h-4 w-4 text-green-500" /> : 
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    }
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(todayCashIn - todayCashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{(todayCashIn - todayCashOut).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">Today's impact</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-5">
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
                      Record Expense
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setTransactionType('in');
                      setSource('Customer Payment');
                      setShowAddTransaction(true);
                    }}>
                      Cash In
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setTransactionType('in');
                      setSource('Bank Withdrawal');
                      setShowAddTransaction(true);
                    }}>
                      Add from Bank
                    </Button>
                    <Button variant="outline" onClick={handleSetOpeningBalance}>
                      Set Opening Balance
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Period Summaries */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Today</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-500">Cash In:</span>
                      <span className="font-medium">₹{todayCashIn.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-red-500">Cash Out:</span>
                      <span className="font-medium">₹{todayCashOut.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Net:</span>
                      <span className={`font-bold ${(todayCashIn - todayCashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{(todayCashIn - todayCashOut).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>This Week</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-500">Cash In:</span>
                      <span className="font-medium">₹{weekCashIn.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-red-500">Cash Out:</span>
                      <span className="font-medium">₹{weekCashOut.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Net:</span>
                      <span className={`font-bold ${(weekCashIn - weekCashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{(weekCashIn - weekCashOut).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>This Month</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-500">Cash In:</span>
                      <span className="font-medium">₹{monthCashIn.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-red-500">Cash Out:</span>
                      <span className="font-medium">₹{monthCashOut.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Net:</span>
                      <span className={`font-bold ${(monthCashIn - monthCashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{(monthCashIn - monthCashOut).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-6">
              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No transactions recorded</p>
                    ) : (
                      transactions.map((transaction) => (
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
                          <div className={`text-lg font-semibold ${transaction.type === 'in' ? 'text-green-500' : 'text-red-500'}`}>
                            {transaction.type === 'in' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              {/* Cash Flow Insights */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Sources (This Month)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.from(new Set(monthTransactions.filter(t => t.type === 'in').map(t => t.source)))
                        .map(source => {
                          const amount = monthTransactions
                            .filter(t => t.type === 'in' && t.source === source)
                            .reduce((sum, t) => sum + t.amount, 0);
                          const percentage = monthCashIn > 0 ? (amount / monthCashIn * 100).toFixed(1) : '0';
                          return (
                            <div key={source} className="flex justify-between items-center">
                              <span className="text-sm">{source}</span>
                              <div className="text-right">
                                <Badge variant="outline">₹{amount.toFixed(2)}</Badge>
                                <p className="text-xs text-muted-foreground">{percentage}%</p>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Expense Categories (This Month)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.from(new Set(monthTransactions.filter(t => t.type === 'out').map(t => t.purpose)))
                        .map(purpose => {
                          const amount = monthTransactions
                            .filter(t => t.type === 'out' && t.purpose === purpose)
                            .reduce((sum, t) => sum + t.amount, 0);
                          const percentage = monthCashOut > 0 ? (amount / monthCashOut * 100).toFixed(1) : '0';
                          return (
                            <div key={purpose} className="flex justify-between items-center">
                              <span className="text-sm">{purpose}</span>
                              <div className="text-right">
                                <Badge variant="outline">₹{amount.toFixed(2)}</Badge>
                                <p className="text-xs text-muted-foreground">{percentage}%</p>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cash Flow Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>7-Day Cash Flow Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cashFlowData.map((day, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{day.name}</span>
                          <span className={day.net >= 0 ? 'text-green-500' : 'text-red-500'}>
                            ₹{day.net.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-green-100 rounded p-2">
                            <p className="text-xs text-green-800">In: ₹{day.cashIn.toFixed(2)}</p>
                          </div>
                          <div className="bg-red-100 rounded p-2">
                            <p className="text-xs text-red-800">Out: ₹{day.cashOut.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Average Daily Cash In</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      ₹{transactions.length > 0 ? (monthCashIn / 30).toFixed(2) : '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground">Based on 30-day average</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Daily Cash Out</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      ₹{transactions.length > 0 ? (monthCashOut / 30).toFixed(2) : '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground">Based on 30-day average</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cash Velocity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {transactions.length > 0 ? ((monthCashIn + monthCashOut) / Math.max(currentCash, 1)).toFixed(1) : '0.0'}x
                    </div>
                    <p className="text-xs text-muted-foreground">Monthly turnover rate</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
