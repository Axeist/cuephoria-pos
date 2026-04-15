import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafeCustomers } from '@/hooks/cafe/useCafeCustomers';
import type { Customer } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search, User, Phone, Star, CreditCard, Hash,
  ShoppingCart, Coffee, TrendingUp, X, Eye, Plus, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CafeCustomerSpend {
  totalCafeSpent: number;
  totalCafeOrders: number;
  avgOrderValue: number;
}

const CafeCustomers: React.FC = () => {
  const { user } = useCafeAuth();
  const { orders } = useCafeOrders(user?.locationId);
  const { customers, addCustomer } = useCafeCustomers();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'cafe_spent' | 'total_spent' | 'loyalty'>('cafe_spent');

  // View customer dialog
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Add customer dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const cafeSpendMap = useMemo(() => {
    const map = new Map<string, CafeCustomerSpend>();
    orders.filter(o => o.status === 'completed' && o.customerId).forEach(order => {
      const cid = order.customerId!;
      const e = map.get(cid) || { totalCafeSpent: 0, totalCafeOrders: 0, avgOrderValue: 0 };
      e.totalCafeSpent += order.total;
      e.totalCafeOrders += 1;
      map.set(cid, e);
    });
    map.forEach(v => { v.avgOrderValue = v.totalCafeOrders > 0 ? v.totalCafeSpent / v.totalCafeOrders : 0; });
    return map;
  }, [orders]);

  const enrichedCustomers = useMemo(() => {
    return customers.map(c => ({
      ...c,
      cafe: cafeSpendMap.get(c.id) || { totalCafeSpent: 0, totalCafeOrders: 0, avgOrderValue: 0 },
    }));
  }, [customers, cafeSpendMap]);

  const filteredCustomers = useMemo(() => {
    let result = enrichedCustomers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) || c.phone.includes(searchQuery) ||
        c.email?.toLowerCase().includes(q) || c.customerId?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'cafe_spent': return b.cafe.totalCafeSpent - a.cafe.totalCafeSpent;
        case 'total_spent': return b.totalSpent - a.totalSpent;
        case 'loyalty': return b.loyaltyPoints - a.loyaltyPoints;
        default: return a.name.localeCompare(b.name);
      }
    });
    return result;
  }, [enrichedCustomers, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const withCafe = enrichedCustomers.filter(c => c.cafe.totalCafeOrders > 0);
    const rev = withCafe.reduce((s, c) => s + c.cafe.totalCafeSpent, 0);
    const ord = withCafe.reduce((s, c) => s + c.cafe.totalCafeOrders, 0);
    return {
      total: customers.length,
      cafeCustomers: withCafe.length,
      revenue: rev,
      orders: ord,
      avg: withCafe.length > 0 ? rev / withCafe.length : 0,
    };
  }, [enrichedCustomers, customers]);

  const handleViewCustomer = async (id: string) => {
    setSelectedCustomerId(id);
    setLoadingOrders(true);
    try {
      const { data } = await supabase.from('cafe_orders').select('*').eq('customer_id', id)
        .order('created_at', { ascending: false }).limit(50);
      setCustomerOrders(data || []);
    } catch { /* ignore */ }
    finally { setLoadingOrders(false); }
  };

  const handleAddCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) { toast.error('Name and phone are required'); return; }
    if (newPhone.replace(/\D/g, '').length < 10) { toast.error('Enter a valid 10-digit phone'); return; }
    setIsAdding(true);
    try {
      const c = await addCustomer({ name: newName.trim(), phone: newPhone.trim(), email: newEmail.trim() || undefined });
      if (c) {
        toast.success(`${c.name} added successfully (ID: ${c.customerId})`);
        setIsAddOpen(false);
        setNewName(''); setNewPhone(''); setNewEmail('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add customer');
    } finally { setIsAdding(false); }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedCafe = selectedCustomerId ? cafeSpendMap.get(selectedCustomerId) : null;
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading">Cafe Customers</h1>
        <Button onClick={() => setIsAddOpen(true)}
          className="bg-gradient-to-r from-orange-500 to-cuephoria-purple hover:opacity-90 text-white text-xs sm:text-sm h-9 sm:h-10">
          <Plus className="h-4 w-4 mr-1.5" /> Add Customer
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Customers', value: stats.total, icon: User, color: 'text-blue-400', isCurrency: false },
          { label: 'Cafe Customers', value: stats.cafeCustomers, icon: Coffee, color: 'text-orange-400', isCurrency: false },
          { label: 'Cafe Revenue', value: stats.revenue, icon: CreditCard, color: 'text-green-400', isCurrency: true },
          { label: 'Cafe Orders', value: stats.orders, icon: ShoppingCart, color: 'text-purple-400', isCurrency: false },
          { label: 'Avg / Customer', value: stats.avg, icon: TrendingUp, color: 'text-cyan-400', isCurrency: true },
        ].map((s) => (
          <Card key={s.label} className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/30">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className={`text-base font-bold ${s.color} font-heading truncate`}>
                  {s.isCurrency ? <CurrencyDisplay amount={s.value as number} /> : s.value}
                </p>
                <p className="text-[10px] text-gray-500 font-quicksand truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, email, ID..." className="pl-8 font-quicksand h-9"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
        <div className="flex gap-0.5 bg-gray-800/50 rounded-lg p-0.5">
          {([
            { key: 'cafe_spent' as const, label: 'Cafe Spent' },
            { key: 'total_spent' as const, label: 'Total Spent' },
            { key: 'loyalty' as const, label: 'Points' },
            { key: 'name' as const, label: 'Name' },
          ]).map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-quicksand transition-all ${
                sortBy === s.key ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'
              }`}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500 font-quicksand ml-auto flex-shrink-0">
          {filteredCustomers.length} of {customers.length}
        </span>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id}
            className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 bg-gradient-to-br from-gray-900/60 to-gray-800/60 border-gray-700/40">

            <CardContent className="p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-orange-500/20 flex-shrink-0">
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
                </div>
                {customer.isMember && (
                  <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex-shrink-0">Member</span>
                )}
              </div>

              {/* Customer ID */}
              {customer.customerId && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-900/20 rounded border border-purple-500/15 text-[10px] font-mono text-purple-300">
                  <Hash className="h-3 w-3 flex-shrink-0" /> {customer.customerId}
                </div>
              )}

              {/* Cafe activity */}
              <div className="p-2.5 bg-orange-500/5 rounded-lg border border-orange-500/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Coffee className="h-3 w-3 text-orange-400" />
                  <span className="text-[10px] text-orange-400 font-quicksand font-medium">Cafe Activity</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={customer.cafe.totalCafeSpent} /></p>
                    <p className="text-[9px] text-gray-500">Spent</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{customer.cafe.totalCafeOrders}</p>
                    <p className="text-[9px] text-gray-500">Orders</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-cyan-400"><CurrencyDisplay amount={customer.cafe.avgOrderValue} /></p>
                    <p className="text-[9px] text-gray-500">Avg</p>
                  </div>
                </div>
              </div>

              {/* Overall stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg">
                  <Star className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-400">{customer.loyaltyPoints}</p>
                    <p className="text-[9px] text-gray-500">Points</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg">
                  <CreditCard className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-400"><CurrencyDisplay amount={customer.totalSpent} /></p>
                    <p className="text-[9px] text-gray-500">Total Spent</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="px-4 pb-4 pt-0">
              <Button className="w-full bg-gradient-to-r from-orange-600 to-cuephoria-purple hover:opacity-90 text-white border-0 text-xs h-8"
                onClick={() => handleViewCustomer(customer.id)}>
                <Eye className="h-3.5 w-3.5 mr-1.5" /> View Cafe Orders
              </Button>
            </CardFooter>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-quicksand text-lg">No customers found</p>
            <p className="font-quicksand text-sm text-gray-600 mt-1">Try a different search or add a new customer</p>
          </div>
        )}
      </div>

      {/* ===== ADD CUSTOMER DIALOG ===== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-400" /> Add New Customer
            </DialogTitle>
            <DialogDescription>
              Customer will be added to the central database and visible across all branches.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Name *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                className="font-quicksand" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Phone *</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="10-digit phone number"
                className="font-quicksand" type="tel" maxLength={15} />
            </div>
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Email (optional)</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com"
                className="font-quicksand" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setNewName(''); setNewPhone(''); setNewEmail(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} disabled={isAdding || !newName.trim() || !newPhone.trim()}
              className="bg-gradient-to-r from-orange-500 to-cuephoria-purple hover:opacity-90">
              {isAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4 mr-1" /> Add Customer</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== VIEW CUSTOMER DIALOG ===== */}
      <Dialog open={!!selectedCustomerId} onOpenChange={() => setSelectedCustomerId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Coffee className="h-5 w-5 text-orange-400" />
              {selectedCustomer?.name} — Cafe History
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-transparent rounded-lg border border-orange-500/10">
                <Avatar className="h-12 w-12 ring-2 ring-orange-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-orange-600 to-cuephoria-purple text-white font-semibold">
                    {getInitials(selectedCustomer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
                  {selectedCustomer.email && <p className="text-xs text-gray-500">{selectedCustomer.email}</p>}
                </div>
                {selectedCustomer.isMember && (
                  <span className="bg-cuephoria-purple text-white text-xs px-2 py-1 rounded">Member</span>
                )}
              </div>

              {selectedCafe && selectedCafe.totalCafeOrders > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-orange-500/5 rounded-lg text-center border border-orange-500/10">
                    <p className="text-lg font-bold text-orange-400"><CurrencyDisplay amount={selectedCafe.totalCafeSpent} /></p>
                    <p className="text-[10px] text-gray-500">Cafe Spent</p>
                  </div>
                  <div className="p-3 bg-blue-500/5 rounded-lg text-center border border-blue-500/10">
                    <p className="text-lg font-bold text-blue-400">{selectedCafe.totalCafeOrders}</p>
                    <p className="text-[10px] text-gray-500">Orders</p>
                  </div>
                  <div className="p-3 bg-green-500/5 rounded-lg text-center border border-green-500/10">
                    <p className="text-lg font-bold text-green-400"><CurrencyDisplay amount={selectedCafe.avgOrderValue} /></p>
                    <p className="text-[10px] text-gray-500">Avg Order</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-heading text-white mb-2 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-orange-400" /> Order History
                </h4>
                <ScrollArea className="h-60">
                  {loadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                    </div>
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
