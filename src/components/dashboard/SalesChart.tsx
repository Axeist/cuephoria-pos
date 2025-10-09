import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { CurrencyDisplay } from '@/components/ui/currency';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, format, addDays, addWeeks } from 'date-fns';
import { Calendar } from 'lucide-react';

interface SalesChartProps {
  data: {
    name: string;
    amount: number;
  }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SalesChart: React.FC<SalesChartProps> = ({ activeTab, setActiveTab }) => {
  const { bills } = usePOS();
  const { expenses } = useExpenses();
  const [chartData, setChartData] = useState<{ name: string; sales: number; expenses: number; }[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // Calculate available years from bills
  useEffect(() => {
    const years = new Set<string>();
    bills.forEach(bill => {
      const billDate = new Date(bill.createdAt);
      years.add(billDate.getFullYear().toString());
    });
    const sortedYears = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    setAvailableYears(sortedYears);
  }, [bills]);

  // Filter bills by year and exclude complimentary
  const filteredBills = useMemo(() => {
    const paidBills = bills.filter(bill => bill.paymentMethod !== 'complimentary');
    
    if (selectedYear === 'all') {
      return paidBills;
    }
    
    const year = parseInt(selectedYear);
    return paidBills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate.getFullYear() === year;
    });
  }, [bills, selectedYear]);

