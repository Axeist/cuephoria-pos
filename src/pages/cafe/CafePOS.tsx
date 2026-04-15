import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeMenu } from '@/hooks/cafe/useCafeMenu';
import { useCafeTables } from '@/hooks/cafe/useCafeTables';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { CafeCartItem, CafeOrderType, CafePaymentMethod } from '@/types/cafe.types';
import { ShoppingCart, Plus, Minus, Trash2, Coffee, Leaf, X, ChefHat, User, Search, MapPin, Monitor, UtensilsCrossed, CreditCard, Banknote, SplitSquareHorizontal } from 'lucide-react';
import { toast } from 'sonner';

const CafePOS: React.FC = () => {
  const { user } = useCafeAuth();
  const { categories, items } = useCafeMenu(user?.locationId);
  const { tables, tablesByZone, zones, assignTable } = useCafeTables(user?.locationId);
  const { createOrder } = useCafeOrders(user?.locationId);
  const { generateKOT } = useCafeKOT(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);

  const [cart, setCart] = useState<CafeCartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<CafeOrderType>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<CafePaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const activeCategories = categories.filter(c => c.isActive);
  const displayCategory = activeCategory || activeCategories[0]?.id;

  const filteredItems = useMemo(() => {
    let result = items.filter(i => i.isAvailable);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    } else if (displayCategory) {
      result = result.filter(i => i.categoryId === displayCategory);
    }
    return result;
  }, [items, displayCategory, searchQuery]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const addToCart = useCallback((item: typeof items[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id
          ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
          : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, total: item.price, isVeg: item.isVeg }];
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menuItemId !== menuItemId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      return { ...c, quantity: newQty, total: newQty * c.price };
    }));
  }, []);

  const removeFromCart = useCallback((menuItemId: string) => {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  }, []);

  const updateItemNotes = useCallback((menuItemId: string, notes: string) => {
    setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, notes } : c));
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (!user || !partner || cart.length === 0) return;
    if (orderType === 'dine_in' && !selectedTableId) {
      toast.error('Please select a table');
      return;
    }
    if (paymentMethod === 'pending') {
      toast.error('Please select a payment method');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder({
        locationId: user.locationId,
        partnerId: partner.id,
        partnerRate: partner.partnerRate,
        cuephoriaRate: partner.cuephoriaRate,
        orderType,
        orderSource: 'pos',
        cafeTableId: orderType === 'dine_in' ? selectedTableId : null,
        customerName: customerName || undefined,
        items: cart,
        paymentMethod,
        createdBy: user.id,
      });

      if (order) {
        // Assign table if dine-in
        if (orderType === 'dine_in' && selectedTableId) {
          const assigned = await assignTable(selectedTableId, order.id);
          if (!assigned) {
            toast.warning('Table was just taken by someone else. Order created without table assignment.');
          }
        }

        // Generate KOT
        await generateKOT(order.id, cart, user.id);

        toast.success(`Order ${order.orderNumber} placed!`);

        // Reset
        setCart([]);
        setSelectedTableId(null);
        setCustomerName('');
        setShowPayment(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, partner, cart, orderType, selectedTableId, customerName, paymentMethod, createOrder, assignTable, generateKOT]);

  const categoryColors: Record<number, string> = {
    0: 'bg-orange-500 shadow-orange-500/30',
    1: 'bg-cuephoria-purple shadow-cuephoria-purple/30',
    2: 'bg-cuephoria-blue shadow-cuephoria-blue/30',
    3: 'bg-green-500 shadow-green-500/30',
    4: 'bg-red-500 shadow-red-500/30',
    5: 'bg-violet-500 shadow-violet-500/30',
  };

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading animate-slide-down mb-4">
        Cafe POS
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        {/* Cart Panel (Left) */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl flex flex-col animate-slide-up">
          <CardHeader className="pb-3 border-b border-gray-700/30">
            <CardTitle className="text-base font-heading text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-400" />
              Order <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">{cartCount} items</span>
            </CardTitle>

            {/* Order Type */}
            <div className="flex gap-1 p-1 rounded-lg bg-gray-800/50 mt-2">
              {([
                { type: 'dine_in' as const, label: 'Dine In', icon: UtensilsCrossed },
                { type: 'takeaway' as const, label: 'Takeaway', icon: Coffee },
                { type: 'delivery_to_station' as const, label: 'To Station', icon: Monitor },
              ]).map(t => (
                <button key={t.type} onClick={() => { setOrderType(t.type); setSelectedTableId(null); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-quicksand transition-all ${
                    orderType === t.type ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  <t.icon className="h-3 w-3" /> {t.label}
                </button>
              ))}
            </div>

            {/* Table/Station Selector */}
            {orderType === 'dine_in' && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-400">Select Table:</p>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-1.5">
                    {zones.map(zone => (
                      <React.Fragment key={zone}>
                        <span className="text-[10px] text-gray-500 w-full uppercase tracking-wider">{zone}</span>
                        {(tablesByZone[zone] || []).map(table => (
                          <button key={table.id} onClick={() => !table.isOccupied && setSelectedTableId(table.id)}
                            disabled={table.isOccupied}
                            className={`px-2 py-1 rounded text-xs font-quicksand border transition-all ${
                              selectedTableId === table.id
                                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                : table.isOccupied
                                  ? 'bg-red-500/10 border-red-500/30 text-red-400/50 cursor-not-allowed'
                                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-orange-500/30'
                            }`}>
                            {table.tableName}
                          </button>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Customer Name */}
            <div className="mt-2 relative">
              <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer name (optional)" className="h-8 text-xs pl-7 bg-gray-800/50 border-gray-700/50 text-white font-quicksand" />
            </div>
          </CardHeader>

          {/* Cart Items */}
          <ScrollArea className="flex-1 px-4 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-quicksand">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.menuItemId} className="p-2 bg-gray-800/30 rounded-lg border border-gray-700/20 group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate font-quicksand flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500"><CurrencyDisplay amount={item.price} /> each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.menuItemId, -1)} className="h-6 w-6 rounded bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm w-6 text-center text-white font-quicksand">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.menuItemId, 1)} className="h-6 w-6 rounded bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white">
                          <Plus className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeFromCart(item.menuItemId)} className="h-6 w-6 rounded flex items-center justify-center text-gray-500 hover:text-red-400 ml-1">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <Input value={item.notes || ''} onChange={e => updateItemNotes(item.menuItemId, e.target.value)}
                        placeholder="Notes..." className="h-6 text-[10px] bg-transparent border-0 border-b border-gray-700/30 rounded-none px-0 text-gray-400 font-quicksand focus:ring-0" />
                      <span className="text-sm font-bold text-orange-400 ml-2 whitespace-nowrap"><CurrencyDisplay amount={item.total} /></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart Footer */}
          <div className="p-4 border-t border-gray-700/30 space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white font-heading">Total</span>
              <span className="text-orange-400"><CurrencyDisplay amount={cartTotal} /></span>
            </div>

            {showPayment ? (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  {([
                    { method: 'cash' as const, label: 'Cash', icon: Banknote },
                    { method: 'upi' as const, label: 'UPI', icon: CreditCard },
                    { method: 'split' as const, label: 'Split', icon: SplitSquareHorizontal },
                  ]).map(p => (
                    <button key={p.method} onClick={() => setPaymentMethod(p.method)}
                      className={`flex-1 py-2 rounded-lg text-xs font-quicksand flex items-center justify-center gap-1 transition-all ${
                        paymentMethod === p.method ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-gray-800/50 text-gray-400 border border-gray-700/30'
                      }`}>
                      <p.icon className="h-3 w-3" /> {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowPayment(false)} variant="outline" className="flex-1 border-gray-700 text-gray-400 h-10">
                    Back
                  </Button>
                  <Button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0}
                    className="flex-1 h-10 text-white font-quicksand font-semibold border-0"
                    style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
                    {isSubmitting ? 'Placing...' : 'Place Order'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => cart.length > 0 && setShowPayment(true)} disabled={cart.length === 0}
                className="w-full h-11 text-white font-quicksand font-semibold border-0"
                style={{ background: cart.length > 0 ? 'linear-gradient(135deg, #f97316, #6E59A5)' : undefined, boxShadow: cart.length > 0 ? '0 4px 15px rgba(249,115,22,0.3)' : undefined }}>
                <ChefHat className="mr-2 h-4 w-4" /> Checkout
              </Button>
            )}
          </div>
        </Card>

        {/* Menu Panel (Right) */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/50 shadow-xl flex flex-col animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-3 border-b border-gray-700/30">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base font-heading text-white">Menu</CardTitle>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search items..." className="h-8 pl-8 text-xs bg-gray-800/50 border-gray-700/50 text-white font-quicksand" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
            {/* Category Chips */}
            {!searchQuery && (
              <ScrollArea className="w-full mt-2" orientation="horizontal">
                <div className="flex gap-2 pb-1">
                  {activeCategories.map((cat, i) => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-quicksand font-medium whitespace-nowrap transition-all ${
                        displayCategory === cat.id
                          ? `text-white ${categoryColors[i % 6] || 'bg-orange-500 shadow-orange-500/30'} shadow-lg`
                          : 'bg-gray-800/50 text-gray-400 hover:text-white'
                      }`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item, i) => (
                <button key={item.id} onClick={() => addToCart(item)}
                  className="group p-3 rounded-xl bg-gray-800/40 border border-gray-700/30 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 text-left animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                  )}
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium text-white font-quicksand group-hover:text-orange-200 transition-colors leading-tight">
                      {item.name}
                    </p>
                    <span className={`h-3 w-3 rounded-sm border flex-shrink-0 mt-0.5 ${item.isVeg ? 'border-green-400' : 'border-red-400'}`}>
                      <span className={`block h-1.5 w-1.5 rounded-full m-[1.5px] ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={item.price} /></span>
                    <span className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-3 w-3 text-orange-400" />
                    </span>
                  </div>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                  <Coffee className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm font-quicksand">No items found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default CafePOS;
