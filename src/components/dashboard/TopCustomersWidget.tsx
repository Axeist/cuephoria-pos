
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOS } from '@/context/POSContext';
import { Trophy } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface TopCustomersWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const TopCustomersWidget: React.FC<TopCustomersWidgetProps> = ({ startDate, endDate }) => {
  const { customers, bills } = usePOS();

  // Filter bills by date range if provided
  const filteredBills = bills.filter(bill => {
    if (!startDate && !endDate) return true;
    const billDate = new Date(bill.createdAt);
    if (startDate && billDate < startDate) return false;
    if (endDate && billDate > endDate) return false;
    return true;
  });

  // Calculate customer spending and rank them - show top 15 customers
  const customerStats = customers.map(customer => {
    const customerBills = filteredBills.filter(bill => bill.customerId === customer.id);
    const totalSpent = customerBills.reduce((sum, bill) => sum + bill.total, 0);
    const billCount = customerBills.length;
    
    return {
      ...customer,
      totalSpent,
      billCount,
      avgBill: billCount > 0 ? totalSpent / billCount : 0
    };
  })
  .filter(customer => customer.totalSpent > 0)
  .sort((a, b) => b.totalSpent - a.totalSpent)
  .slice(0, 15);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-medium">Top Customers</CardTitle>
        <Trophy className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-4">
        {customerStats.length > 0 ? (
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-2 pr-4">
              {customerStats.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div className="flex items-center space-x-3">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.billCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      <CurrencyDisplay amount={customer.totalSpent} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg: <CurrencyDisplay amount={customer.avgBill} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            No customer data available for the selected period
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TopCustomersWidget;
