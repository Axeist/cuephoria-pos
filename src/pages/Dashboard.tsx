// Dashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { isWithinInterval, format, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
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
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { normalizeBills, isBetween } from '@/lib/date';
import { Edit2, Trash2, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

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

  // Vault States
  const [currentCash, setCurrentCash] = useState(0);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
  
  // Form states
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

  // Load vault data from localStorage on component mount
  useEffect(() => {
    const savedCash = localStorage.getItem('vaultCurrentCash');
    const savedOpening = localStorage.getItem('vaultOpeningBalance');
    const savedTransactions = localStorage.getItem('vaultTransactions');
    
    if (savedCash) setCurrentCash(parseFloat(savedCash));
    if (savedOpening) setOpeningBalance(parseFloat(savedOpening));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
  }, []);

  // Save vault data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('vaultCurrentCash', currentCash.toString());
    localStorage.setItem('vaultOpeningBalance', openingBalance.toString());
    localStorage.setItem('vaultTransactions', JSON.stringify(transactions));
  }, [currentCash, openingBalance, transactions]);

  // Expenses date filter
  const filteredExpenses = useMemo(() => {
    if (!dateRange) return expenses;
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [expenses, dateRange]);

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRange({ start: startDate, end: endDate });
  };

  const handleExport = () => {
    try {
      if (filteredExpenses.length === 0) {
        toast({ title: 'No Data to Export', description: 'There are no expenses in the selected date range to export.', variant: 'destructive' });
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
      const filename = dateRange
        ? `expenses_${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}.xlsx`
        : `expenses_all_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, filename);
      toast({ title: 'Export Successful', description: `Exported ${filteredExpenses.length} expenses to ${filename}` });
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast({ title: 'Export Failed', description: 'There was an error exporting the expenses. Please try again.', variant: 'destructive' });
    }
  };

  // Vault Functions
  const handleAddTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const transactionData = {
      id: editingTransaction?.id || Date.now().toString(),
      type: transactionType,
      amount: parseFloat(amount),
      source: source || (transactionType === 'in' ? 'Cash In' : 'Cash Out'),
      purpose: purpose || 'General',
      notes: notes || '',
      timestamp: editingTransaction?.timestamp || new Date().toISOString()
    };

    if (editingTransaction) {
      // Update existing transaction
      const oldAmount = editingTransaction.amount;
      const oldType = editingTransaction.type;
      
      // Reverse old transaction effect
      if (oldType === 'in') {
        setCurrentCash(prev => prev - oldAmount);
      } else {
        setCurrentCash(prev => prev + oldAmount);
      }
      
      // Apply new transaction effect
      if (transactionType === 'in') {
        setCurrentCash(prev => prev + parseFloat(amount));
      } else {
        setCurrentCash(prev => prev - parseFloat(amount));
      }

      setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? transactionData : t));
      toast({ title: "Transaction Updated", description: "Transaction has been updated successfully" });
    } else {
      // Add new transaction
      setTransactions(prev => [transactionData, ...prev]);
      
      if (transactionType === 'in') {
        setCurrentCash(prev => prev + parseFloat(amount));
      } else {
        setCurrentCash(prev => prev - parseFloat(amount));
      }
      toast({ title: "Transaction Added", description: `₹${amount} ${transactionType === 'in' ? 'added to' : 'removed from'} vault` });
    }

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setAmount('');
    setSource('');
    setPurpose('');
    setNotes('');
    setEditingTransaction(null);
    setShowAddTransaction(false);
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
      setCurrentCash(prev => prev - transaction.amount);
    } else {
      setCurrentCash(prev => prev + transaction.amount);
    }

    setTransactions(prev => prev.filter(t => t.id !== transaction.id));
    toast({ title: "Transaction Deleted", description: "Transaction has been removed" });
  };

  const handleSetOpeningBalance = () => {
    setOpeningBalance(currentCash);
    toast({ title: "Opening Balance Set", description: `Opening balance set to ₹${currentCash}` });
  };

  // Vault Analytics
  const todayTransactions = transactions.filter(t => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const transactionDate = format(new Date(t.timestamp), 'yyyy-MM-dd');
    return today === transactionDate;
  });

  const weekTransactions = transactions.filter(t => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.timestamp) >= weekAgo;
  });

  const todayCashIn = todayTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
  const todayCashOut = todayTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
  const weekCashIn = weekTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
  const weekCashOut = weekTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);

  const mostCommonSource = transactions
    .filter(t => t.type === 'in')
    .reduce((acc: any, t) => {
      acc[t.source] = (acc[t.source] || 0) + 1;
      return acc;
    }, {});

  const mostCommonPurpose = transactions
    .filter(t => t.type === 'out')
    .reduce((acc: any, t) => {
      acc[t.purpose] = (acc[t.purpose] || 0) + 1;
      return acc;
    }, {});

  const topSource = Object.keys(mostCommonSource).length > 0 
    ? Object.keys(mostCommonSource).reduce((a, b) => mostCommonSource[a] > mostCommonSource[b] ? a : b)
    : 'No data';

  const topPurpose = Object.keys(mostCommonPurpose).length > 0
    ? Object.keys(mostCommonPurpose).reduce((a, b) => mostCommonPurpose[a] > mostCommonPurpose[b] ? a : b)
    : 'No data';

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
          {currentDashboardTab === 'expenses' && (
            <ExpenseDateFilter onDateRangeChange={handleDateRangeChange} onExport={handleExport} />
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
          {dateRange ? <FilteredExpenseList startDate={dateRange.start} endDate={dateRange.end} /> : <ExpenseList />}
        </TabsContent>

        <TabsContent value="vault" className="space-y-6">
          {/* Vault Insights Widgets */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Cash</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">₹{currentCash.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Available in vault</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Net</CardTitle>
                {(todayCashIn - todayCashOut) >= 0 ? 
                  <TrendingUp className="h-4 w-4 text-green-500" /> : 
                  <TrendingDown className="h-4 w-4 text-red-500" />
                }
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(todayCashIn - todayCashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{(todayCashIn - todayCashOut).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  In: ₹{todayCashIn} | Out: ₹{todayCashOut}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Week Total</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">₹{(weekCashIn - weekCashOut).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">7-day net change</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <Badge variant="secondary">{todayTransactions.length}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <p className="text-xs text-muted-foreground">Total recorded</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Quick Actions
                <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {setEditingTransaction(null); resetForm();}}>
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTransaction ? 'Edit' : 'Add'} Cash Transaction</DialogTitle>
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
                        <Select 
                          value={transactionType === 'in' ? source : purpose} 
                          onValueChange={(value) => transactionType === 'in' ? setSource(value) : setPurpose(value)}
                        >
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
                          {editingTransaction ? 'Update' : 'Add'} Transaction
                        </Button>
                        <Button variant="outline" onClick={resetForm}>
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
                  setTransactionType('in');
                  setSource('Customer Payment');
                  setShowAddTransaction(true);
                }}>
                  Cash In
                </Button>
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
                  Expense
                </Button>
                <Button variant="outline" onClick={handleSetOpeningBalance}>
                  Set Opening Balance
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Most Common Cash Source:</span>
                  <Badge variant="outline">{topSource}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Most Common Purpose:</span>
                  <Badge variant="outline">{topPurpose}</Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Opening Balance:</span>
                    <span className="text-sm font-medium">₹{openingBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Current Balance:</span>
                    <span className="text-sm font-medium">₹{currentCash.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Net Change:</span>
                    <span className={`text-sm font-medium ${(currentCash - openingBalance) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{(currentCash - openingBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-500">₹{weekCashIn.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Cash In</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-500">₹{weekCashOut.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Cash Out</p>
                  </div>
                </div>
                <Separator />
                <div className="text-center">
                  <p className={`text-xl font-bold ${(weekCashIn - weekCashOut) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{(weekCashIn - weekCashOut).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Net Weekly Change</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min((weekCashIn / (weekCashIn + weekCashOut)) * 100, 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  In: {((weekCashIn / (weekCashIn + weekCashOut)) * 100 || 0).toFixed(1)}% | 
                  Out: {((weekCashOut / (weekCashIn + weekCashOut)) * 100 || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions recorded</p>
                ) : (
                  transactions.slice(0, 20).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
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
                      <div className="flex items-center space-x-2">
                        <div className={`text-lg font-semibold ${transaction.type === 'in' ? 'text-green-500' : 'text-red-500'}`}>
                          {transaction.type === 'in' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
