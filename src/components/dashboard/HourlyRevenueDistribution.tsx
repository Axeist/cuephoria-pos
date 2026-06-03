
import React, { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, Loader2 } from 'lucide-react';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';

const HourlyRevenueDistribution: React.FC = () => {
  const { hourly, loading } = useLocationAnalytics({ dailyDays: 365 });

  const hourlyData = useMemo(
    () =>
      hourly.map((row) => ({
        hour: row.hour,
        weekday: row.weekday,
        weekend: row.weekend,
        displayHour:
          row.hour === 0
            ? '12AM'
            : row.hour === 12
              ? '12PM'
              : row.hour < 12
                ? `${row.hour}AM`
                : `${row.hour - 12}PM`,
      })),
    [hourly]
  );

  return (
    <Card className="glass-card">
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
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#0EA5E9]" />
          </div>
        ) : (
          <ChartContainer
            config={{
              weekday: { label: 'Weekday', theme: { light: '#0EA5E9', dark: '#0EA5E9' } },
              weekend: { label: 'Weekend', theme: { light: '#D946EF', dark: '#D946EF' } },
            }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="displayHour" stroke="#777" axisLine={false} tickLine={false} interval={1} tick={{ fontSize: 10 }} />
                <YAxis stroke="#777" axisLine={false} tickLine={false} width={50} tickFormatter={(value) => `₹${value}`} />
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
                <Line type="monotone" dataKey="weekday" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="weekend" stroke="#D946EF" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default HourlyRevenueDistribution;
