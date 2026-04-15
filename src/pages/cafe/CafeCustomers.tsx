import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafeCustomers } from '@/hooks/cafe/useCafeCustomers';
import type { Customer } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search, User, Phone, Mail, Star, CreditCard, Clock, Hash, Copy,
  ShoppingCart, Coffee, TrendingUp, Calendar, ChefHat, Award,
  ArrowUpRight, ArrowDownRight, X, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CafeCustomerSpend {
  customerId: string;
  totalCafeSpent: number;
  totalCafeOrders: number;
  lastCafeOrder?: Date;
  avgOrderValue: number;
  favoriteItems: { name: string; count: number }[];
}

const CafeCustomers: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders } = useCafeOrders(user?.locationId);
  const { customers } = useCafeCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'cafe_spent' | 'total_spent' | 'loyalty'>('cafe_spent');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Aggregate cafe spend per customer from orders
  const cafeSpendMap = useMemo(() => {
    const map = new Map<string, CafeCustomerSpend>();

    orders.filter(o => o.status === 'completed' && o.customerId).forEach(order => {
      const cid = order.customerId!;
      const existing = map.get(cid) || {
        customerId: cid,
        totalCafeSpent: 0,
        totalCafeOrders: 0,
        avgOrderValue: 0,
        favoriteItems: [],
        lastCafeOrder: undefined,
      };
      existing.totalCafeSpent += order.total;
      existing.totalCafeOrders += 1;
      const orderDate = new Date(order.createdAt);
      if (!existing.lastCafeOrder || orderDate > existing.lastCafeOrder) {
        existing.lastCafeOrder = orderDate;
      }
      map.set(cid, existing);
    });

    // Calculate avg
    map.forEach(v => { v.avgOrderValue = v.totalCafeOrders > 0 ? v.totalCafeSpent / v.totalCafeOrders : 0; });
    return map;
  }, [orders]);

  // Merge customers with cafe data
  const enrichedCustomers = useMemo(() => {
    return customers.map(c => ({
      ...c,
      cafeData: cafeSpendMap.get(c.id) || {
        customerId: c.id, totalCafeSpent: 0, totalCafeOrders: 0, avgOrderValue: 0, favoriteItems: [], lastCafeOrder: undefined,
      },
    }));
  }, [customers, cafeSpendMap]);

  const filteredCustomers = useMemo(() => {
    let result = enrichedCustomers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(searchQuery) ||
        c.email?.toLowerCase().includes(q) ||
        c.customerId?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'cafe_spent': return b.cafeData.totalCafeSpent - a.cafeData.totalCafeSpent;
        case 'total_spent': return b.totalSpent - a.totalSpent;
        case 'loyalty': return b.loyaltyPoints - a.loyaltyPoints;
        default: return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [enrichedCustomers, searchQuery, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const withCafe = enrichedCustomers.filter(c => c.cafeData.totalCafeOrders > 0);
    const totalCafeRevenue = withCafe.reduce((s, c) => s + c.cafeData.totalCafeSpent, 0);
    const totalCafeOrders = withCafe.reduce((s, c) => s + c.cafeData.totalCafeOrders, 0);
    return {
      totalCustomers: customers.length,
      cafeCustomers: withCafe.length,
      totalCafeRevenue,
      totalCafeOrders,
      avgPerCustomer: withCafe.length > 0 ? totalCafeRevenue / withCafe.length : 0,
    };
  }, [enrichedCustomers, customers]);

  const handleViewCustomer = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('cafe_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        setCustomerOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedCafeData = selectedCustomerId ? cafeSpendMap.get(selectedCustomerId) : null;

  const getInitials = (name: string) => name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-5 overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down">Cafe Customers</h1>
        <span className="text-xs text-gray-500 font-quicksand">{stats.totalCustomers} customers in system</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Customers', value: stats.totalCustomers, icon: User, color: 'text-blue-400', type: 'number' },
          { label: 'Cafe Customers', value: stats.cafeCustomers, icon: Coffee, color: 'text-orange-400', type: 'number' },
          { label: 'Cafe Revenue', value: stats.totalCafeRevenue, icon: CreditCard, color: 'text-green-400', type: 'currency' },
          { label: 'Cafe Orders', value: stats.totalCafeOrders, icon: ShoppingCart, color: 'text-purple-400', type: 'number' },
          { label: 'Avg per Customer', value: stats.avgPerCustomer, icon: TrendingUp, color: 'text-cyan-400', type: 'currency' },
        ].map((stat, i) => (
          <Card key={stat.label} className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/30 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
            <CardContent className="p-3">
              <stat.icon className={`h-4 w-4 ${stat.color} mb-1.5`} />
              <p className={`text-lg font-bold ${stat.color} font-heading`}>
                {stat.type === 'currency' ? <CurrencyDisplay amount={stat.value as number} /> : stat.value}
              </p>
              <p className="text-[10px] text-gray-500 font-quicksand">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, email, ID..." className="pl-8 font-quicksand"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5"><X className="h-4 w-4 text-gray-500" /></button>
          )}
        </div>
        <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
          {([
            { key: 'cafe_spent' as const, label: 'Cafe Spent' },
            { key: 'total_spent' as const, label: 'Total Spent' },
            { key: 'loyalty' as const, label: 'Points' },
            { key: 'name' as const, label: 'Name' },
          ]).map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-quicksand transition-all ${
                sortBy === s.key ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Grid */}
      <ScrollArea className="h-[calc(100vh-22rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer, index) => (
            <Card key={customer.id}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-1 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 backdrop-blur-sm animate-scale-in"
              style={{ animationDelay: `${(index % 9) * 50}ms` }}>
              {customer.cafeData.totalCafeOrders > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}

              <CardHeader className="pb-3 relative z-10">
                {customer.customerId && (
                  <div className="flex items-center justify-between mb-2 p-1.5 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-md border border-purple-500/20">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Hash className="h-3 w-3 text-purple-400 flex-shrink-0" />
                      <span className="text-xs font-mono font-bold text-purple-300 truncate">{customer.customerId}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-orange-500/20 group-hover:ring-orange-500/40 transition-all flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-orange-600 to-cuephoria-purple text-white font-semibold text-xs">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{customer.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400 font-mono">{customer.phone}</span>
                    </div>
                    {customer.isMember && (
                      <span className="text-[10px] text-green-400 font-medium mt-0.5 inline-block">Active Member</span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 relative z-10 px-4">
                {/* Cafe-specific data */}
                <div className="p-2.5 bg-gradient-to-r from-orange-900/20 to-transparent rounded-lg border border-orange-500/15">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Coffee className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs text-orange-400 font-quicksand font-medium">Cafe Activity</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={customer.cafeData.totalCafeSpent} /></p>
                      <p className="text-[9px] text-gray-500">Spent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">{customer.cafeData.totalCafeOrders}</p>
                      <p className="text-[9px] text-gray-500">Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-cyan-400"><CurrencyDisplay amount={customer.cafeData.avgOrderValue} /></p>
                      <p className="text-[9px] text-gray-500">Avg</p>
                    </div>
                  </div>
                </div>

                {/* Overall stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center p-2 bg-gray-800/30 rounded-lg text-center">
                    <Star className="h-3.5 w-3.5 text-yellow-400 mb-0.5" />
                    <span className="text-sm font-semibold text-yellow-400">{customer.loyaltyPoints}</span>
                    <span className="text-[9px] text-gray-500">Points</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-gray-800/30 rounded-lg text-center">
                    <CreditCard className="h-3.5 w-3.5 text-green-400 mb-0.5" />
                    <span className="text-sm font-semibold text-green-400"><CurrencyDisplay amount={customer.totalSpent} /></span>
                    <span className="text-[9px] text-gray-500">Total Spent</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-4 px-4 relative z-10">
                <Button className="w-full bg-gradient-to-r from-orange-600 to-cuephoria-purple hover:from-orange-700 hover:to-cuephoria-purple/80 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-xs h-9"
                  onClick={() => handleViewCustomer(customer.id)}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> View Cafe Orders
                </Button>
              </CardFooter>
            </Card>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-quicksand text-lg">No customers found</p>
              <p className="font-quicksand text-sm text-gray-600 mt-1">Try a different search</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomerId} onOpenChange={() => setSelectedCustomerId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Coffee className="h-5 w-5 text-orange-400" />
              {selectedCustomer?.name} — Cafe History
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Customer info */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-transparent rounded-lg border border-orange-500/10">
                <Avatar className="h-12 w-12 ring-2 ring-orange-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-orange-600 to-cuephoria-purple text-white font-semibold">
                    {getInitials(selectedCustomer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
                  {selectedCustomer.email && <p className="text-xs text-gray-500">{selectedCustomer.email}</p>}
                </div>
                {selectedCustomer.isMember && (
                  <span className="ml-auto bg-cuephoria-purple text-white text-xs px-2 py-1 rounded">Member</span>
                )}
              </div>

              {/* Cafe Summary */}
              {selectedCafeData && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-orange-500/5 rounded-lg text-center border border-orange-500/10">
                    <p className="text-lg font-bold text-orange-400 font-heading"><CurrencyDisplay amount={selectedCafeData.totalCafeSpent} /></p>
                    <p className="text-[10px] text-gray-500">Cafe Spent</p>
                  </div>
                  <div className="p-3 bg-blue-500/5 rounded-lg text-center border border-blue-500/10">
                    <p className="text-lg font-bold text-blue-400 font-heading">{selectedCafeData.totalCafeOrders}</p>
                    <p className="text-[10px] text-gray-500">Orders</p>
                  </div>
                  <div className="p-3 bg-green-500/5 rounded-lg text-center border border-green-500/10">
                    <p className="text-lg font-bold text-green-400 font-heading"><CurrencyDisplay amount={selectedCafeData.avgOrderValue} /></p>
                    <p className="text-[10px] text-gray-500">Avg Order</p>
                  </div>
                </div>
              )}

              {/* Order History */}
              <div>
                <h4 className="text-sm font-heading text-white mb-2 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-orange-400" /> Order History
                </h4>
                <ScrollArea className="h-64">
                  {loadingOrders ? (
                    <div className="text-center py-8 text-gray-500"><p className="font-quicksand">Loading...</p></div>
                  ) : customerOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Coffee className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="font-quicksand text-sm">No cafe orders yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.map((order: any) => (
                        <div key={order.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/20">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-white font-heading">{order.order_number}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                              order.status === 'completed' ? 'bg-green-500/20 text-green-400'
                              : order.status === 'cancelled' ? 'bg-red-500/20 text-red-400'
                              : 'bg-orange-500/20 text-orange-400'
                            }`}>{order.status}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500 font-quicksand">
                              {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}
                              {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={Number(order.total)} /></span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                            <span className="capitalize">{order.order_type?.replace('_', ' ')}</span>
                            <span className="capitalize">{order.payment_method}</span>
                            {Number(order.discount) > 0 && <span className="text-green-400">-<CurrencyDisplay amount={Number(order.discount)} /></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CafeCustomers;
