
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock } from 'lucide-react';
import { usePOS } from '@/context/POSContext';

const HourlyRevenueDistribution: React.FC = () => {
  const { bills } = usePOS();
  
  // Generate hourly distribution data
  const generateHourlyDistribution = () => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      weekday: 0,
      weekend: 0,
      displayHour: hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour < 12 ? `${hour}AM` : `${hour-12}PM`
    }));
    
    bills.forEach(bill => {
      const date = new Date(bill.createdAt);
      const hour = date.getHours();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
      
      if (isWeekend) {
        hourlyData[hour].weekend += bill.total;
      } else {
        hourlyData[hour].weekday += bill.total;
      }
    });
    
    return hourlyData;
  };
  
  const hourlyData = generateHourlyDistribution();
  
  return (
    <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Hourly Revenue Distribution</CardTitle>
            <CardDescription className="text-gray-400">Revenue by time of day (Weekday vs Weekend)</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#0EA5E9]/20 flex items-center justify-center">
            <Clock className="h-5 w-5 text-[#0EA5E9]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ChartContainer
          config={{
            weekday: {
              label: "Weekday",
              theme: {
                light: "#0EA5E9",
                dark: "#0EA5E9",
              },
            },
            weekend: {
              label: "Weekend",
              theme: {
                light: "#D946EF",
                dark: "#D946EF",
              },
            },
          }}
          className="h-full w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={hourlyData}
              margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="displayHour" 
                stroke="#777" 
                axisLine={false}
                tickLine={false}
                interval={1}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#777"
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(value) => `₹${typeof value === 'number' ? value.toFixed(0) : value}`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-gray-800 border-gray-700 p-2 shadow-md">
                        <p className="font-bold text-white">{label}</p>
                        <div className="grid grid-cols-1 gap-2 mt-1">
                          {payload.map((entry, index) => (
                            <div key={`item-${index}`} className="flex justify-between items-center gap-4">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-gray-400">{entry.name}:</span>
                              </div>
                              <span className="font-bold text-white">
                                ₹{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span style={{ color: '#999' }}>{value}</span>}
              />
              <Line 
                type="monotone" 
                dataKey="weekday" 
                stroke="#0EA5E9" 
                strokeWidth={2} 
                dot={{ r: 3 }} 
                activeDot={{ r: 5 }} 
              />
              <Line 
                type="monotone" 
                dataKey="weekend" 
                stroke="#D946EF" 
                strokeWidth={2} 
                dot={{ r: 3 }} 
                activeDot={{ r: 5 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default HourlyRevenueDistribution;
