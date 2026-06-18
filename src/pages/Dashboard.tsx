import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { parseExpenseDate } from '@/utils/expenseUtils';
import { isWithinInterval, format } from 'date-fns';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';
import StatCardSection from '@/components/dashboard/StatCardSection';
import ActionButtonSection from '@/components/dashboard/ActionButtonSection';
import WorkspaceHero from '@/components/dashboard/WorkspaceHero';
import SalesChart from '@/components/dashboard/SalesChart';
import BusinessSummarySection from '@/components/dashboard/BusinessSummarySection';
import ActiveSessions from '@/components/dashboard/ActiveSessions';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import CustomerActivityChart from '@/components/dashboard/CustomerActivityChart';
import ProductInventoryChart from '@/components/dashboard/ProductInventoryChart';
import CustomerSpendingCorrelation from '@/components/dashboard/CustomerSpendingCorrelation';
import HourlyRevenueDistribution from '@/components/dashboard/HourlyRevenueDistribution';
import ProductPerformance from '@/components/dashboard/ProductPerformance';
import ExpenseDateFilter from '@/components/expenses/ExpenseDateFilter';
import ExpenseList from '@/components/expenses/ExpenseList';
import FilteredExpenseList from '@/components/expenses/FilteredExpenseList';
import VaultDashboard from '@/components/vault/VaultDashboard';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { MobilePageShell } from '@/components/mobile/MobilePageShell';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileTabSelect } from '@/components/mobile/MobileTabSelect';
import { useViewMode } from '@/context/ViewModeContext';
import { usePermissions } from '@/context/PermissionsContext';
import PullToRefresh from '@/components/PullToRefresh';

