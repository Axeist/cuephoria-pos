
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { DollarSign, CreditCard, Split, Gamepad2, TrendingUp, Banknote } from 'lucide-react';

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
  // Calculate total sales
  const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
  
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
      {/* Total Sales - Primary metric */}
      <Card className="col-span-full md:col-span-1 bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-2xl font-bold mb-1">
            <CurrencyDisplay amount={totalSales} />
          </div>
          <p className="text-emerald-100 text-xs">
            {filteredBills.length} transactions
          </p>
        </CardContent>
      </Card>

      {/* Cash Sales */}
      <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
            <Banknote className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold">
            <CurrencyDisplay amount={cashSales} />
          </div>
        </CardContent>
      </Card>

      {/* UPI Sales */}
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">UPI Sales</CardTitle>
            <CreditCard className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold">
            <CurrencyDisplay amount={upiSales} />
          </div>
        </CardContent>
      </Card>

      {/* Split Payments */}
      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Split Payments</CardTitle>
            <Split className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold mb-1">
            <CurrencyDisplay amount={totalSplitSales} />
          </div>
          <div className="text-xs text-purple-100 space-y-0.5">
            <div>Cash: <CurrencyDisplay amount={splitCashAmount} /></div>
            <div>UPI: <CurrencyDisplay amount={splitUpiAmount} /></div>
          </div>
        </CardContent>
      </Card>

      {/* PS5 Sessions */}
      <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-0 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">PS5 Sessions</CardTitle>
            <Gamepad2 className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold">
            <CurrencyDisplay amount={ps5SessionSales} />
          </div>
        </CardContent>
      </Card>

      {/* 8-Ball Sessions */}
      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">8-Ball Sessions</CardTitle>
            <Gamepad2 className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold">
            <CurrencyDisplay amount={eightBallSales} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesWidgets;
