
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { usePOS } from '@/context/POSContext';

const CustomerSpendingCorrelation: React.FC = () => {
  const { customers, bills } = usePOS();
  
  // Generate data for the correlation chart
  const generateCorrelationData = () => {
    // Create a map of customer visits and total spending
    const customerData = new Map();
    
    bills.forEach(bill => {
      const customerId = bill.customerId;
      if (!customerData.has(customerId)) {
        customerData.set(customerId, { visits: 0, spending: 0 });
      }
      
      const data = customerData.get(customerId);
      data.visits += 1;
      data.spending += bill.total;
      customerData.set(customerId, data);
    });
    
    // Convert to array suitable for scatter chart
    return Array.from(customerData.entries()).map(([customerId, data]) => {
      const customer = customers.find(c => c.id === customerId);
      return {
        name: customer ? customer.name : 'Unknown',
        visits: data.visits,
        spending: data.spending,
        // Calculate average spending per visit
        averageSpending: data.spending / data.visits,
        // Use this for size of dots
        value: Math.min(20, Math.max(5, data.spending / 200)),
      };
    });
  };
  
  const correlationData = generateCorrelationData();
  
  // No data case
  if (correlationData.length === 0) {
    return (
      <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-white font-heading">Customer Spending Analysis</CardTitle>
              <CardDescription className="text-gray-400">Correlation between visits and spending</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-gray-400">Not enough customer data to display correlation</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-[#1A1F2C] border-gray-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Customer Spending Analysis</CardTitle>
            <CardDescription className="text-gray-400">Correlation between visits and spending</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ChartContainer
          config={{
            spending: {
              label: "Customer Spending",
              theme: {
                light: "#8B5CF6",
                dark: "#8B5CF6",
              },
            },
          }}
          className="h-full w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                type="number" 
                dataKey="visits" 
                name="Visits" 
                label={{ 
                  value: 'Number of Visits', 
                  position: 'bottom',
                  fill: '#777' 
                }}
                stroke="#777"
              />
              <YAxis 
                type="number" 
                dataKey="spending" 
                name="Total Spending" 
                label={{ 
                  value: 'Total Spending (₹)', 
                  angle: -90, 
                  position: 'left',
                  fill: '#777'
                }}
                stroke="#777"
              />
              <ZAxis type="number" dataKey="value" range={[5, 20]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-gray-800 border-gray-700 p-2 shadow-md">
                        <p className="font-bold text-white">{data.name}</p>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-gray-400">
                              Visits
                            </span>
                            <span className="font-bold text-white">
                              {data.visits}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-gray-400">
                              Total Spending
                            </span>
                            <span className="font-bold text-white">
                              ₹{data.spending.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-col col-span-2">
                            <span className="text-[0.70rem] uppercase text-gray-400">
                              Average per Visit
                            </span>
                            <span className="font-bold text-white">
                              ₹{data.averageSpending.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                name="spending" 
                data={correlationData} 
                fill="#8B5CF6" 
                opacity={0.8}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default CustomerSpendingCorrelation;
