
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { usePOS } from '@/context/POSContext';

const ProductInventoryChart: React.FC = () => {
  const { products } = usePOS();
  
  // Categorize products by stock status
  const categorizeProductsByStock = () => {
    const criticalStock = products.filter(p => (p.stock === 1 || p.stock === 0) && p.category !== 'challenges' && p.category !== 'membership').length;
    const lowStock = products.filter(p => p.stock >= 2 && p.stock < 15 && p.category !== 'challenges' && p.category !== 'membership').length;
    const healthyStock = products.filter(p => p.stock >= 15 && p.category !== 'challenges' && p.category !== 'membership').length;
    
    return [
      { name: 'Critical (0-1)', value: criticalStock, color: '#EF4444' },
      { name: 'Low (2-14)', value: lowStock, color: '#FBBF24' },
      { name: 'Healthy (15+)', value: healthyStock, color: '#10B981' }
    ].filter(category => category.value > 0); // Only show categories with products
  };
  
  const stockData = categorizeProductsByStock();
  
  // Handle case where there are no physical products
  if (stockData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-orange-500/20 hover:border-orange-500/30 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
          <div>
            <CardTitle className="text-lg font-semibold text-white">Inventory Status</CardTitle>
            <CardDescription className="text-gray-400">Product stock levels</CardDescription>
          </div>
          <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center p-6">
          <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700/30 text-center">
            <AlertTriangle className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No physical inventory items to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-orange-500/20 hover:border-orange-500/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700/30">
        <div>
          <CardTitle className="text-lg font-semibold text-white">Inventory Status</CardTitle>
          <CardDescription className="text-gray-400">Product stock levels</CardDescription>
        </div>
        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4 p-6">
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 h-full">
          <ChartContainer
            config={{}}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-gray-800 border-gray-700 p-2 shadow-md">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-gray-400">
                                Status
                              </span>
                              <span className="font-bold text-gray-300">
                                {payload[0].name}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-gray-400">
                                Count
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
                <Legend 
                  verticalAlign="bottom"
                  align="center"
                  layout="horizontal"
                  formatter={(value, entry, index) => (
                    <span style={{ color: '#999' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductInventoryChart;