  const generateChartData = () => {
    const now = new Date();
    
    if (activeTab === 'hourly') {
      // Show revenue for the current day (24 hours)
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const hourlyTotals = new Map();
      const hourlyExpenses = new Map();
      
      filteredBills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= todayStart && billDate <= todayEnd) {
          const hour = billDate.getHours();
          const current = hourlyTotals.get(hour) || 0;
          hourlyTotals.set(hour, current + bill.total);
        }
      });

      // For hourly view, distribute daily expenses evenly across hours
      const todayExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= todayStart && expenseDate <= todayEnd;
      });
      
      const totalTodayExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const hourlyExpenseAmount = totalTodayExpenses / 24;
      
      return hours.map(hour => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const formattedHour = `${hour12}${ampm}`;
        
        return {
          name: formattedHour,
          sales: hourlyTotals.get(hour) || 0,
          expenses: hourlyExpenseAmount
        };
      });
      
    } else if (activeTab === 'daily') {
      // Show revenue for all days of the current week
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyTotals = new Map();
      const dailyExpenses = new Map();
      
      filteredBills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= weekStart && billDate <= weekEnd) {
          const dayOfWeek = billDate.getDay();
          const current = dailyTotals.get(dayOfWeek) || 0;
          dailyTotals.set(dayOfWeek, current + bill.total);
        }
      });

      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= weekStart && expenseDate <= weekEnd) {
          const dayOfWeek = expenseDate.getDay();
          const current = dailyExpenses.get(dayOfWeek) || 0;
          dailyExpenses.set(dayOfWeek, current + expense.amount);
        }
      });
      
      return days.map((day, index) => ({
        name: day,
        sales: dailyTotals.get(index) || 0,
        expenses: dailyExpenses.get(index) || 0
      }));
      
    } else if (activeTab === 'weekly') {
      // Show revenue for all weeks of the current month
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const weeks = [];
      
      let weekStart = startOfWeek(monthStart);
      let weekIndex = 1;
      
      while (weekStart <= monthEnd) {
        const weekEnd = endOfWeek(weekStart);
        weeks.push({
          start: weekStart,
          end: weekEnd,
          label: `Week ${weekIndex}`,
          index: weekIndex
        });
        weekStart = addWeeks(weekStart, 1);
        weekIndex++;
      }
      
      const weeklyTotals = new Map();
      const weeklyExpenses = new Map();
      
      filteredBills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= monthStart && billDate <= monthEnd) {
          const week = weeks.find(w => billDate >= w.start && billDate <= w.end);
          if (week) {
            const current = weeklyTotals.get(week.index) || 0;
            weeklyTotals.set(week.index, current + bill.total);
          }
        }
      });

      expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        if (expenseDate >= monthStart && expenseDate <= monthEnd) {
          const week = weeks.find(w => expenseDate >= w.start && expenseDate <= w.end);
          if (week) {
            const current = weeklyExpenses.get(week.index) || 0;
            weeklyExpenses.set(week.index, current + expense.amount);
          }
        }
      });
      
      return weeks.map(week => ({
        name: week.label,
        sales: weeklyTotals.get(week.index) || 0,
        expenses: weeklyExpenses.get(week.index) || 0
      }));
      
    } else {
      // Monthly
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyTotals = new Map();
      const monthlyExpenses = new Map();
      
      filteredBills.forEach(bill => {
        const date = new Date(bill.createdAt);
        const month = months[date.getMonth()];
        const current = monthlyTotals.get(month) || 0;
        monthlyTotals.set(month, current + bill.total);
      });

      expenses.forEach(expense => {
        const date = new Date(expense.date);
        const month = months[date.getMonth()];
        const current = monthlyExpenses.get(month) || 0;
        monthlyExpenses.set(month, current + expense.amount);
      });
      
      return months.map(month => ({
        name: month,
        sales: monthlyTotals.get(month) || 0,
        expenses: monthlyExpenses.get(month) || 0
      }));
    }
  };

  // Handle smooth transitions when activeTab or selectedYear changes
  useEffect(() => {
    setIsTransitioning(true);
    
    // Short delay to trigger fade-out effect
    const timer = setTimeout(() => {
      const newData = generateChartData();
      setChartData(newData);
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [activeTab, filteredBills, expenses, selectedYear]);

  // Initialize chart data on first render
  useEffect(() => {
    setChartData(generateChartData());
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white font-heading">Sales Overview</CardTitle>
          <div className="flex items-center gap-4">
            {/* Year Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Time Period Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList className="bg-gray-800 text-gray-400">
                <TabsTrigger 
                  value="hourly"
                  className="transition-all duration-200 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
                >
                  Hourly
                </TabsTrigger>
                <TabsTrigger 
                  value="daily"
                  className="transition-all duration-200 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
                >
                  Daily
                </TabsTrigger>
                <TabsTrigger 
                  value="weekly"
                  className="transition-all duration-200 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
                >
                  Weekly
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly"
                  className="transition-all duration-200 data-[state=active]:bg-cuephoria-lightpurple data-[state=active]:text-white"
                >
                  Monthly
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[350px] pt-4">
        <div className={`transition-all duration-300 ease-in-out h-full ${isTransitioning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
          <ChartContainer
            config={{
              sales: {
                label: "Sales",
                theme: {
                  light: "#9b87f5",
                  dark: "#9b87f5",
                },
              },
              expenses: {
                label: "Expenses",
                theme: {
                  light: "#ef4444",
                  dark: "#ef4444",
                },
              },
            }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 50 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#9b87f5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#777" 
                  axisLine={false}
                  tickLine={false}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis 
                  stroke="#777"
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-md transition-all duration-200 animate-fade-in">
                          <div className="grid gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {activeTab === 'hourly' ? 'Hour' : activeTab === 'daily' ? 'Day' : activeTab === 'weekly' ? 'Week' : 'Month'}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.name}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-[#9b87f5]"></div>
                                  Sales
                                </span>
                                <span className="font-bold">
                                  <CurrencyDisplay amount={payload[0].value as number} />
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-[#ef4444]"></div>
                                  Expenses
                                </span>
                                <span className="font-bold">
                                  <CurrencyDisplay amount={payload[1]?.value as number || 0} />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  content={({ payload }) => (
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#9b87f5]"></div>
                        <span className="text-sm text-gray-300">Sales</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                        <span className="text-sm text-gray-300">Expenses</span>
                      </div>
                    </div>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#9b87f5"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#9b87f5", strokeWidth: 0 }}
                  activeDot={{ 
                    r: 6, 
                    fill: "#9b87f5", 
                    stroke: "#1A1F2C", 
                    strokeWidth: 2,
                    className: "transition-all duration-200 hover:r-8"
                  }}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                  activeDot={{ 
                    r: 6, 
                    fill: "#ef4444", 
                    stroke: "#1A1F2C", 
                    strokeWidth: 2,
                    className: "transition-all duration-200 hover:r-8"
                  }}
                  fillOpacity={1}
                  fill="url(#colorExpenses)"
                  animationBegin={200}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesChart;
