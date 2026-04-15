import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CurrencyDisplay } from '@/components/ui/currency';
import type {
  CafeMenuCategory, CafeMenuCategoryRow, CafeMenuItem, CafeMenuItemRow,
  CafeTable, CafeTableRow, CafeCartItem, CafeOrderRow, CafeOrder,
} from '@/types/cafe.types';
import { transformMenuCategoryRow, transformMenuItemRow, transformTableRow, transformOrderRow } from '@/types/cafe.types';
import {
  Coffee, Plus, Minus, Trash2, ShoppingCart, User, Phone, MapPin, ArrowLeft,
  Loader2, Clock, CheckCircle2, ChefHat, Search, X, History, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

type Step = 'menu' | 'cart' | 'checkout' | 'tracking' | 'history';

const CafeCustomerOrder: React.FC = () => {
  const [categories, setCategories] = useState<CafeMenuCategory[]>([]);
  const [items, setItems] = useState<CafeMenuItem[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CafeCartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('menu');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('pending');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [menuSearch, setMenuSearch] = useState('');
  const [historyPhone, setHistoryPhone] = useState('');
  const [orderHistory, setOrderHistory] = useState<CafeOrder[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [locId, setLocId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cafeLocation = await supabase.from('locations').select('id').eq('slug', 'cafe').single();
        if (!cafeLocation.data) return;
        const locationId = cafeLocation.data.id;
        setLocId(locationId);

        const [catRes, itemRes, tableRes] = await Promise.all([
          supabase.from('cafe_menu_categories').select('*').eq('location_id', locationId).eq('is_active', true).order('sort_order'),
          supabase.from('cafe_menu_items').select('*').eq('location_id', locationId).eq('is_available', true).order('sort_order'),
          supabase.from('cafe_tables').select('*').eq('location_id', locationId).eq('is_active', true).order('zone').order('sort_order'),
        ]);

        if (catRes.data) setCategories(catRes.data.map(r => transformMenuCategoryRow(r as unknown as CafeMenuCategoryRow)));
        if (itemRes.data) setItems(itemRes.data.map(r => transformMenuItemRow(r as unknown as CafeMenuItemRow)));
        if (tableRes.data) setTables(tableRes.data.map(r => transformTableRow(r as unknown as CafeTableRow)));
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('customer-tables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_tables' }, (payload) => {
        if (payload.new) {
          const updated = transformTableRow(payload.new as unknown as CafeTableRow);
          setTables(prev => prev.map(t => t.id === updated.id ? updated : t));
          if (selectedTableId === updated.id && updated.isOccupied) {
            setSelectedTableId(null);
            toast.warning('That table was just taken. Please select another.');
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTableId]);

  useEffect(() => {
    if (!orderId) return;
    const channel: RealtimeChannel = supabase
      .channel(`customer-order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafe_orders', filter: `id=eq.${orderId}` }, (payload) => {
        if (payload.new) setOrderStatus((payload.new as any).status);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const displayCategory = activeCategory || categories[0]?.id;
  const filteredItems = useMemo(() => {
    let result = displayCategory ? items.filter(i => i.categoryId === displayCategory) : items;
    if (menuSearch) {
      const q = menuSearch.toLowerCase();
      result = items.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    return result;
  }, [items, displayCategory, menuSearch]);

  const cartTotal = cart.reduce((s, i) => s + i.total, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const zones = useMemo(() => [...new Set(tables.map(t => t.zone))].sort(), [tables]);

  const addToCart = useCallback((item: CafeMenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, total: item.price, isVeg: item.isVeg }];
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menuItemId !== menuItemId) return c;
      const q = Math.max(0, c.quantity + delta);
      return q === 0 ? c : { ...c, quantity: q, total: q * c.price };
    }).filter(c => c.quantity > 0));
  }, []);

  const removeFromCart = useCallback((menuItemId: string) => {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  }, []);

  const handleFetchHistory = async () => {
    if (!historyPhone || historyPhone.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.from('cafe_orders').select('*')
        .eq('customer_phone', historyPhone).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setOrderHistory((data || []).map(r => transformOrderRow(r as unknown as CafeOrderRow)));
    } catch (err) {
      toast.error('Failed to fetch history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) { toast.error('Please enter your name'); return; }
    if (!customerPhone.trim() || customerPhone.length < 10) { toast.error('Please enter a valid phone number'); return; }
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const cafeLocation = await supabase.from('locations').select('id').eq('slug', 'cafe').single();
      if (!cafeLocation.data) throw new Error('Cafe not found');

      const partnerRes = await supabase.from('cafe_partners').select('id, partner_rate, cuephoria_rate').eq('location_id', cafeLocation.data.id).eq('is_active', true).single();
      if (!partnerRes.data) throw new Error('Cafe not configured');

      const subtotal = cart.reduce((s, i) => s + i.total, 0);
      const total = subtotal;
      const partnerShare = Number(((total * Number(partnerRes.data.partner_rate)) / 100).toFixed(2));
      const cuephoriaShare = Number((total - partnerShare).toFixed(2));

      const { data: orderData, error: orderErr } = await supabase.from('cafe_orders').insert({
        location_id: cafeLocation.data.id,
        partner_id: partnerRes.data.id,
        order_type: isTakeaway ? 'self_order' : 'dine_in',
        order_source: 'customer',
        cafe_table_id: !isTakeaway ? selectedTableId : null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        subtotal, total,
        partner_rate_snapshot: Number(partnerRes.data.partner_rate),
        cuephoria_rate_snapshot: Number(partnerRes.data.cuephoria_rate),
        partner_share: partnerShare,
        cuephoria_share: cuephoriaShare,
        payment_method: 'pending',
        status: 'pending',
      }).select().single();

      if (orderErr) throw orderErr;

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.menuItemId,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.total,
        notes: item.notes || null,
        kot_status: 'pending' as const,
      }));
      await supabase.from('cafe_order_items').insert(orderItems);

      setOrderId(orderData.id);
      setOrderNumber((orderData as any).order_number);
      setOrderStatus('pending');
      setStep('tracking');
      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackingSteps = [
    { key: 'pending', label: 'Order Placed', icon: ShoppingCart },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready', label: 'Ready!', icon: Coffee },
  ];
  const currentStepIndex = trackingSteps.findIndex(s => s.key === orderStatus);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cuephoria-darker">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400 mx-auto" />
          <p className="text-sm text-gray-500 font-quicksand mt-2">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cuephoria-darker">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#1A1F2C] border-b border-gray-700/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step !== 'menu' && step !== 'tracking' && (
            <button onClick={() => setStep(step === 'checkout' ? 'cart' : step === 'history' ? 'menu' : 'menu')} className="p-1.5 rounded-lg hover:bg-gray-700/50">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>
          )}
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-cuephoria-purple flex items-center justify-center">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-cuephoria-lightpurple bg-clip-text text-transparent font-heading">
            Cuephoria Cafe
          </span>
        </div>
        <div className="flex items-center gap-2">
          {step === 'menu' && (
            <button onClick={() => setStep('history')} className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors" title="Order history">
              <History className="h-4 w-4 text-gray-400" />
            </button>
          )}
          {step === 'menu' && cartCount > 0 && (
            <button onClick={() => setStep('cart')} className="relative p-2 rounded-lg bg-orange-500/10">
              <ShoppingCart className="h-5 w-5 text-orange-400" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {step === 'menu' && (
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input value={menuSearch} onChange={e => setMenuSearch(e.target.value)}
              placeholder="Search for dishes..." className="pl-10 h-11 bg-gray-800/50 border-gray-700/50 text-white font-quicksand rounded-xl" />
            {menuSearch && (
              <button onClick={() => setMenuSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          {!menuSearch && (
            <ScrollArea className="w-full" orientation="horizontal">
              <div className="flex gap-2 pb-1">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-quicksand whitespace-nowrap transition-all ${
                      displayCategory === cat.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-800/50 text-gray-400'
                    }`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.menuItemId === item.id);
              return (
                <div key={item.id} className="bg-gray-800/40 rounded-xl border border-gray-700/30 overflow-hidden group">
                  {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover" />}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-white font-quicksand leading-tight">{item.name}</p>
                      <span className={`h-3.5 w-3.5 rounded-sm border flex-shrink-0 ${item.isVeg ? 'border-green-400' : 'border-red-400'}`}>
                        <span className={`block h-1.5 w-1.5 rounded-full m-[2.5px] ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                      </span>
                    </div>
                    {item.description && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={item.price} /></span>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 rounded-lg bg-gray-700/50 flex items-center justify-center">
                            <Minus className="h-3 w-3 text-white" />
                          </button>
                          <span className="text-sm w-5 text-center text-white font-bold">{inCart.quantity}</span>
                          <button onClick={() => addToCart(item)} className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center">
                            <Plus className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item)}
                          className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-quicksand font-medium hover:bg-orange-500/20 transition-all active:scale-95">
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Coffee className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="font-quicksand text-sm">No items found</p>
              </div>
            )}
          </div>

          {/* Floating Cart Bar */}
          {cartCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1A1F2C] to-[#1A1F2C]/95 border-t border-gray-700/30 z-30">
              <button onClick={() => setStep('cart')}
                className="w-full flex items-center justify-between p-4 rounded-xl text-white font-quicksand font-semibold"
                style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
                </div>
                <span className="text-lg font-bold"><CurrencyDisplay amount={cartTotal} /></span>
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'cart' && (
        <div className="p-4 space-y-4 pb-20">
          <h2 className="text-lg font-bold text-white font-heading">Your Order</h2>
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-quicksand">Cart is empty</p>
              <Button onClick={() => setStep('menu')} className="mt-3 bg-gray-800/50 text-gray-400" variant="outline">Browse Menu</Button>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.menuItemId} className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white font-quicksand flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500"><CurrencyDisplay amount={item.price} /> each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.menuItemId, -1)} className="h-7 w-7 rounded-lg bg-gray-700/50 flex items-center justify-center"><Minus className="h-3 w-3 text-white" /></button>
                      <span className="text-sm w-5 text-center text-white font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menuItemId, 1)} className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center"><Plus className="h-3 w-3 text-white" /></button>
                      <button onClick={() => removeFromCart(item.menuItemId)} className="ml-2"><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <Input value={item.notes || ''} onChange={e => setCart(prev => prev.map(c => c.menuItemId === item.menuItemId ? { ...c, notes: e.target.value } : c))}
                      placeholder="Special instructions..." className="h-7 text-[10px] bg-transparent border-0 border-b border-gray-700/20 rounded-none px-0 text-gray-400" />
                    <span className="text-sm font-bold text-orange-400 ml-3"><CurrencyDisplay amount={item.total} /></span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700/30">
                <span className="text-white font-heading">Total</span>
                <span className="text-orange-400"><CurrencyDisplay amount={cartTotal} /></span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep('menu')} variant="outline" className="flex-1 border-gray-700 text-gray-400">
                  <Plus className="h-4 w-4 mr-1" /> Add More
                </Button>
                <Button onClick={() => setStep('checkout')} disabled={cart.length === 0}
                  className="flex-1 h-12 text-base font-quicksand font-semibold text-white border-0"
                  style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
                  Checkout
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'checkout' && (
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-white font-heading">Your Details</h2>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Your name *" className="pl-10 h-11 bg-gray-800/50 border-gray-700/50 text-white font-quicksand" />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                placeholder="Phone number *" className="pl-10 h-11 bg-gray-800/50 border-gray-700/50 text-white font-quicksand" maxLength={10} />
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setIsTakeaway(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-quicksand flex items-center justify-center gap-2 transition-all ${!isTakeaway ? 'bg-orange-500/20 border border-orange-500 text-orange-400' : 'bg-gray-800/50 border border-gray-700/30 text-gray-400'}`}>
                <MapPin className="h-4 w-4" /> Dine In
              </button>
              <button onClick={() => { setIsTakeaway(true); setSelectedTableId(null); }}
                className={`flex-1 py-3 rounded-xl text-sm font-quicksand flex items-center justify-center gap-2 transition-all ${isTakeaway ? 'bg-orange-500/20 border border-orange-500 text-orange-400' : 'bg-gray-800/50 border border-gray-700/30 text-gray-400'}`}>
                <Coffee className="h-4 w-4" /> Takeaway
              </button>
            </div>

            {!isTakeaway && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-quicksand">Select your table:</p>
                {zones.map(zone => {
                  const availableTables = tables.filter(t => t.zone === zone && !t.isOccupied);
                  if (availableTables.length === 0) return null;
                  return (
                    <div key={zone}>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{zone}</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTables.map(table => (
                          <button key={table.id} onClick={() => setSelectedTableId(table.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-quicksand transition-all ${
                              selectedTableId === table.id ? 'bg-orange-500/20 border border-orange-500 text-orange-400' : 'bg-gray-800/50 border border-gray-700/30 text-gray-400'
                            }`}>
                            {table.tableName} ({table.capacity} seats)
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-800/30 rounded-xl p-3 space-y-1.5">
            {cart.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-xs font-quicksand">
                <span className="text-gray-400">{item.quantity}x {item.name}</span>
                <span className="text-white"><CurrencyDisplay amount={item.total} /></span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-700/30">
              <span className="text-white">Total</span>
              <span className="text-orange-400"><CurrencyDisplay amount={cartTotal} /></span>
            </div>
          </div>

          <Button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0}
            className="w-full h-12 text-base font-quicksand font-semibold text-white border-0"
            style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Place Order'}
          </Button>
          <p className="text-[10px] text-gray-600 text-center font-quicksand">Payment will be collected at the counter</p>
        </div>
      )}

      {step === 'tracking' && (
        <div className="p-4 space-y-6 max-w-md mx-auto">
          <div className="text-center pt-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-cuephoria-purple flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white font-heading">Order Placed!</h2>
            <p className="text-sm text-gray-400 font-quicksand mt-1">{orderNumber}</p>
          </div>

          <div className="space-y-0 relative">
            <div className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-gray-700/30" />
            {trackingSteps.map((s, i) => {
              const isActive = i === currentStepIndex;
              const isCompleted = i < currentStepIndex;
              return (
                <div key={s.key} className="flex items-center gap-4 py-3 relative z-10">
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${
                    isCompleted ? 'bg-green-500 shadow-lg shadow-green-500/30'
                    : isActive ? 'bg-orange-500 shadow-lg shadow-orange-500/30 animate-pulse-soft'
                    : 'bg-gray-800 border-2 border-gray-700'
                  }`}>
                    <s.icon className={`h-5 w-5 ${isCompleted || isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-quicksand font-medium ${isActive ? 'text-orange-400' : isCompleted ? 'text-green-400' : 'text-gray-600'}`}>
                      {s.label}
                    </p>
                    {isActive && <p className="text-[10px] text-gray-500 animate-pulse">In progress...</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {orderStatus === 'ready' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center animate-scale-in">
              <Coffee className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-green-400 font-heading">Your order is ready!</p>
              <p className="text-sm text-gray-400 font-quicksand">Please collect from the counter</p>
            </div>
          )}

          {(orderStatus === 'served' || orderStatus === 'completed') && (
            <div className="text-center">
              <Button onClick={() => { setStep('menu'); setCart([]); setOrderId(null); }}
                className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
                <RefreshCw className="h-4 w-4 mr-1" /> Order Again
              </Button>
            </div>
          )}

          <p className="text-[10px] text-gray-600 text-center font-quicksand">Powered by Cuephoria</p>
        </div>
      )}

      {step === 'history' && (
        <div className="p-4 space-y-4 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-white font-heading">Order History</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input type="tel" value={historyPhone} onChange={e => setHistoryPhone(e.target.value)}
                placeholder="Your phone number" className="pl-10 h-11 bg-gray-800/50 border-gray-700/50 text-white font-quicksand" maxLength={10} />
            </div>
            <Button onClick={handleFetchHistory} disabled={historyLoading}
              className="h-11 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {orderHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="font-quicksand text-sm">{historyPhone ? 'No orders found' : 'Enter your phone number to see history'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orderHistory.map(order => (
                  <div key={order.id} className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/30">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white font-heading">{order.orderNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                        order.status === 'completed' ? 'bg-green-500/20 text-green-400'
                        : order.status === 'cancelled' ? 'bg-red-500/20 text-red-400'
                        : 'bg-orange-500/20 text-orange-400'
                      }`}>{order.status}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500 font-quicksand">
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="text-orange-400 font-bold"><CurrencyDisplay amount={order.total} /></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default CafeCustomerOrder;