const Dashboard = () => {
  const { customers, bills, stations, sessions, products, refreshStations } = usePOS();
  const { expenses, businessSummary } = useExpenses();
  const { stats } = useLocationAnalytics();
  const { toast } = useToast();
  const { can } = usePermissions();
  const { isMobile } = useViewMode();

  const canViewAnalytics = can('dashboard.analytics.view');
  const canViewExpenses = can('dashboard.expenses.view');
  const canViewVault = can('dashboard.vault.view');

  const [activeTab, setActiveTab] = useState<'hourly'|'daily'|'weekly'|'monthly'>('daily');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentDashboardTab, setCurrentDashboardTab] = useState<'overview'|'analytics'|'expenses'|'cash'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string|null>(null);

  useEffect(() => {
    if (currentDashboardTab === 'analytics' && !canViewAnalytics) {
      setCurrentDashboardTab('overview');
    }
    if (currentDashboardTab === 'expenses' && !canViewExpenses) {
      setCurrentDashboardTab('overview');
    }
    if (currentDashboardTab === 'cash' && !canViewVault) {
      setCurrentDashboardTab('overview');
    }
  }, [currentDashboardTab, canViewAnalytics, canViewExpenses, canViewVault]);

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
      const expenseDate = parseExpenseDate(expense.date);
      if (!expenseDate) return false;
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

  const dashboardStats = useMemo(() => {
    const totalSales =
      activeTab === 'hourly'
        ? stats?.todaySales ?? 0
        : activeTab === 'daily'
          ? stats?.todaySales ?? 0
          : activeTab === 'weekly'
            ? stats?.currentMonthSales ?? 0
            : stats?.grossIncome ?? 0;

    const salesChange =
      stats && stats.yesterdaySales > 0
        ? `${(((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100).toFixed(1)}% from yesterday`
        : stats && stats.todaySales > 0
          ? '+100% from yesterday'
          : 'No previous data';

    return {
      totalSales,
      salesChange,
      activeSessionsCount,
      newMembersCount,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  }, [stats, activeTab, activeSessionsCount, newMembersCount, lowStockItems]);

  const dashboardTabs = useMemo(() => {
    const tabs = [{ id: 'overview' as const, label: 'Overview' }];
    if (canViewAnalytics) tabs.push({ id: 'analytics' as const, label: 'Analytics' });
    if (canViewExpenses) tabs.push({ id: 'expenses' as const, label: 'Expenses' });
    if (canViewVault) tabs.push({ id: 'cash' as const, label: 'Vault' });
    return tabs;
  }, [canViewAnalytics, canViewExpenses, canViewVault]);

  return (
    <PullToRefresh onRefresh={refreshStations} scrollTargetId="app-main">
    <MobilePageShell className="space-y-3 sm:space-y-6">
      <WorkspaceHero />
      <MobilePageHeader title="Dashboard" />

      <div className="flex w-full min-w-0 flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {isMobile ? (
          <MobileTabSelect
            className="w-full"
            tabs={dashboardTabs}
            activeId={currentDashboardTab}
            onChange={(id) =>
              setCurrentDashboardTab(id as typeof currentDashboardTab)
            }
          />
        ) : (
        <div className="flex w-full sm:w-auto gap-1.5 p-1 rounded-xl glass-card">
          <button
            type="button"
            onClick={() => setCurrentDashboardTab('overview')}
            className={`flex-shrink-0 whitespace-nowrap text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentDashboardTab === 'overview'
                ? 'btn-gradient text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Overview
          </button>
          {canViewAnalytics && (
          <button
            type="button"
            onClick={() => setCurrentDashboardTab('analytics')}
            className={`flex-shrink-0 whitespace-nowrap text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentDashboardTab === 'analytics'
                ? 'btn-gradient text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Analytics
          </button>
          )}
          {canViewExpenses && (
          <button
            type="button"
            onClick={() => setCurrentDashboardTab('expenses')}
            className={`flex-shrink-0 whitespace-nowrap text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentDashboardTab === 'expenses'
                ? 'btn-gradient text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Expenses
          </button>
          )}
          {canViewVault && (
          <button
            type="button"
            onClick={() => setCurrentDashboardTab('cash')}
            className={`flex-shrink-0 whitespace-nowrap text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              currentDashboardTab === 'cash'
                ? 'btn-gradient text-white'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Vault
          </button>
          )}
        </div>
        )}

        {currentDashboardTab === 'expenses' && (
          <div className={`${isMobile ? 'w-full' : 'w-auto'}`}>
            <ExpenseDateFilter
              onDateRangeChange={handleDateRangeChange}
              onExport={handleExport}
            />
          </div>
        )}
      </div>

      {/* Mobile-optimized content with better spacing */}
      {currentDashboardTab === 'overview' && (
        <div className="w-full min-w-0 space-y-3 sm:space-y-6 mt-3 sm:mt-0">
          <StatCardSection
            totalSales={dashboardStats.totalSales}
            salesChange={dashboardStats.salesChange}
            activeSessionsCount={dashboardStats.activeSessionsCount}
            totalStations={stations.length}
            customersCount={customers.length}
            newMembersCount={dashboardStats.newMembersCount}
            lowStockCount={dashboardStats.lowStockCount}
            lowStockItems={dashboardStats.lowStockItems}
            sessions={sessions}
            withdrawalsAmount={businessSummary.withdrawals}
            moneyInBank={businessSummary.moneyInBank}
          />
          <ActionButtonSection />
          <SalesChart
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-6 lg:grid lg:grid-cols-2 lg:items-stretch">
            <ActiveSessions />
            <RecentTransactions bills={bills} customers={customers} />
          </div>
        </div>
      )}

      {currentDashboardTab === 'analytics' && (
        <div className="space-y-3 sm:space-y-6 mt-3 sm:mt-0 overflow-x-hidden">
          <div className="grid gap-3 sm:gap-6 md:grid-cols-1 lg:grid-cols-2 overflow-x-hidden">
            <CustomerSpendingCorrelation />
            <HourlyRevenueDistribution />
          </div>
          <ProductPerformance />
          <div className="grid gap-3 sm:gap-6 md:grid-cols-1 lg:grid-cols-2 overflow-x-hidden">
            <CustomerActivityChart />
            <ProductInventoryChart />
          </div>
        </div>
      )}

      {currentDashboardTab === 'expenses' && (
        <div className="space-y-3 sm:space-y-6 mt-3 sm:mt-0 overflow-x-hidden">
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
        </div>
      )}

      {currentDashboardTab === 'cash' && (
        <div className="space-y-3 sm:space-y-6 mt-3 sm:mt-0 overflow-x-hidden">
          <VaultDashboard />
        </div>
      )}
    </MobilePageShell>
    </PullToRefresh>
  );
};

export default Dashboard;
