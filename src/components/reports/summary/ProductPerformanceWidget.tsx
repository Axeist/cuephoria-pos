
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Package, Star, Gamepad2 } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface Bill {
  id: string;
  total: number;
  subtotal: number;
  items: Array<{
    id: string;
    name: string;
    type: 'session' | 'product';
    total: number;
    quantity: number;
  }>;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface ProductPerformanceWidgetProps {
  bills: Bill[];
  products: Product[];
}

const ProductPerformanceWidget: React.FC<ProductPerformanceWidgetProps> = ({ bills, products }) => {
  const productMetrics = React.useMemo(() => {
    const productStats: Record<string, {
      name: string;
      category: string;
      revenue: number;
      quantity: number;
      isGaming: boolean;
    }> = {};

    bills.forEach(bill => {
      const discountRatio = bill.total / bill.subtotal;
      
      bill.items.forEach(item => {
        const discountedTotal = item.total * discountRatio;
        
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          const category = product?.category || 'Unknown';
          const isGaming = item.name.toLowerCase().includes('ps5') || 
                          item.name.toLowerCase().includes('pool') || 
                          item.name.toLowerCase().includes('8 ball');
          
          if (!productStats[item.id]) {
            productStats[item.id] = {
              name: item.name,
              category,
              revenue: 0,
              quantity: 0,
              isGaming
            };
          }
          
          productStats[item.id].revenue += discountedTotal;
          productStats[item.id].quantity += item.quantity;
        } else if (item.type === 'session') {
          // Include manual session products
          const isGaming = true;
          const sessionKey = `session_${item.name}`;
          
          if (!productStats[sessionKey]) {
            productStats[sessionKey] = {
              name: item.name,
              category: 'Gaming Sessions',
              revenue: 0,
              quantity: 0,
              isGaming
            };
          }
          
          productStats[sessionKey].revenue += discountedTotal;
          productStats[sessionKey].quantity += item.quantity;
        }
      });
    });

    // Get top products by revenue
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // Category breakdown
    const categoryStats: Record<string, { revenue: number; count: number }> = {};
    Object.values(productStats).forEach(product => {
      if (!categoryStats[product.category]) {
        categoryStats[product.category] = { revenue: 0, count: 0 };
      }
      categoryStats[product.category].revenue += product.revenue;
      categoryStats[product.category].count += 1;
    });

    const totalRevenue = Object.values(productStats).reduce((sum, p) => sum + p.revenue, 0);
    const gamingRevenue = Object.values(productStats)
      .filter(p => p.isGaming)
      .reduce((sum, p) => sum + p.revenue, 0);

    return {
      topProducts: topProducts.map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
        fullName: p.name,
        revenue: p.revenue,
        quantity: p.quantity,
        category: p.category
      })),
      categoryStats,
      totalRevenue,
      gamingRevenue,
      gamingPercentage: totalRevenue > 0 ? (gamingRevenue / totalRevenue) * 100 : 0
    };
  }, [bills, products]);

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            Product Performance
          </CardTitle>
          <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-800">
            {productMetrics.gamingPercentage.toFixed(1)}% Gaming Revenue
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-green-900/20 border border-green-800">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-green-400">Top Product</span>
            </div>
            <div className="text-lg font-bold text-white">
              {productMetrics.topProducts[0]?.fullName || 'None'}
            </div>
            <div className="text-sm text-gray-400">
              <CurrencyDisplay amount={productMetrics.topProducts[0]?.revenue || 0} />
            </div>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-900/20 border border-blue-800">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gamepad2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-blue-400">Gaming Revenue</span>
            </div>
            <div className="text-lg font-bold text-white">
              <CurrencyDisplay amount={productMetrics.gamingRevenue} />
            </div>
            <div className="text-sm text-gray-400">
              {productMetrics.gamingPercentage.toFixed(1)}% of total
            </div>
          </div>
        </div>

        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productMetrics.topProducts} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={12}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `₹${value.toFixed(0)}`,
                  'Revenue'
                ]}
                labelFormatter={(label: string, payload: any) => {
                  const item = payload?.[0]?.payload;
                  return item ? item.fullName : label;
                }}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB'
                }}
              />
              <Bar 
                dataKey="revenue" 
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Object.entries(productMetrics.categoryStats)
            .sort(([,a], [,b]) => b.revenue - a.revenue)
            .slice(0, 4)
            .map(([category, stats]) => (
              <div key={category} className="p-3 rounded-lg bg-gray-800/50">
                <div className="text-sm font-medium text-white mb-1">{category}</div>
                <div className="text-lg font-bold text-green-400">
                  <CurrencyDisplay amount={stats.revenue} />
                </div>
                <div className="text-xs text-gray-400">{stats.count} products</div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductPerformanceWidget;
