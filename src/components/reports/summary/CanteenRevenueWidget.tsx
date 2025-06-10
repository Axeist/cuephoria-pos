
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Coffee, Utensils, Package2 } from 'lucide-react';
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

interface CanteenRevenueWidgetProps {
  bills: Bill[];
  products: Product[];
}

const CanteenRevenueWidget: React.FC<CanteenRevenueWidgetProps> = ({ bills, products }) => {
  const canteenData = React.useMemo(() => {
    let beverageRevenue = 0;
    let snackRevenue = 0;
    let mealRevenue = 0;
    let otherCanteenRevenue = 0;
    let totalRevenue = 0;

    bills.forEach(bill => {
      const discountRatio = bill.total / bill.subtotal;
      totalRevenue += bill.total;
      
      bill.items.forEach(item => {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          const discountedTotal = item.total * discountRatio;
          
          if (product) {
            const category = product.category.toLowerCase();
            const name = product.name.toLowerCase();
            
            if (category.includes('beverage') || category.includes('drink') || 
                name.includes('tea') || name.includes('coffee') || name.includes('juice') ||
                name.includes('water') || name.includes('soda')) {
              beverageRevenue += discountedTotal;
            } else if (category.includes('snack') || category.includes('chips') ||
                      name.includes('biscuit') || name.includes('chocolate') || name.includes('candy')) {
              snackRevenue += discountedTotal;
            } else if (category.includes('food') || category.includes('meal') ||
                      name.includes('sandwich') || name.includes('burger') || name.includes('pizza')) {
              mealRevenue += discountedTotal;
            } else if (category.includes('canteen') || category.includes('cafe')) {
              otherCanteenRevenue += discountedTotal;
            }
          }
        }
      });
    });

    const totalCanteenRevenue = beverageRevenue + snackRevenue + mealRevenue + otherCanteenRevenue;
    const canteenPercentage = totalRevenue > 0 ? (totalCanteenRevenue / totalRevenue) * 100 : 0;

    const pieData = [
      { name: 'Beverages', value: beverageRevenue, color: '#3B82F6' },
      { name: 'Snacks', value: snackRevenue, color: '#F59E0B' },
      { name: 'Meals', value: mealRevenue, color: '#10B981' },
      { name: 'Other', value: otherCanteenRevenue, color: '#8B5CF6' }
    ].filter(item => item.value > 0);

    return {
      totalCanteenRevenue,
      canteenPercentage,
      beverageRevenue,
      snackRevenue,
      mealRevenue,
      otherCanteenRevenue,
      pieData,
      hasCanteenData: totalCanteenRevenue > 0
    };
  }, [bills, products]);

  if (!canteenData.hasCanteenData) {
    return (
      <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Coffee className="h-5 w-5 text-orange-500" />
            Canteen Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Utensils className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p className="text-lg font-medium">No Canteen Sales</p>
            <p className="text-sm">No food & beverage products sold in this period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-[#1A1F2C] shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Coffee className="h-5 w-5 text-orange-500" />
            Canteen Revenue
          </CardTitle>
          <Badge variant="outline" className="bg-orange-900/30 text-orange-400 border-orange-800">
            {canteenData.canteenPercentage.toFixed(1)}% of Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-white">
            <CurrencyDisplay amount={canteenData.totalCanteenRevenue} />
          </div>
          <div className="text-sm text-orange-400 mt-1">Total Canteen Revenue</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-800">
            <Coffee className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-lg font-bold text-white">
                <CurrencyDisplay amount={canteenData.beverageRevenue} />
              </div>
              <div className="text-sm text-blue-400">Beverages</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-800">
            <Package2 className="h-8 w-8 text-yellow-500" />
            <div>
              <div className="text-lg font-bold text-white">
                <CurrencyDisplay amount={canteenData.snackRevenue} />
              </div>
              <div className="text-sm text-yellow-400">Snacks</div>
            </div>
          </div>
        </div>

        {canteenData.pieData.length > 1 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={canteenData.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {canteenData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toFixed(0)}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F9FAFB'
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: '#F9FAFB' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CanteenRevenueWidget;
