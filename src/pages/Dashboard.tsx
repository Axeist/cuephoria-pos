import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { isWithinInterval, format, startOfMonth, startOfYear } from 'date-fns';
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
import CashManagement from '@/components/cash/CashManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { normalizeBills, isBetween } from '@/lib/date';
import { useIsMobile } from '@/hooks/use-mobile';

const Dashboard = () => {
  const { customers, bills, stations, sessions, products } = usePOS();
  const { expenses, businessSummary } = useExpenses();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const billsN = useMemo(() => normalizeBills(bills), [bills]);

  const [activeTab, setActiveTab] = useState<'hourly'|'daily'|'weekly'|'monthly'>('daily');
  const [chartData, setChartData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentDashboardTab, setCurrentDashboardTab] = useState<'overview'|'analytics'|'expenses'|'cash'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string|null>(null); // NEW
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    salesChange: '',
    activeSessionsCount: 0,
    newMembersCount: 0,
    lowStockCount: 0,
    lowStockItems: [] as any[]
  });

  // Filter out complimentary bills
  const paidBills = useMemo(
    () => billsN.filter(bill => bill.paymentMethod !== 'complimentary'),
    [billsN]
  );

  const lowStockItems = useMemo(
    () => products.filter(p => p.stock < 5).sort((a, b) => a.stock - b.stock),
    [products]
  );

  const activeSessionsCount = useMemo(
    () => stations.filter(s => s.isOccupied).length,
    [stations]
  );

  const newMembersCount = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return customers.filter(c => new Date(c.createdAt) >= today).length;
  }, [customers]);

  const filteredExpenses = useMemo(() => {
    if (!dateRange) return expenses;
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [expenses, dateRange]);

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRange({ start: startDate, end: endDate });
    setSelectedCategory(null); // reset category filter when date range changes
  };

  const handleExport = () => {
    try {
      const list = filteredExpenses;
      if (list.length === 0) {
        toast({
          title: 'No Data to Export',
          description: 'There are no expenses in the selected date range to export.',
          variant: 'destructive'
        });
        return;
      }

      const exportData = list.map(expense => ({
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
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 15 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

      const filename = dateRange
        ? `expenses_${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}.xlsx`
        : `expenses_all_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      saveAs(blob, filename);

      toast({
        title: 'Export Successful',
        description: `Exported ${list.length} expenses to ${filename}`
      });
    } catch (error) {
      console.error('Error exporting expenses:', error);
      toast({
        title: 'Export Failed',
        description: 'There was an error exporting the expenses. Please try again.',
        variant: 'destructive'
      });
    }
  };

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
  }, [paidBills, customers, stations, sessions, products, activeTab, activeSessionsCount, newMembersCount, lowStockItems]);

  const generateChartData = () => {
    if (activeTab === 'hourly') return generateHourlyChartData();
    if (activeTab === 'daily')  return generateDailyChartData();
    if (activeTab === 'weekly') return generateWeeklyChartData();
    return generateMonthlyChartData();
  };

  const generateHourlyChartData = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourlyTotals = new Map<number, number>();
    paidBills.forEach(bill => {
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
    paidBills.forEach(bill => {
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
      const weekStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - i * 7 - now.getUTCDay()
      ));
      const weekEnd = new Date(Date.UTC(
        weekStart.getUTCFullYear(),
        weekStart.getUTCMonth(),
        weekStart.getUTCDate() + 6, 23, 59, 59, 999
      ));
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: `${weekStart.getUTCMonth()+1}/${weekStart.getUTCDate()} - ${weekEnd.getUTCMonth()+1}/${weekEnd.getUTCDate()}`
      });
    }
    return weeks.map(w => {
      const total = paidBills.reduce((sum, b) =>
        (isBetween(b.createdAtDate, w.start, w.end) ? sum + b.total : sum), 0
      );
      return { name: w.label, amount: total };
    });
  };

  const generateMonthlyChartData = () => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyTotals = new Map<string, number>();
    paidBills.forEach(bill => {
      const d = bill.createdAtDate;
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
    } else {
      startDate = startOfYear(now);
    }
    const total = paidBills
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
      previousStart = new Date(previousEnd);
      previousStart.setUTCDate(previousStart.getUTCDate() - 1);
    } else if (activeTab === 'daily') {
      const dow = currentStart.getUTCDay();
      currentStart.setUTCDate(currentStart.getUTCDate() - dow);
      currentStart.setUTCHours(0,0,0,0);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setUTCDate(previousStart.getUTCDate() - 7);
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

    const prev = paidBills
      .filter(b => b.createdAtDate >= previousStart && b.createdAtDate < previousEnd)
      .reduce((sum, b) => sum + b.total, 0);

    if (prev === 0) return current > 0 ? '+100% from last period' : 'No previous data';
    const pct = ((current - prev) / prev) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% from last period`;
  };

  return (
    <div className="flex-1 space-y-3 sm:space-y-6 p-3 sm:p-6 text-white bg-inherit">
      {/* Mobile-optimized header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight gradient-text font-heading">Dashboard</h2>
      </div>

      <Tabs
        defaultValue="overview"
        value={currentDashboardTab}
        onValueChange={(v) => setCurrentDashboardTab(v as any)}
        className="w-full"
      >
        {/* Mobile-optimized tabs with better spacing */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-6">
          <TabsList className={`${isMobile ? 'w-full grid grid-cols-4 gap-1 h-11' : 'w-full sm:w-auto gap-1.5 flex'} p-1 rounded-xl`}>
            <TabsTrigger 
              value="overview" 
              className="whitespace-nowrap flex-shrink-0 text-[11px] sm:text-sm px-2 sm:px-4 rounded-lg data-[state=active]:bg-cuephoria-purple"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="whitespace-nowrap flex-shrink-0 text-[11px] sm:text-sm px-2 sm:px-4 rounded-lg data-[state=active]:bg-cuephoria-purple"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="expenses" 
              className="whitespace-nowrap flex-shrink-0 text-[11px] sm:text-sm px-2 sm:px-4 rounded-lg data-[state=active]:bg-cuephoria-purple"
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger 
              value="cash" 
              className="whitespace-nowrap flex-shrink-0 text-[11px] sm:text-sm px-2 sm:px-4 rounded-lg data-[state=active]:bg-cuephoria-purple"
            >
              Vault
            </TabsTrigger>
          </TabsList>

          {currentDashboardTab === 'expenses' && (
            <div className={`${isMobile ? 'w-full' : 'w-auto'}`}>
              <ExpenseDateFilter
                onDateRangeChange={handleDateRangeChange}
                onExport={handleExport}
              />
            </div>
          )}
        </div>

        {/* Mobile-optimized tab content with better spacing */}
        <TabsContent value="overview" className="space-y-3 sm:space-y-6 mt-3 sm:mt-0">
          <StatCardSection
            totalSales={dashboardStats.totalSales}
            salesChange={dashboardStats.salesChange}
            activeSessionsCount={dashboardStats.activeSessionsCount}
            totalStations={stations.length}
            customersCount={customers.length}
            newMembersCount={dashboardStats.newMembersCount}
            lowStockCount={dashboardStats.lowStockCount}
            lowStockItems={dashboardStats.lowStockItems}
            withdrawalsAmount={businessSummary.withdrawals}
            moneyInBank={businessSummary.moneyInBank}
          />
          <ActionButtonSection />
          <SalesChart
            data={chartData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <div className="grid gap-3 sm:gap-6 md:grid-cols-1 lg:grid-cols-2 items-stretch">
            <ActiveSessions />
            <RecentTransactions bills={bills} customers={customers} />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-3 sm:space-y-6 mt-3 sm:mt-0">
          <div className="grid gap-3 sm:gap-6 md:grid-cols-1 lg:grid-cols-2">
            <CustomerSpendingCorrelation />
            <HourlyRevenueDistribution />
          </div>
          <ProductPerformance />
          <div className="grid gap-3 sm:gap-6 md:grid-cols-1 lg:grid-cols-2">
            <CustomerActivityChart />
            <ProductInventoryChart />
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-3 sm:space-y-6 mt-3 sm:mt-0">
          <BusinessSummarySection
            filteredExpenses={filteredExpenses}
            dateRange={dateRange}
          />
          {dateRange ? (
            <FilteredExpenseList
              startDate={dateRange.start}
              endDate={dateRange.end}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          ) : (
            <ExpenseList selectedCategory={selectedCategory} />
          )}
        </TabsContent>

        <TabsContent value="cash" className="space-y-3 sm:space-y-6 mt-3 sm:mt-0">
          <CashManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
