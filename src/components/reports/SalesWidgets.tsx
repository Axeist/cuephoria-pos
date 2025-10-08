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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 mb-6">
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-red-500/30 hover:border-red-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Cash Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-red-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={cashSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-blue-500/30 hover:border-blue-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">UPI Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={upiSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-orange-500/30 hover:border-orange-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Credit Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
            <HandCoins className="h-4 w-4 text-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={creditSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-purple-500/30 hover:border-purple-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Split Payments</CardTitle>
          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Split className="h-4 w-4 text-purple-400" />
          </div>
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

      {/* NEW: Complimentary Widget - Separate from revenue */}
      <Card className="bg-gradient-to-br from-amber-950/40 to-orange-950/30 border-amber-700/50 shadow-xl hover:shadow-amber-500/30 hover:border-amber-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-amber-100">Complimentary</CardTitle>
          <div className="h-8 w-8 rounded-full bg-amber-500/30 flex items-center justify-center">
            <Gift className="h-4 w-4 text-amber-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-amber-400">
            <CurrencyDisplay amount={complimentarySales} />
          </div>
          <div className="text-xs text-amber-300/70 mt-1">
            <div>{complimentaryCount} transactions</div>
            <div>{complimentaryItems} items given</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-cyan-500/30 hover:border-cyan-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">PS5 Sessions</CardTitle>
          <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <Gamepad2 className="h-4 w-4 text-cyan-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={ps5SessionSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-yellow-500/30 hover:border-yellow-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">8-Ball Sessions</CardTitle>
          <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Gamepad2 className="h-4 w-4 text-yellow-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={eightBallSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-pink-500/30 hover:border-pink-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Product Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Package className="h-4 w-4 text-pink-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={productSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl hover:shadow-emerald-500/30 hover:border-emerald-400/40 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Total Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white">
            <CurrencyDisplay amount={totalSales} />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Paid transactions only
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesWidgets;
