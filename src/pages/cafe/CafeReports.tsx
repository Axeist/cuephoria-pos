import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { useCafeSettlements } from '@/hooks/cafe/useCafeSettlements';
import { CurrencyDisplay } from '@/components/ui/currency';
import { BarChart2, TrendingUp, DollarSign, ShoppingCart, Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const CafeReports: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders } = useCafeOrders(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const { settlements, generateSettlement, updateSettlementStatus } = useCafeSettlements(user?.locationId, partner?.id);
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);

  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);

  const summary = useMemo(() => {
    const totalRevenue = completedOrders.reduce((s, o) => s + o.total, 0);
    const partnerShare = completedOrders.reduce((s, o) => s + o.partnerShare, 0);
    const cuephoriaShare = completedOrders.reduce((s, o) => s + o.cuephoriaShare, 0);
    const totalDiscount = completedOrders.reduce((s, o) => s + o.discount, 0);
    const avgOrder = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const cashOrders = completedOrders.filter(o => o.paymentMethod === 'cash');
    const upiOrders = completedOrders.filter(o => o.paymentMethod === 'upi');
    const selfOrders = completedOrders.filter(o => o.orderSource === 'customer');

    return { totalRevenue, partnerShare, cuephoriaShare, totalDiscount, avgOrder, totalOrders: completedOrders.length, cashOrders: cashOrders.length, upiOrders: upiOrders.length, selfOrders: selfOrders.length };
  }, [completedOrders]);

  const handleGenerateSettlement = async () => {
    if (!partner) return;
    const result = await generateSettlement(settlementDate, partner.id);
    if (result) toast.success(`Settlement generated for ${settlementDate}`);
    else toast.error('Failed to generate settlement');
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down">Reports</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: summary.totalRevenue, icon: DollarSign, color: 'text-green-400', type: 'currency' },
          { label: 'Total Orders', value: summary.totalOrders, icon: ShoppingCart, color: 'text-blue-400', type: 'number' },
          { label: 'Avg Order', value: summary.avgOrder, icon: TrendingUp, color: 'text-orange-400', type: 'currency' },
          { label: 'Self-Orders', value: summary.selfOrders, icon: Clock, color: 'text-purple-400', type: 'number' },
        ].map((stat, i) => (
          <Card key={stat.label} className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-xs text-gray-400 font-quicksand">{stat.label}</p>
              </div>
              <p className={`text-xl font-bold ${stat.color} font-heading`}>
                {stat.type === 'currency' ? <CurrencyDisplay amount={stat.value} /> : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Breakdown */}
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader><CardTitle className="text-base font-heading text-white flex items-center gap-2"><BarChart2 className="h-5 w-5 text-orange-400" /> Payment Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800/30 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400 font-heading">{summary.cashOrders}</p>
              <p className="text-xs text-gray-400 font-quicksand">Cash</p>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-400 font-heading">{summary.upiOrders}</p>
              <p className="text-xs text-gray-400 font-quicksand">UPI</p>
            </div>
            <div className="p-4 bg-gray-800/30 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-400 font-heading"><CurrencyDisplay amount={summary.totalDiscount} /></p>
              <p className="text-xs text-gray-400 font-quicksand">Total Discount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlements */}
      <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-400" /> Settlements
          </CardTitle>
          <div className="flex items-center gap-2">
            <input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)}
              className="h-8 px-2 rounded-md bg-gray-800/50 border border-gray-700 text-white text-xs" />
            <Button size="sm" onClick={handleGenerateSettlement}
              className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0 text-xs">
              Generate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <p className="text-sm text-gray-500 font-quicksand text-center py-6">No settlements yet</p>
          ) : (
            <div className="space-y-2">
              {settlements.map(s => (
                <div key={s.id} className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white font-quicksand flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" /> {s.settlementDate}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{s.totalOrders} orders &middot; Revenue: <CurrencyDisplay amount={s.netRevenue} /></p>
                    <div className="flex gap-4 mt-1 text-xs">
                      <span className="text-orange-400">Partner: <CurrencyDisplay amount={s.partnerPayout} /></span>
                      <span className="text-cuephoria-lightpurple">Cuephoria: <CurrencyDisplay amount={s.cuephoriaRevenue} /></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      s.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{s.status}</span>
                    {s.status === 'draft' && user?.role === 'cafe_admin' && (
                      <Button size="sm" onClick={() => updateSettlementStatus(s.id, 'confirmed')}
                        className="h-7 text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Confirm
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CafeReports;
