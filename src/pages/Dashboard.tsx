import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { isWithinInterval } from 'date-fns';
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

const Dashboard = () => {
  const { customers, bills, stations, sessions, products } = usePOS();
  const { expenses, businessSummary } = useExpenses();
  
  const [activeTab, setActiveTab] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  
  const [dashboardStats, setDashboardStats] = useState({
    totalSales: 0,
    salesChange: '',
    activeSessionsCount: 0,
    newMembersCount: 0,
    lowStockCount: 0,
    lowStockItems: []
  });
  
  // Memoize expensive calculations to prevent unnecessary re-renders
  const lowStockItems = useMemo(() => 
    products.filter(p => p.stock < 5).sort((a, b) => a.stock - b.stock),
    [products]);
  
  const activeSessionsCount = useMemo(() => 
    stations.filter(s => s.isOccupied).length,
    [stations]);

  const newMembersCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return customers.filter(c => new Date(c.createdAt) >= today).length;
  }, [customers]);

  // Filter expenses by date range
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
    // TODO: Implement expense export functionality
    console.log('Exporting expenses for date range:', dateRange);
  };

  // Optimize data generation and calculations
  useEffect(() => {
    // Generate chart data based on the active tab
    setChartData(generateChartData());
    
    // Update dashboard stats with memoized values
    setDashboardStats({
      totalSales: calculateTotalSales(),
      salesChange: calculatePercentChange(),
      activeSessionsCount,
      newMembersCount,
      lowStockCount: lowStockItems.length,
      lowStockItems
    });
  }, [bills, customers, stations, sessions, products, activeTab, activeSessionsCount, newMembersCount, lowStockItems]);
  
  // Optimize chart data generation
  const generateChartData = () => {
    if (activeTab === 'hourly') {
      return generateHourlyChartData();
    } else if (activeTab === 'daily') {
      return generateDailyChartData();
    } else if (activeTab === 'weekly') {
      return generateWeeklyChartData();
    } else {
      return generateMonthlyChartData();
    }
  };
  
  const generateHourlyChartData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    if (bills.length > 0) {
      const hourlyTotals = new Map();
      
      bills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        
        if (billDate >= today) {
          const hour = billDate.getHours();
          const current = hourlyTotals.get(hour) || 0;
          hourlyTotals.set(hour, current + bill.total);
        }
      });
      
      return hours.map(hour => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const formattedHour = `${hour12}${ampm}`;
        
        return {
          name: formattedHour,
          amount: hourlyTotals.get(hour) || 0
        };
      });
    }
    
    return hours.map(hour => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      const formattedHour = `${hour12}${ampm}`;
      
      return {
        name: formattedHour,
        amount: 0
      };
    });
  };
  
  const generateDailyChartData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    if (bills.length > 0) {
      const dailyTotals = new Map();
      
      bills.forEach(bill => {
        const date = new Date(bill.createdAt);
        const day = days[date.getDay()];
        const current = dailyTotals.get(day) || 0;
        dailyTotals.set(day, current + bill.total);
      });
      
      return days.map(day => ({
        name: day,
        amount: dailyTotals.get(day) || 0
      }));
    }
    
    return [
      { name: 'Sun', amount: 0 },
      { name: 'Mon', amount: 0 },
      { name: 'Tue', amount: 0 },
      { name: 'Wed', amount: 0 },
      { name: 'Thu', amount: 0 },
      { name: 'Fri', amount: 0 },
      { name: 'Sat', amount: 0 }
    ];
  };
  
  const generateWeeklyChartData = () => {
    const weeks = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
      
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: weekLabel
      });
    }
    
    if (bills.length > 0) {
      return weeks.map(week => {
        const weeklyTotal = bills.reduce((sum, bill) => {
          const billDate = new Date(bill.createdAt);
          if (billDate >= week.start && billDate <= week.end) {
            return sum + bill.total;
          }
          return sum;
        }, 0);
        
        return {
          name: week.label,
          amount: weeklyTotal
        };
      });
    }
    
    return weeks.map(week => ({
      name: week.label,
      amount: 0
    }));
  };
  
  const generateMonthlyChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (bills.length > 0) {
      const monthlyTotals = new Map();
      
      bills.forEach(bill => {
        const date = new Date(bill.createdAt);
        const month = months[date.getMonth()];
        const current = monthlyTotals.get(month) || 0;
        monthlyTotals.set(month, current + bill.total);
      });
      
      return months.map(month => ({
        name: month,
        amount: monthlyTotals.get(month) || 0
      }));
    }
    
    return months.map(month => ({
      name: month,
      amount: 0
    }));
  };
  
  const calculateTotalSales = () => {
    let startDate = new Date();
    const now = new Date();
    
    if (activeTab === 'hourly') {
      startDate.setHours(0, 0, 0, 0);
    } else if (activeTab === 'daily') {
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    } else if (activeTab === 'weekly') {
      startDate.setDate(startDate.getDate() - 28);
      startDate.setHours(0, 0, 0, 0);
    } else if (activeTab === 'monthly') {
      startDate = new Date(startDate.getFullYear(), 0, 1);
    }
    
    // Optimize filtering by using a cached result if possible
    const filteredBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate >= startDate && billDate <= now;
    });
    
    const total = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
    
    return total;
  };
  
  const calculatePercentChange = () => {
    const currentPeriodSales = calculateTotalSales();
    
    let previousPeriodStart = new Date();
    let previousPeriodEnd = new Date();
    let currentPeriodStart = new Date();
    
    if (activeTab === 'hourly') {
      currentPeriodStart.setHours(0, 0, 0, 0);
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodStart = new Date(previousPeriodEnd);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
    } else if (activeTab === 'daily') {
      const dayOfWeek = currentPeriodStart.getDay();
      currentPeriodStart.setDate(currentPeriodStart.getDate() - dayOfWeek);
      currentPeriodStart.setHours(0, 0, 0, 0);
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodStart = new Date(previousPeriodEnd);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
    } else if (activeTab === 'weekly') {
      currentPeriodStart.setDate(currentPeriodStart.getDate() - 28);
      currentPeriodStart.setHours(0, 0, 0, 0);
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodStart = new Date(previousPeriodEnd);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 28);
    } else if (activeTab === 'monthly') {
      currentPeriodStart = new Date(currentPeriodStart.getFullYear(), 0, 1);
      previousPeriodEnd = new Date(currentPeriodStart);
      previousPeriodStart = new Date(previousPeriodEnd);
      previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
    }
    
    const previousPeriodBills = bills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate >= previousPeriodStart && billDate < previousPeriodEnd;
    });
    
    const previousPeriodSales = previousPeriodBills.reduce((sum, bill) => sum + bill.total, 0);
    
    if (previousPeriodSales === 0) {
      return currentPeriodSales > 0 ? "+100% from last period" : "No previous data";
    }
    
    const percentChange = ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100;
    
    const formattedChange = percentChange.toFixed(1);
    return (percentChange >= 0 ? "+" : "") + formattedChange + "% from last period";
  };
  
  return (
    <div className="flex-1 space-y-6 p-6 bg-[#1A1F2C] text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-heading">Dashboard</h2>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 w-full max-w-md">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
          <TabsTrigger value="finances" className="flex-1">Finances</TabsTrigger>
        </TabsList>
        
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
          
          <SalesChart 
            data={chartData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          
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
        
        <TabsContent value="finances" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <ExpenseDateFilter 
              onDateRangeChange={handleDateRangeChange}
              onExport={handleExport}
            />
          </div>
          
          <BusinessSummarySection 
            filteredExpenses={filteredExpenses}
            dateRange={dateRange}
          />
          
          {dateRange ? (
            <FilteredExpenseList 
              startDate={dateRange.start}
              endDate={dateRange.end}
            />
          ) : (
            <ExpenseList />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
