
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { DollarSign, CreditCard, Split, Gamepad2 } from 'lucide-react';

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  type: 'product' | 'session';
}

interface Bill {
  id: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  discountValue?: number;
  loyaltyPointsUsed?: number;
  total: number;
  paymentMethod: string;
  isSplitPayment?: boolean;
  cashAmount?: number;
  upiAmount?: number;
  createdAt: Date | string;
}

interface SalesWidgetsProps {
  filteredBills: Bill[];
}

const SalesWidgets: React.FC<SalesWidgetsProps> = ({ filteredBills }) => {
  // Calculate cash sales
  const cashSales = filteredBills
    .filter(bill => bill.paymentMethod === 'cash')
    .reduce((sum, bill) => sum + bill.total, 0);

  // Calculate UPI sales
  const upiSales = filteredBills
    .filter(bill => bill.paymentMethod === 'upi')
    .reduce((sum, bill) => sum + bill.total, 0);

  // Calculate split payment details
  const splitPaymentBills = filteredBills.filter(bill => bill.paymentMethod === 'split' || bill.isSplitPayment);
  const splitCashAmount = splitPaymentBills.reduce((sum, bill) => sum + (bill.cashAmount || 0), 0);
  const splitUpiAmount = splitPaymentBills.reduce((sum, bill) => sum + (bill.upiAmount || 0), 0);
  const totalSplitSales = splitCashAmount + splitUpiAmount;

  // Calculate PS5 session sales
  const ps5SessionSales = filteredBills.reduce((sum, bill) => {
    const ps5Items = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('ps5') || 
       item.name.toLowerCase().includes('playstation 5'))
    );
    return sum + ps5Items.reduce((itemSum, item) => itemSum + item.total, 0);
  }, 0);

  // Calculate 8-ball session sales
  const eightBallSales = filteredBills.reduce((sum, bill) => {
    const eightBallItems = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('8 ball') || 
       item.name.toLowerCase().includes('8-ball') ||
       item.name.toLowerCase().includes('pool'))
    );
    return sum + eightBallItems.reduce((itemSum, item) => itemSum + item.total, 0);
  }, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">Cash Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={cashSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">UPI Sales</CardTitle>
          <CreditCard className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={upiSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">Split Payments</CardTitle>
          <Split className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={totalSplitSales} />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            <div>Cash: <CurrencyDisplay amount={splitCashAmount} /></div>
            <div>UPI: <CurrencyDisplay amount={splitUpiAmount} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">PS5 Sessions</CardTitle>
          <Gamepad2 className="h-4 w-4 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={ps5SessionSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">8-Ball Sessions</CardTitle>
          <Gamepad2 className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={eightBallSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-white">Total Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={filteredBills.reduce((sum, bill) => sum + bill.total, 0)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesWidgets;
