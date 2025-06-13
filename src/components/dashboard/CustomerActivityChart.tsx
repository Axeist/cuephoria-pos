
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';
import { usePOS } from '@/context/POSContext';

const CustomerActivityChart: React.FC = () => {
  const { customers, bills } = usePOS();
  
  // Prepare data for the chart
  const getCustomerActivityData = () => {
    // Get all customers with bill transactions
    const customerTransactions = new Map();
    
    bills.forEach(bill => {
      const customerId = bill.customerId;
      const currentCount = customerTransactions.get(customerId) || 0;
      customerTransactions.set(customerId, currentCount + 1);
    });
    
    // Sort by transaction count (descending) and take top 5
    const topCustomers = Array.from(customerTransactions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Format data for the bar chart
    return topCustomers.map(([customerId, transactions]) => {
      const customer = customers.find(c => c.id === customerId);
      return {
        name: customer ? customer.name.split(' ')[0] : 'Unknown',
        transactions: transactions,
      };
    });
  };
  
  const chartData = getCustomerActivityData();
  
  return (
    <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Customer Activity</CardTitle>
            <CardDescription className="text-gray-400">Top 5 most active customers</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-[#10B981]/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#10B981]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ChartContainer
          config={{
            transactions: {
              label: "Transactions",
              theme: {
                light: "#10B981",
                dark: "#10B981",
              },
            },
          }}
          className="h-full w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 25 }}
            >
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
                      <div className="rounded-lg border bg-gray-800 border-gray-700 p-2 shadow-md">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-gray-400">
                              Customer
                            </span>
                            <span className="font-bold text-gray-300">
                              {payload[0].payload.name}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-gray-400">
                              Transactions
                            </span>
                            <span className="font-bold text-white">
                              {payload[0].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                }}
              />
              <Bar 
                dataKey="transactions" 
                name="transactions" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default CustomerActivityChart;
