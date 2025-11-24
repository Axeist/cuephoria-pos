import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { DollarSign, CreditCard, Split, Gamepad2, Package, HandCoins, Gift } from 'lucide-react';

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
  compNote?: string;
  createdAt: Date | string;
}

interface SalesWidgetsProps {
  filteredBills: Bill[];
}

const SalesWidgets: React.FC<SalesWidgetsProps> = ({ filteredBills }) => {
  // SEPARATE complimentary bills from paid bills
  const complimentaryBills = filteredBills.filter(bill => 
    bill.paymentMethod?.toLowerCase() === 'complimentary'
  );
  
  const paidBills = filteredBills.filter(bill => 
    bill.paymentMethod?.toLowerCase() !== 'complimentary'
  );

  // Calculate complimentary sales metrics
  const complimentarySales = complimentaryBills.reduce((sum, bill) => sum + bill.total, 0);
  const complimentaryCount = complimentaryBills.length;
  const complimentaryItems = complimentaryBills.reduce((sum, bill) => 
    sum + bill.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  // Calculate cash sales (EXCLUDING complimentary)
  const cashSales = paidBills
    .filter(bill => bill.paymentMethod === 'cash')
    .reduce((sum, bill) => sum + bill.total, 0);

  // Calculate UPI sales (EXCLUDING complimentary)
  const upiSales = paidBills
    .filter(bill => bill.paymentMethod === 'upi')
    .reduce((sum, bill) => sum + bill.total, 0);

  // Calculate credit sales (EXCLUDING complimentary)
  const creditSales = paidBills
    .filter(bill => bill.paymentMethod === 'credit')
    .reduce((sum, bill) => sum + bill.total, 0);

  // Calculate Razorpay sales (EXCLUDING complimentary)
  const razorpaySales = paidBills
    .filter(bill => bill.paymentMethod === 'razorpay')
    .reduce((sum, bill) => sum + bill.total, 0);

  // Calculate split payment details (EXCLUDING complimentary)
  const splitPaymentBills = paidBills.filter(bill => bill.paymentMethod === 'split' || bill.isSplitPayment);
  const splitCashAmount = splitPaymentBills.reduce((sum, bill) => sum + (bill.cashAmount || 0), 0);
  const splitUpiAmount = splitPaymentBills.reduce((sum, bill) => sum + (bill.upiAmount || 0), 0);
  const totalSplitSales = splitCashAmount + splitUpiAmount;

  // Calculate PS5 session sales (proportional to bill total) - EXCLUDING complimentary
  const ps5SessionSales = paidBills.reduce((sum, bill) => {
    const ps5Items = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('ps5') || 
       item.name.toLowerCase().includes('playstation 5'))
    );
    
    if (ps5Items.length === 0) return sum;
    
    const ps5ItemsTotal = ps5Items.reduce((itemSum, item) => itemSum + item.total, 0);
    
    if (bill.subtotal > 0) {
      const proportionalAmount = (ps5ItemsTotal / bill.subtotal) * bill.total;
      return sum + proportionalAmount;
    }
    
    return sum + ps5ItemsTotal;
  }, 0);

  // Calculate 8-ball session sales (proportional to bill total) - EXCLUDING complimentary
  const eightBallSales = paidBills.reduce((sum, bill) => {
    const eightBallItems = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('8 ball') || 
       item.name.toLowerCase().includes('8-ball') ||
       item.name.toLowerCase().includes('pool'))
    );
    
    if (eightBallItems.length === 0) return sum;
    
    const eightBallItemsTotal = eightBallItems.reduce((itemSum, item) => itemSum + item.total, 0);
    
    if (bill.subtotal > 0) {
      const proportionalAmount = (eightBallItemsTotal / bill.subtotal) * bill.total;
      return sum + proportionalAmount;
    }
    
    return sum + eightBallItemsTotal;
  }, 0);

  // Calculate product sales (proportional to bill total) - EXCLUDING complimentary
  const productSales = paidBills.reduce((sum, bill) => {
    const productItems = bill.items.filter(item => item.type === 'product');
    
    if (productItems.length === 0) return sum;
    
    const productItemsTotal = productItems.reduce((itemSum, item) => itemSum + item.total, 0);
    
    if (bill.subtotal > 0) {
      const proportionalAmount = (productItemsTotal / bill.subtotal) * bill.total;
      return sum + proportionalAmount;
    }
    
    return sum + productItemsTotal;
  }, 0);

  // Calculate total PAID sales (EXCLUDING complimentary)
  const totalSales = paidBills.reduce((sum, bill) => sum + bill.total, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 mb-8">
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-red-500/30 hover:border-red-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Cash Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-red-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={cashSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-blue-500/30 hover:border-blue-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">UPI Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={upiSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-orange-500/30 hover:border-orange-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Credit Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <HandCoins className="h-5 w-5 text-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={creditSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-indigo-500/30 hover:border-indigo-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Razorpay Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-indigo-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={razorpaySales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-purple-500/30 hover:border-purple-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Split Payments</CardTitle>
          <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Split className="h-5 w-5 text-purple-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white mb-2">
            <CurrencyDisplay amount={totalSplitSales} />
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <div>Cash: <CurrencyDisplay amount={splitCashAmount} /></div>
            <div>UPI: <CurrencyDisplay amount={splitUpiAmount} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-950/40 to-orange-950/30 border-amber-700/50 shadow-xl hover:shadow-amber-500/30 hover:border-amber-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-amber-100">Complimentary</CardTitle>
          <div className="h-10 w-10 rounded-full bg-amber-500/30 flex items-center justify-center">
            <Gift className="h-5 w-5 text-amber-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-400 mb-2">
            <CurrencyDisplay amount={complimentarySales} />
          </div>
          <div className="text-xs text-amber-300/70 space-y-0.5">
            <div>{complimentaryCount} transactions</div>
            <div>{complimentaryItems} items given</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-cyan-500/30 hover:border-cyan-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">PS5 Sessions</CardTitle>
          <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-cyan-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={ps5SessionSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-yellow-500/30 hover:border-yellow-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">8-Ball Sessions</CardTitle>
          <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-yellow-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={eightBallSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-pink-500/30 hover:border-pink-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Product Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Package className="h-5 w-5 text-pink-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">
            <CurrencyDisplay amount={productSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-emerald-500/30 hover:border-emerald-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-white/90">Total Sales</CardTitle>
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white mb-2">
            <CurrencyDisplay amount={totalSales} />
          </div>
          <p className="text-xs text-gray-400">
            Paid transactions only
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesWidgets;
