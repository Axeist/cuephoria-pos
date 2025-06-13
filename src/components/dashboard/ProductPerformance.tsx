
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { BarChartHorizontal } from 'lucide-react';
import { usePOS } from '@/context/POSContext';

const ProductPerformance: React.FC = () => {
  const { bills, products, categories } = usePOS();
  
  const generateProductData = () => {
    const productSales = new Map();
    
    bills.forEach(bill => {
      bill.items.forEach(item => {
        if (item.type === 'product') {
          const current = productSales.get(item.name) || { 
            sales: 0, 
            count: 0, 
            category: item.category || 'unknown'
          };
          
          productSales.set(item.name, {
            sales: current.sales + item.total,
            count: current.count + item.quantity,
            category: item.category || current.category
          });
        }
      });
    });
    
    return Array.from(productSales, ([name, data]) => ({
      name,
      sales: data.sales,
      count: data.count,
      category: data.category
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);
  };
  
  const getCategoryColor = (category?: string) => {
    if (!category) return '#10B981';
    
    const colorMap: Record<string, string> = {
      'food': '#F97316',      // Orange
      'drinks': '#3B82F6',    // Blue
      'tobacco': '#EF4444',   // Red
      'challenges': '#22C55E', // Green
      'membership': '#8B5CF6'  // Purple
    };
    
    return colorMap[category] || '#10B981';
  };
  
  const formatCurrency = (value: number) => {
    return `₹${value.toFixed(2)}`;
  };
  
  const productData = generateProductData();
  
  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-blue-500/20 hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <div>
          <CardTitle className="text-lg font-semibold text-white">Product Performance</CardTitle>
          <CardDescription className="text-gray-400">Top selling products by revenue</CardDescription>
        </div>
        <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <BarChartHorizontal className="h-4 w-4 text-blue-400" />
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4 p-6">
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 h-full">
          <ChartContainer
            config={{
              revenue: {
                label: "Product Revenue",
                color: "#10B981"
              }
            }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={productData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 100,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                <XAxis 
                  type="number" 
                  tick={{ fill: '#999' }} 
                  tickFormatter={formatCurrency}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: '#999' }} 
                  width={100}
                  tickFormatter={(value) => {
                    return value.length > 13 ? value.substring(0, 13) + '...' : value;
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      
                      return (
                        <div className="rounded-lg border bg-gray-800 border-gray-700 p-2 shadow-md">
                          <p className="font-bold text-white">{item.name}</p>
                          <div className="grid grid-cols-1 gap-2 mt-1">
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-gray-400">Revenue:</span>
                              <span className="font-bold text-white">₹{Number(item.sales).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-gray-400">Items Sold:</span>
                              <span className="font-bold text-white">{item.count}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-gray-400">Category:</span>
                              <span className="font-bold text-white capitalize">{item.category}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  payload={categories.map(category => ({ 
                    value: category.charAt(0).toUpperCase() + category.slice(1), 
                    color: getCategoryColor(category), 
                    type: 'rect' 
                  }))}
                />
                <Bar 
                  dataKey="sales" 
                  name="Revenue"
                  fill="#10B981"
                  fillOpacity={0.9}
                  radius={[0, 4, 4, 0]}
                >
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductPerformance;
