
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { DollarSign, CreditCard, Split, Gamepad2, Package } from 'lucide-react';

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

  // Calculate PS5 session sales (proportional to bill total)
  const ps5SessionSales = filteredBills.reduce((sum, bill) => {
    const ps5Items = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('ps5') || 
       item.name.toLowerCase().includes('playstation 5'))
    );
    
    if (ps5Items.length === 0) return sum;
    
    const ps5ItemsTotal = ps5Items.reduce((itemSum, item) => itemSum + item.total, 0);
    
    // Calculate proportional amount based on bill's discount/total ratio
    if (bill.subtotal > 0) {
      const proportionalAmount = (ps5ItemsTotal / bill.subtotal) * bill.total;
      return sum + proportionalAmount;
    }
    
    return sum + ps5ItemsTotal;
  }, 0);

  // Calculate 8-ball session sales (proportional to bill total)
  const eightBallSales = filteredBills.reduce((sum, bill) => {
    const eightBallItems = bill.items.filter(item => 
      item.type === 'session' && 
      (item.name.toLowerCase().includes('8 ball') || 
       item.name.toLowerCase().includes('8-ball') ||
       item.name.toLowerCase().includes('pool'))
    );
    
    if (eightBallItems.length === 0) return sum;
    
    const eightBallItemsTotal = eightBallItems.reduce((itemSum, item) => itemSum + item.total, 0);
    
    // Calculate proportional amount based on bill's discount/total ratio
    if (bill.subtotal > 0) {
      const proportionalAmount = (eightBallItemsTotal / bill.subtotal) * bill.total;
      return sum + proportionalAmount;
    }
    
    return sum + eightBallItemsTotal;
  }, 0);

  // Calculate product sales (proportional to bill total)
  const productSales = filteredBills.reduce((sum, bill) => {
    const productItems = bill.items.filter(item => item.type === 'product');
    
    if (productItems.length === 0) return sum;
    
    const productItemsTotal = productItems.reduce((itemSum, item) => itemSum + item.total, 0);
    
    // Calculate proportional amount based on bill's discount/total ratio
    if (bill.subtotal > 0) {
      const proportionalAmount = (productItemsTotal / bill.subtotal) * bill.total;
      return sum + proportionalAmount;
    }
    
    return sum + productItemsTotal;
  }, 0);

  // Calculate total sales
  const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 mb-6">
      <Card className="bg-gradient-to-br from-gray-900/95 via-red-950/30 to-gray-800/90 border-red-600/40 shadow-xl hover:shadow-red-500/40 hover:border-red-400/60 transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Cash Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center shadow-lg shadow-red-500/20">
            <DollarSign className="h-4 w-4 text-red-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={cashSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 via-blue-950/30 to-gray-800/90 border-blue-600/40 shadow-xl hover:shadow-blue-500/40 hover:border-blue-400/60 transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">UPI Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CreditCard className="h-4 w-4 text-blue-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={upiSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 via-violet-950/30 to-gray-800/90 border-violet-600/40 shadow-xl hover:shadow-violet-500/40 hover:border-violet-400/60 transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Split Payments</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500/30 to-violet-600/20 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Split className="h-4 w-4 text-violet-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={totalSplitSales} />
          </div>
          <div className="text-xs text-gray-300 mt-1">
            <div>Cash: <CurrencyDisplay amount={splitCashAmount} /></div>
            <div>UPI: <CurrencyDisplay amount={splitUpiAmount} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 via-cyan-950/30 to-gray-800/90 border-cyan-600/40 shadow-xl hover:shadow-cyan-500/40 hover:border-cyan-400/60 transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">PS5 Sessions</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Gamepad2 className="h-4 w-4 text-cyan-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={ps5SessionSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 via-amber-950/30 to-gray-800/90 border-amber-600/40 shadow-xl hover:shadow-amber-500/40 hover:border-amber-400/60 transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">8-Ball Sessions</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Gamepad2 className="h-4 w-4 text-amber-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={eightBallSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 via-rose-950/30 to-gray-800/90 border-rose-600/40 shadow-xl hover:shadow-rose-500/40 hover:border-rose-400/60 transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Product Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-500/30 to-rose-600/20 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Package className="h-4 w-4 text-rose-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={productSales} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-gray-900/95 via-emerald-950/30 to-gray-800/90 border-emerald-600/40 shadow-xl hover:shadow-emerald-500/40 hover:border-emerald-400/60 transition-all duration-300 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-white">Total Sales</CardTitle>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <DollarSign className="h-4 w-4 text-emerald-400 drop-shadow-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-white drop-shadow-sm">
            <CurrencyDisplay amount={totalSales} />
          </div>
          <div className="text-xs text-gray-300 mt-1">
            Verification: <CurrencyDisplay amount={ps5SessionSales + eightBallSales + productSales} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesWidgets;
