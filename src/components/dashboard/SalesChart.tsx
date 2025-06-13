
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { CurrencyDisplay } from '@/components/ui/currency';
import { usePOS } from '@/context/POSContext';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, format, addDays, addWeeks } from 'date-fns';

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
  const [chartData, setChartData] = useState<{ name: string; amount: number; }[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const generateChartData = () => {
    const now = new Date();
    
    if (activeTab === 'hourly') {
      // Show revenue for the current day (24 hours)
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const hourlyTotals = new Map();
      
      bills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= todayStart && billDate <= todayEnd) {
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
      
    } else if (activeTab === 'daily') {
      // Show revenue for all days of the current week
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyTotals = new Map();
      
      bills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= weekStart && billDate <= weekEnd) {
          const dayOfWeek = billDate.getDay();
          const current = dailyTotals.get(dayOfWeek) || 0;
          dailyTotals.set(dayOfWeek, current + bill.total);
        }
      });
      
      return days.map((day, index) => ({
        name: day,
        amount: dailyTotals.get(index) || 0
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
      
      bills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= monthStart && billDate <= monthEnd) {
          const week = weeks.find(w => billDate >= w.start && billDate <= w.end);
          if (week) {
            const current = weeklyTotals.get(week.index) || 0;
            weeklyTotals.set(week.index, current + bill.total);
          }
        }
      });
      
      return weeks.map(week => ({
        name: week.label,
        amount: weeklyTotals.get(week.index) || 0
      }));
      
    } else {
      // Monthly - keep existing logic
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
  };

  // Handle smooth transitions when activeTab changes
  useEffect(() => {
    setIsTransitioning(true);
    
    // Short delay to trigger fade-out effect
    const timer = setTimeout(() => {
      const newData = generateChartData();
      setChartData(newData);
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [activeTab, bills]);

  // Initialize chart data on first render
  useEffect(() => {
    setChartData(generateChartData());
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Format Y-axis values to be more compact
  const formatYAxisValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  return (
    <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white font-heading">Sales Overview</CardTitle>
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
      </CardHeader>
      <CardContent className="h-[320px] pt-4">
        <div className={`transition-all duration-300 ease-in-out h-full ${isTransitioning ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}`}>
          <ChartContainer
            config={{
              amount: {
                label: "Amount",
                theme: {
                  light: "#9b87f5",
                  dark: "#9b87f5",
                },
              },
            }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 20, right: 20, left: 60, bottom: 40 }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#9b87f5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  stroke="#333" 
                  strokeDasharray="3 3" 
                  vertical={false}
                  horizontal={true}
                />
                <XAxis 
                  dataKey="name" 
                  stroke="#777" 
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  padding={{ left: 10, right: 10 }}
                  interval={0}
                  angle={activeTab === 'weekly' ? -45 : 0}
                  textAnchor={activeTab === 'weekly' ? 'end' : 'middle'}
                  height={activeTab === 'weekly' ? 60 : 40}
                />
                <YAxis 
                  stroke="#777"
                  axisLine={false}
                  tickLine={false}
                  fontSize={12}
                  width={50}
                  tickFormatter={formatYAxisValue}
                  domain={['dataMin - 100', 'dataMax + 100']}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-md transition-all duration-200 animate-fade-in">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {activeTab === 'hourly' ? 'Hour' : activeTab === 'daily' ? 'Day' : activeTab === 'weekly' ? 'Week' : 'Month'}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.name}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Sales
                              </span>
                              <span className="font-bold">
                                <CurrencyDisplay amount={payload[0].value as number} />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="amount"
                  stroke="#9b87f5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#9b87f5", strokeWidth: 2, stroke: "#1A1F2C" }}
                  activeDot={{ 
                    r: 7, 
                    fill: "#9b87f5", 
                    stroke: "#1A1F2C", 
                    strokeWidth: 3,
                    className: "transition-all duration-200 hover:r-8"
                  }}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  animationBegin={0}
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
