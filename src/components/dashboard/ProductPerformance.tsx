
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { BarChartHorizontal, Loader2 } from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import { useLocationAnalytics } from '@/hooks/useLocationAnalytics';

const ProductPerformance: React.FC = () => {
  const { categories } = usePOS();
  const { products: productData, loading } = useLocationAnalytics();

  const getCategoryColor = (category?: string) => {
    if (!category) return '#10B981';
    const colorMap: Record<string, string> = {
      food: '#F97316',
      drinks: '#3B82F6',
      tobacco: '#EF4444',
      challenges: '#22C55E',
      membership: '#8B5CF6',
    };
    return colorMap[category] || '#10B981';
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-white font-heading">Product Performance</CardTitle>
            <CardDescription className="text-gray-400">Top selling products by revenue</CardDescription>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <BarChartHorizontal className="h-5 w-5 text-blue-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <ChartContainer config={{ revenue: { label: 'Product Revenue', color: '#10B981' } }} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={productData}
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#999' }} tickFormatter={(v) => `₹${v}`} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#999' }}
                  width={100}
                  tickFormatter={(value) => (value.length > 13 ? `${value.substring(0, 13)}...` : value)}
                />
                <Tooltip />
                <Legend
                  payload={categories.map((category) => ({
                    value: category.charAt(0).toUpperCase() + category.slice(1),
                    color: getCategoryColor(category),
                    type: 'rect' as const,
                  }))}
                />
                <Bar dataKey="sales" name="Revenue" fill="#10B981" radius={[0, 4, 4, 0]}>
                  {productData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductPerformance;
