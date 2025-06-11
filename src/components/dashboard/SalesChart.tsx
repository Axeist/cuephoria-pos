
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { CurrencyDisplay } from '@/components/ui/currency';

interface SalesChartProps {
  data: {
    name: string;
    amount: number;
  }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SalesChart: React.FC<SalesChartProps> = ({ data, activeTab, setActiveTab }) => {
  return (
    <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white font-heading">Sales Overview</CardTitle>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-gray-800 text-gray-400">
              <TabsTrigger value="hourly">Hourly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="h-[350px] pt-4">
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
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 25 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#9b87f5" stopOpacity={0}/>
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
                width={30}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-card p-2 shadow-md">
                        <div className="grid grid-cols-2 gap-2">
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
                strokeWidth={2}
                dot={{ r: 4, fill: "#9b87f5", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#9b87f5", stroke: "#1A1F2C", strokeWidth: 2 }}
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default SalesChart;
