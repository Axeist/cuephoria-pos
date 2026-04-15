import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { useCafeMenu } from '@/hooks/cafe/useCafeMenu';
import { useCafeTables } from '@/hooks/cafe/useCafeTables';
import { useCafeOrders } from '@/hooks/cafe/useCafeOrders';
import { useCafeKOT } from '@/hooks/cafe/useCafeKOT';
import { useCafePartner } from '@/hooks/cafe/useCafePartner';
import { useCafeCustomers } from '@/hooks/cafe/useCafeCustomers';
import type { Customer } from '@/types/pos.types';
import { CurrencyDisplay, formatCurrency } from '@/components/ui/currency';
import type { CafeCartItem, CafeOrderType, CafePaymentMethod } from '@/types/cafe.types';
import {
  ShoppingCart, Coffee, X, User, Search, Monitor, UtensilsCrossed,
  Printer, Gift, Phone, Check, ReceiptIcon, Star, Plus, Loader2, Hash,
  Clock, Banknote, CreditCard, AlertCircle, ChevronRight, UserCircle2, MapPinned
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { CafePageShell } from '@/components/cafe/CafePageShell';

const CafePOS: React.FC = () => {
  const { user } = useCafeAuth();
  const { categories, items } = useCafeMenu(user?.locationId);
  const { tables, tablesByZone, zones, assignTable } = useCafeTables(user?.locationId);
  const { createOrder, activeOrders, orders, updateOrderStatus, fetchOrderItems } = useCafeOrders(user?.locationId);
  const { generateKOT } = useCafeKOT(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const { customers, addCustomer } = useCafeCustomers();
  const isMobile = useIsMobile();

  const [cart, setCart] = useState<CafeCartItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [orderType, setOrderType] = useState<CafeOrderType>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer dialog
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  // Checkout dialog
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'split' | 'complimentary'>('cash');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);
  const [orderNotes, setOrderNotes] = useState('');

  // Comp dialog
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);
  const [compNote, setCompNote] = useState('');

  // Success
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ orderNumber: string; total: number; items: CafeCartItem[] } | null>(null);

  // Settle pending order dialog
  const [settleOrderId, setSettleOrderId] = useState<string | null>(null);
  const [settlePayMethod, setSettlePayMethod] = useState<'cash' | 'upi' | 'split'>('cash');
  const [settleCash, setSettleCash] = useState(0);
  const [settleUpi, setSettleUpi] = useState(0);
  const [isSettling, setIsSettling] = useState(false);

  const pendingPaymentOrders = useMemo(() =>
    orders.filter(o => o.paymentMethod === 'pending' && !['cancelled', 'completed'].includes(o.status)),
  [orders]);

  const activeCategories = categories.filter(c => c.isActive);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    items.filter(i => i.isAvailable).forEach(item => {
      const cat = activeCategories.find(c => c.id === item.categoryId);
      if (cat) { counts[cat.id] = (counts[cat.id] || 0) + 1; counts.all++; }
    });
    return counts;
  }, [items, activeCategories]);

  const filteredItems = useMemo(() => {
    let result = items.filter(i => i.isAvailable);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    } else if (activeTab !== 'all') {
      result = result.filter(i => i.categoryId === activeTab);
    }
    return result;
  }, [items, activeTab, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 50);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(customerSearchQuery) || c.customerId?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [customers, customerSearchQuery]);

  const cartSubtotal = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart]);

  const discount = useMemo(() => {
    const val = parseFloat(discountAmount) || 0;
    if (discountType === 'percentage') return cartSubtotal * (val / 100);
    return Math.min(val, cartSubtotal);
  }, [discountAmount, discountType, cartSubtotal]);

  const cartTotal = useMemo(() => Math.max(0, cartSubtotal - discount), [cartSubtotal, discount]);

  const addToCart = useCallback((item: typeof items[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id
          ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, total: item.price, isVeg: item.isVeg }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map(c => c.menuItemId === id ? { ...c, quantity: qty, total: qty * c.price } : c));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(c => c.menuItemId !== id));
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(false);
    setShowAddCustomerForm(false);
    toast.success(`${customer.name} selected`);
  };

  const handleAddNewCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim()) { toast.error('Name and phone are required'); return; }
    setIsAddingCustomer(true);
    try {
      const c = await addCustomer({ name: newCustName, phone: newCustPhone, email: newCustEmail || undefined });
      if (c) {
        handleSelectCustomer(c);
        setNewCustName(''); setNewCustPhone(''); setNewCustEmail('');
        setShowAddCustomerForm(false);
      }
    } catch (err: any) { toast.error(err?.message || 'Failed to add'); }
    finally { setIsAddingCustomer(false); }
  };

  const handlePaymentMethodChange = (value: 'cash' | 'upi' | 'split' | 'complimentary') => {
    setPaymentMethod(value);
    if (value === 'split') { const h = Math.floor(cartTotal / 2); setCashAmount(h); setUpiAmount(cartTotal - h); }
  };

  const handlePlaceOrder = useCallback(async () => {
    if (!user || !partner || cart.length === 0) return;
    if (orderType === 'dine_in' && !selectedTableId) { toast.error('Please select a table for dine-in'); return; }
    if (paymentMethod === 'split' && Math.abs(cashAmount + upiAmount - cartTotal) > 0.5) {
      toast.error(`Split amounts must equal ${formatCurrency(cartTotal)}`); return;
    }
    setIsSubmitting(true);
    try {
      const pm: CafePaymentMethod = paymentMethod === 'complimentary' ? 'complimentary' : paymentMethod;
      const order = await createOrder({
        locationId: user.locationId, partnerId: partner.id,
        partnerRate: partner.partnerRate, cuephoriaRate: partner.cuephoriaRate,
        orderType, orderSource: 'pos',
        cafeTableId: orderType === 'dine_in' ? selectedTableId : null,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || undefined,
        customerPhone: selectedCustomer?.phone || undefined,
        items: cart, discount, paymentMethod: pm,
        cashAmount: paymentMethod === 'split' ? cashAmount : undefined,
        upiAmount: paymentMethod === 'split' ? upiAmount : undefined,
        notes: orderNotes || compNote || undefined, createdBy: user.id,
      });
      if (order) {
        if (orderType === 'dine_in' && selectedTableId) await assignTable(selectedTableId, order.id);
        await generateKOT(order.id, cart, user.id);
        setLastOrder({ orderNumber: order.orderNumber, total: cartTotal, items: [...cart] });
        setIsCheckoutDialogOpen(false); setIsCompDialogOpen(false); setShowSuccess(true);
        setCart([]); setSelectedTableId(null); setDiscountAmount('0'); setOrderNotes(''); setCompNote('');
      }
    } catch (err: any) { toast.error(err?.message || 'Failed to place order'); }
    finally { setIsSubmitting(false); }
  }, [user, partner, cart, orderType, selectedTableId, selectedCustomer, paymentMethod, discount, cashAmount, upiAmount, orderNotes, compNote, cartTotal, createOrder, assignTable, generateKOT]);

  const handlePrintReceipt = useCallback(() => {
    if (!lastOrder) return;
    const w = window.open('', '_blank', 'width=300,height=600');
    if (!w) { toast.error('Allow popups to print'); return; }
    w.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;font-size:12px;padding:8px;max-width:280px;margin:0 auto}.center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between}</style></head><body><div class="center bold" style="font-size:16px">CUEPHORIA CAFE</div><div class="center">${lastOrder.orderNumber}</div><div class="center">${new Date().toLocaleString('en-IN')}</div>${selectedCustomer ? `<div class="center">${selectedCustomer.name} - ${selectedCustomer.phone}</div>` : ''}<div class="line"></div>${lastOrder.items.map(i => `<div class="row"><span>${i.quantity}x ${i.name}</span><span>₹${i.total.toFixed(2)}</span></div>`).join('')}<div class="line"></div><div class="row bold"><span>Total</span><span>₹${lastOrder.total.toFixed(2)}</span></div><div class="line"></div><div class="center" style="margin-top:8px;font-size:10px">Thank you!</div><script>setTimeout(()=>{window.print();window.close()},300)</script></body></html>`);
    w.document.close();
  }, [lastOrder, selectedCustomer]);

  const handlePayLater = useCallback(async () => {
    if (!user || !partner || cart.length === 0) return;
    if (orderType === 'dine_in' && !selectedTableId) { toast.error('Please select a table for dine-in'); return; }
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        locationId: user.locationId, partnerId: partner.id,
        partnerRate: partner.partnerRate, cuephoriaRate: partner.cuephoriaRate,
        orderType, orderSource: 'pos',
        cafeTableId: orderType === 'dine_in' ? selectedTableId : null,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || undefined,
        customerPhone: selectedCustomer?.phone || undefined,
        items: cart, discount, paymentMethod: 'pending',
        notes: orderNotes || undefined, createdBy: user.id,
      });
      if (order) {
        if (orderType === 'dine_in' && selectedTableId) await assignTable(selectedTableId, order.id);
        await generateKOT(order.id, cart, user.id);
        toast.success(`Order ${order.orderNumber} placed — payment pending`);
        setIsCheckoutDialogOpen(false); setShowSuccess(false);
        setCart([]); setSelectedTableId(null); setDiscountAmount('0'); setOrderNotes('');
      }
    } catch (err: any) { toast.error(err?.message || 'Failed to place order'); }
    finally { setIsSubmitting(false); }
  }, [user, partner, cart, orderType, selectedTableId, selectedCustomer, discount, orderNotes, createOrder, assignTable, generateKOT]);

  const handleSettleOrder = useCallback(async () => {
    if (!settleOrderId) return;
    const order = pendingPaymentOrders.find(o => o.id === settleOrderId);
    if (!order) return;
    if (settlePayMethod === 'split' && Math.abs(settleCash + settleUpi - order.total) > 0.5) {
      toast.error(`Split amounts must equal ${formatCurrency(order.total)}`); return;
    }
    setIsSettling(true);
    try {
      const ok = await updateOrderStatus(
        settleOrderId, 'completed',
        settlePayMethod,
        settlePayMethod === 'split' ? settleCash : settlePayMethod === 'cash' ? order.total : undefined,
        settlePayMethod === 'split' ? settleUpi : settlePayMethod === 'upi' ? order.total : undefined,
      );
      if (ok) {
        if (order.customerId && order.total > 0) {
          const { supabase } = await import('@/integrations/supabase/client');
          try { await supabase.rpc('increment_customer_total_spent', { p_customer_id: order.customerId, p_amount: order.total }); } catch {};
        }
        toast.success(`Order ${order.orderNumber} settled!`);
        setSettleOrderId(null);
      }
    } catch (err: any) { toast.error(err?.message || 'Failed to settle'); }
    finally { setIsSettling(false); }
  }, [settleOrderId, settlePayMethod, settleCash, settleUpi, pendingPaymentOrders, updateOrderStatus]);

  const categoryColors = [
    { a: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30', i: 'text-muted-foreground hover:text-white hover:bg-orange-500/20' },
    { a: 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30', i: 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20' },
    { a: 'bg-cuephoria-blue text-white shadow-lg shadow-cuephoria-blue/30', i: 'text-muted-foreground hover:text-white hover:bg-cuephoria-blue/20' },
    { a: 'bg-green-500 text-white shadow-lg shadow-green-500/30', i: 'text-muted-foreground hover:text-white hover:bg-green-500/20' },
    { a: 'bg-red-500 text-white shadow-lg shadow-red-500/30', i: 'text-muted-foreground hover:text-white hover:bg-red-500/20' },
    { a: 'bg-violet-500 text-white shadow-lg shadow-violet-500/30', i: 'text-muted-foreground hover:text-white hover:bg-violet-500/20' },
  ];

  const availableTables = tables.filter(t => !t.isOccupied);
  const occupiedTables = tables.filter(t => t.isOccupied);

  return (
    <CafePageShell variant="wide" contentClassName="gap-4 overflow-auto pb-4 sm:gap-5 sm:pb-6" className="!py-4 sm:!py-6 lg:!px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Point of sale</p>
          <h2 className="font-heading text-xl font-bold tracking-tight text-transparent bg-gradient-to-r from-orange-100 to-violet-200 bg-clip-text sm:text-2xl md:text-3xl">
            Cafe POS
          </h2>
        </div>
        {activeOrders.length > 0 && (
          <span className="rounded-full border border-orange-500/25 bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-200 shadow-sm backdrop-blur-sm font-quicksand">
            {activeOrders.length} active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-3">
        {/* ===== LEFT: ORDER / CART ===== */}
        <Card className="lg:col-span-1 flex flex-col cafe-glass-card border-orange-500/10">
          <CardHeader className="pb-2 px-4 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-xl font-heading flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-400" /> Order
                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="hover:text-red-500 text-xs sm:text-sm h-8 sm:h-9 px-2">Clear</Button>
            </div>

            {/* Order Type */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-gray-800/60">
              {([
                { type: 'dine_in' as const, label: 'Dine In', icon: UtensilsCrossed },
                { type: 'takeaway' as const, label: 'Takeaway', icon: Coffee },
                { type: 'delivery_to_station' as const, label: 'To Station', icon: Monitor },
              ]).map(t => (
                <button key={t.type} onClick={() => { setOrderType(t.type); setSelectedTableId(null); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm font-quicksand transition-all ${
                    orderType === t.type ? 'bg-orange-500/20 text-orange-400 font-medium' : 'text-gray-500 hover:text-gray-300'
                  }`}>
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            {/* Table selection — zone-aligned grid */}
            {orderType === 'dine_in' && tables.length > 0 && (
              <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider font-quicksand flex items-center gap-1.5">
                    <MapPinned className="h-3.5 w-3.5 text-orange-400" /> Tables
                  </span>
                  <span className="text-[10px] text-gray-500 font-quicksand shrink-0">
                    <span className="text-emerald-400/90">{availableTables.length} free</span>
                    <span className="text-gray-600 mx-1">·</span>
                    <span className="text-rose-400/80">{occupiedTables.length} busy</span>
                  </span>
                </div>
                <div className="max-h-[200px] overflow-y-auto pr-1 space-y-3">
                  {zones.map(zone => (
                    <div key={zone} className="flex flex-col sm:flex-row sm:items-stretch gap-2 sm:gap-3">
                      <div className="sm:w-28 shrink-0 flex items-center sm:items-start sm:pt-2">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-orange-400/95 leading-tight">{zone}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                        {(tablesByZone[zone] || []).map(table => (
                          <button
                            key={table.id}
                            type="button"
                            onClick={() => !table.isOccupied && setSelectedTableId(table.id)}
                            disabled={table.isOccupied}
                            className={`min-h-[40px] min-w-[52px] px-3 py-2 rounded-lg text-xs font-semibold font-quicksand border transition-all ${
                              selectedTableId === table.id
                                ? 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
                                : table.isOccupied
                                  ? 'bg-rose-950/40 border-rose-500/25 text-rose-300/50 cursor-not-allowed line-through'
                                  : 'bg-white/[0.04] border-white/[0.08] text-gray-200 hover:border-orange-500/35 hover:bg-orange-500/10 hover:text-orange-200'
                            }`}
                          >
                            {table.tableName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single customer entry — opens picker (no duplicate fields) */}
            <button
              type="button"
              onClick={() => setIsCustomerDialogOpen(true)}
              className="w-full flex items-center gap-3 rounded-xl border border-white/[0.08] bg-gradient-to-r from-white/[0.05] to-purple-500/[0.06] px-3 py-2.5 text-left transition-all hover:border-orange-500/30 hover:shadow-md hover:shadow-orange-500/5"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500/30 to-purple-600/30 flex items-center justify-center border border-white/10 shrink-0">
                <UserCircle2 className="h-5 w-5 text-orange-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-quicksand">Customer</p>
                {selectedCustomer ? (
                  <>
                    <p className="text-sm font-semibold text-white font-quicksand truncate">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-400 font-quicksand truncate">{selectedCustomer.phone}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 font-quicksand">Tap to search or add customer</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
            </button>
          </CardHeader>

          {/* Cart Items */}
          <CardContent className="flex-1 overflow-auto px-4 py-2 min-h-[120px]">
            {cart.length > 0 ? (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="flex items-center gap-2 py-1.5 border-b border-gray-700/20">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-quicksand text-white truncate">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="h-6 w-6 rounded border border-gray-600 text-xs text-gray-300 hover:bg-gray-700 flex items-center justify-center">-</button>
                      <span className="w-5 text-center text-xs text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="h-6 w-6 rounded border border-gray-600 text-xs text-gray-300 hover:bg-gray-700 flex items-center justify-center">+</button>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-orange-400 w-14 text-right"><CurrencyDisplay amount={item.total} /></span>
                    <button onClick={() => removeFromCart(item.menuItemId)} className="h-5 w-5 text-red-400/60 hover:text-red-400 flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-6 text-gray-500">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-heading">Cart is empty</p>
                <p className="text-xs text-gray-600">Tap items from the menu to add</p>
              </div>
            )}
          </CardContent>

          {/* Totals & Actions */}
          <CardFooter className="flex flex-col gap-3 border-t border-gray-700/30 px-4 py-3">
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Subtotal</span><CurrencyDisplay amount={cartSubtotal} /></div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-green-400"><span>Discount</span><span>-<CurrencyDisplay amount={discount} /></span></div>
              )}
              <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-700/20">
                <span>Total</span><CurrencyDisplay amount={cartTotal} className="text-orange-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 h-9 sm:h-10 text-xs sm:text-sm font-medium"
                disabled={cart.length === 0} onClick={() => setIsCheckoutDialogOpen(true)}>
                <ReceiptIcon className="h-3.5 w-3.5 mr-1" /> Checkout
              </Button>
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90 h-9 sm:h-10 text-xs sm:text-sm font-medium text-black"
                disabled={cart.length === 0 || isSubmitting} onClick={handlePayLater}>
                <Clock className="h-3.5 w-3.5 mr-1" /> Pay Later
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 h-9 sm:h-10 text-xs sm:text-sm font-medium"
                disabled={cart.length === 0} onClick={() => setIsCompDialogOpen(true)}>
                <Gift className="h-3.5 w-3.5 mr-1" /> Comp
              </Button>
            </div>

            {/* Pending Payments Badge */}
            {pendingPaymentOrders.length > 0 && (
              <div className="w-full">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-quicksand text-amber-300">{pendingPaymentOrders.length} pending payment{pendingPaymentOrders.length > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 font-quicksand">
                    <CurrencyDisplay amount={pendingPaymentOrders.reduce((s, o) => s + o.total, 0)} />
                  </span>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* ===== RIGHT: MENU ===== */}
        <Card className="lg:col-span-2 flex flex-col cafe-glass-card border-orange-500/10">
          <CardHeader className="pb-2 px-4 pt-4 flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-xl font-heading">Menu</CardTitle>
              <span className="text-xs text-gray-500 font-quicksand">{filteredItems.length} items</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search menu items..." className="pl-8 font-quicksand h-8 text-xs"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2"><X className="h-4 w-4 text-gray-500" /></button>
              )}
            </div>
          </CardHeader>

          {/* Category tabs */}
          <div className="px-4 flex-shrink-0">
            <div className="flex flex-wrap gap-1 py-2">
              <button onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
                className={`text-xs sm:text-sm px-2.5 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === 'all' ? categoryColors[0].a : categoryColors[0].i
                }`}>
                All ({categoryCounts.all || 0})
              </button>
              {activeCategories.map((cat, i) => {
                const c = categoryColors[(i + 1) % categoryColors.length];
                return (
                  <button key={cat.id} onClick={() => { setActiveTab(cat.id); setSearchQuery(''); }}
                    className={`text-xs sm:text-sm px-2.5 py-1.5 rounded-md font-medium transition-all ${
                      activeTab === cat.id ? c.a : c.i
                    }`}>
                    {cat.name} ({categoryCounts[cat.id] || 0})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-auto px-4 pb-4">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const inCart = cart.find(c => c.menuItemId === item.id);
                  return (
                    <Card key={item.id}
                      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-0.5 cafe-glass-card !border-white/[0.06] relative"
                      onClick={() => addToCart(item)}>
                      {inCart && (
                        <div className="absolute top-1.5 right-1.5 z-10 h-5 min-w-[20px] px-1 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold shadow-lg">
                          {inCart.quantity}
                        </div>
                      )}
                      {item.imageUrl ? (
                        <div className="h-24 sm:h-28 w-full overflow-hidden bg-black/20">
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        </div>
                      ) : null}
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-sm sm:text-base font-medium text-white font-quicksand leading-tight group-hover:text-orange-200 transition-colors">
                            {item.name}
                          </p>
                          <span className={`h-3 w-3 rounded-sm border flex-shrink-0 mt-0.5 ${item.isVeg ? 'border-green-400' : 'border-red-400'}`}>
                            <span className={`block h-1.5 w-1.5 rounded-full m-[1.5px] ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                          </span>
                        </div>
                        {item.description && <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm sm:text-base font-bold text-orange-400"><CurrencyDisplay amount={item.price} /></span>
                          {item.prepTimeMinutes ? <span className="text-xs text-gray-500">{item.prepTimeMinutes}min</span> : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Coffee className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-base font-heading">No Items Found</p>
                <p className="text-xs text-gray-600 mt-1">Try a different search or category</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ===== PENDING PAYMENTS SECTION ===== */}
      {pendingPaymentOrders.length > 0 && (
        <div className="mt-4">
          <Card className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 border-amber-500/20">
            <CardHeader className="pb-2 px-4 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <CardTitle className="text-base sm:text-xl font-heading text-amber-300">Pending Payments</CardTitle>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-quicksand">{pendingPaymentOrders.length}</span>
                </div>
                <span className="text-xs font-bold text-amber-400 font-quicksand">
                  Total: <CurrencyDisplay amount={pendingPaymentOrders.reduce((s, o) => s + o.total, 0)} />
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pendingPaymentOrders.map(order => (
                  <div key={order.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-700/30 bg-gray-800/50 hover:border-amber-500/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-heading">#{order.orderNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-quicksand ${
                          order.orderType === 'dine_in' ? 'bg-blue-500/15 text-blue-400' :
                          order.orderType === 'takeaway' ? 'bg-green-500/15 text-green-400' :
                          'bg-purple-500/15 text-purple-400'
                        }`}>{order.orderType === 'dine_in' ? 'Dine-in' : order.orderType === 'takeaway' ? 'Takeaway' : 'Station'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {order.customerName && <span className="text-xs text-gray-400 truncate">{order.customerName}</span>}
                        <span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={order.total} /></span>
                      <Button size="sm" className="h-9 sm:h-10 text-xs sm:text-sm px-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90"
                        onClick={() => {
                          setSettleOrderId(order.id);
                          setSettlePayMethod('cash');
                          setSettleCash(0);
                          setSettleUpi(0);
                        }}>
                        <Banknote className="h-3 w-3 mr-1" /> Settle
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== SETTLE PAYMENT DIALOG ===== */}
      <Dialog open={!!settleOrderId} onOpenChange={(open) => { if (!open) setSettleOrderId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-400" />
              Settle Payment
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const o = pendingPaymentOrders.find(x => x.id === settleOrderId);
                return o ? `Order #${o.orderNumber} — ${formatCurrency(o.total)}` : '';
              })()}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const o = pendingPaymentOrders.find(x => x.id === settleOrderId);
            if (!o) return null;
            return (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/30 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Order</span>
                    <span className="text-white font-bold">#{o.orderNumber}</span>
                  </div>
                  {o.customerName && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Customer</span>
                      <span className="text-white">{o.customerName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white capitalize">{o.orderType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Placed at</span>
                    <span className="text-white">{new Date(o.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  {o.discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Discount</span>
                      <span className="text-green-400">-<CurrencyDisplay amount={o.discount} /></span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-700/20">
                    <span>Total Due</span>
                    <CurrencyDisplay amount={o.total} className="text-orange-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Payment Method</Label>
                  <RadioGroup value={settlePayMethod} onValueChange={(v) => {
                    setSettlePayMethod(v as any);
                    if (v === 'split') { const h = Math.floor(o.total / 2); setSettleCash(h); setSettleUpi(o.total - h); }
                  }}>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'cash', label: 'Cash', icon: Banknote, color: 'green' },
                        { value: 'upi', label: 'UPI', icon: CreditCard, color: 'blue' },
                        { value: 'split', label: 'Split', icon: ReceiptIcon, color: 'purple' },
                      ].map(pm => (
                        <label key={pm.value}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all ${
                            settlePayMethod === pm.value
                              ? `border-${pm.color}-500/40 bg-${pm.color}-500/10`
                              : 'border-gray-700/30 bg-gray-800/30 hover:border-gray-600'
                          }`}>
                          <RadioGroupItem value={pm.value} className="sr-only" />
                          <pm.icon className={`h-4 w-4 ${settlePayMethod === pm.value ? `text-${pm.color}-400` : 'text-gray-500'}`} />
                          <span className={`text-xs font-quicksand ${settlePayMethod === pm.value ? 'text-white' : 'text-gray-400'}`}>{pm.label}</span>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {settlePayMethod === 'split' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[13px] font-semibold text-gray-400">Cash Amount</Label>
                      <Input type="number" min={0} max={o.total} value={settleCash}
                        onChange={e => { const v = Number(e.target.value); setSettleCash(v); setSettleUpi(Math.max(0, o.total - v)); }}
                        className="h-9 text-sm font-quicksand" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[13px] font-semibold text-gray-400">UPI Amount</Label>
                      <Input type="number" min={0} max={o.total} value={settleUpi}
                        onChange={e => { const v = Number(e.target.value); setSettleUpi(v); setSettleCash(Math.max(0, o.total - v)); }}
                        className="h-9 text-sm font-quicksand" />
                    </div>
                    {Math.abs(settleCash + settleUpi - o.total) > 0.5 && (
                      <p className="col-span-2 text-xs text-red-400 text-center">
                        Split must equal {formatCurrency(o.total)} — currently {formatCurrency(settleCash + settleUpi)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOrderId(null)} className="h-9 sm:h-10 text-xs sm:text-sm">Cancel</Button>
            <Button className="h-9 sm:h-10 text-xs sm:text-sm bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90"
              disabled={isSettling || (settlePayMethod === 'split' && Math.abs(settleCash + settleUpi - (pendingPaymentOrders.find(x => x.id === settleOrderId)?.total || 0)) > 0.5)}
              onClick={handleSettleOrder}>
              {isSettling ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" /> Settle Payment</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CUSTOMER DIALOG ===== */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={(open) => { setIsCustomerDialogOpen(open); if (!open) setShowAddCustomerForm(false); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="font-heading text-xl">Select Customer</DialogTitle>
            <DialogDescription>Search the central customer database or add a new one</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, phone, or ID..." className="pl-8 font-quicksand h-9 text-sm"
                value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => setShowAddCustomerForm(!showAddCustomerForm)}
              variant={showAddCustomerForm ? 'secondary' : 'outline'} className="h-9 sm:h-10 text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Button>
          </div>

          {/* Inline Add Form */}
          {showAddCustomerForm && (
            <div className="p-3 bg-orange-500/5 border border-orange-500/15 rounded-lg space-y-3 flex-shrink-0">
              <p className="text-xs font-heading text-orange-400">Add New Customer</p>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Full name *" value={newCustName} onChange={e => setNewCustName(e.target.value)}
                  className="h-8 text-xs font-quicksand" autoFocus />
                <Input placeholder="Phone *" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}
                  className="h-8 text-xs font-quicksand" type="tel" />
                <Input placeholder="Email (opt)" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)}
                  className="h-8 text-xs font-quicksand" type="email" />
              </div>
              <Button size="sm" onClick={handleAddNewCustomer} disabled={isAddingCustomer || !newCustName.trim() || !newCustPhone.trim()}
                className="bg-gradient-to-r from-orange-500 to-cuephoria-purple hover:opacity-90 h-9 sm:h-10 text-xs sm:text-sm">
                {isAddingCustomer ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                {isAddingCustomer ? 'Adding...' : 'Add & Select'}
              </Button>
            </div>
          )}

          {/* Customer List */}
          <div className="flex-1 overflow-auto min-h-0">
            {filteredCustomers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                {filteredCustomers.map((customer) => (
                  <button key={customer.id} onClick={() => handleSelectCustomer(customer)}
                    className="text-left p-3 rounded-lg border border-gray-700/40 bg-gray-800/30 hover:bg-gray-800/60 hover:border-orange-500/30 transition-all group">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-600 to-cuephoria-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-orange-200">{customer.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{customer.phone}</p>
                      </div>
                      {customer.isMember && <span className="text-xs bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded flex-shrink-0">M</span>}
                    </div>
                    {customer.customerId && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-purple-300 font-mono">
                        <Hash className="h-2.5 w-2.5" /> {customer.customerId}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
                      <div className="bg-gray-800/50 rounded px-1 py-1">
                        <p className="text-lg sm:text-xl font-bold text-yellow-400">{customer.loyaltyPoints}</p>
                        <p className="text-xs text-gray-500">Points</p>
                      </div>
                      <div className="bg-gray-800/50 rounded px-1 py-1">
                        <p className="text-lg sm:text-xl font-bold text-green-400"><CurrencyDisplay amount={customer.totalSpent} /></p>
                        <p className="text-xs text-gray-500">Spent</p>
                      </div>
                      <div className="bg-gray-800/50 rounded px-1 py-1">
                        <p className="text-lg sm:text-xl font-bold text-blue-400">{Math.floor(customer.totalPlayTime / 60)}h</p>
                        <p className="text-xs text-gray-500">Play</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <User className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-heading">No Customers Found</p>
                <p className="text-xs text-gray-600 mt-1">Try a different search or add a new customer</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== CHECKOUT DIALOG ===== */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Complete Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedCustomer && (
              <div className="border border-orange-500/15 rounded-lg p-3 bg-orange-500/5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-orange-400" />
                  <span className="font-medium text-sm">{selectedCustomer.name}</span>
                  <span className="text-xs text-gray-400">({selectedCustomer.phone})</span>
                  {selectedCustomer.isMember && <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded ml-auto">Member</span>}
                </div>
                {selectedCustomer.loyaltyPoints > 0 && (
                  <div className="mt-1.5 text-xs flex items-center gap-1 text-yellow-400">
                    <Star className="h-3 w-3" /> {selectedCustomer.loyaltyPoints} points
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-heading text-sm">Discount</Label>
              <div className="flex gap-2">
                <Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0" className="font-quicksand flex-1 h-9 text-sm" />
                <select className="px-2 py-1 rounded-md border border-input bg-background font-quicksand text-sm"
                  value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}>
                  <option value="percentage">%</option>
                  <option value="fixed">₹</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm">Order Notes</Label>
              <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Optional notes..." className="font-quicksand h-9 text-sm" />
            </div>
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between text-sm"><span>Subtotal</span><CurrencyDisplay amount={cartSubtotal} /></div>
              {discount > 0 && <div className="flex justify-between text-sm text-green-400"><span>Discount {discountType === 'percentage' ? `(${discountAmount}%)` : ''}</span><span>-<CurrencyDisplay amount={discount} /></span></div>}
              <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><CurrencyDisplay amount={cartTotal} className="text-orange-400" /></div>
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-sm">Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => handlePaymentMethodChange(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-1.5"><RadioGroupItem value="cash" id="c-cash" /><Label htmlFor="c-cash" className="font-quicksand text-sm">Cash</Label></div>
                <div className="flex items-center space-x-1.5"><RadioGroupItem value="upi" id="c-upi" /><Label htmlFor="c-upi" className="font-quicksand text-sm">UPI</Label></div>
                <div className="flex items-center space-x-1.5"><RadioGroupItem value="split" id="c-split" /><Label htmlFor="c-split" className="font-quicksand text-sm">Split</Label></div>
              </RadioGroup>
            </div>
            {paymentMethod === 'split' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cash</Label><Input type="number" value={cashAmount} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setCashAmount(v); setUpiAmount(Math.max(0, cartTotal - v)); }} className="h-9 text-sm" /></div>
                <div><Label className="text-xs">UPI</Label><Input type="number" value={upiAmount} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setUpiAmount(v); setCashAmount(Math.max(0, cartTotal - v)); }} className="h-9 text-sm" /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0} size="sm"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90">
              {isSubmitting ? 'Processing...' : `Place Order (${formatCurrency(cartTotal)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== COMP DIALOG ===== */}
      <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2"><Gift className="h-5 w-5 text-orange-500" /> Complimentary</DialogTitle>
            <DialogDescription>Items given free. No payment recorded.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selectedCustomer && (
              <div className="flex items-center gap-2 p-2 border border-orange-500/15 rounded-lg bg-orange-500/5 text-sm">
                <User className="h-4 w-4 text-orange-400" /><span>{selectedCustomer.name}</span>
              </div>
            )}
            <div><Label className="text-sm">Reason (Optional)</Label><Input value={compNote} onChange={e => setCompNote(e.target.value)} placeholder="e.g., Owner, Staff meal..." className="h-9 text-sm mt-1" /></div>
            <div className="border rounded-lg p-3 bg-gray-800/30 space-y-1 max-h-32 overflow-auto">
              {cart.map(i => (<div key={i.menuItemId} className="flex justify-between text-xs"><span>{i.quantity}x {i.name}</span><CurrencyDisplay amount={i.total} /></div>))}
              <div className="flex justify-between font-bold pt-2 border-t text-sm"><span>Total</span><CurrencyDisplay amount={cartSubtotal} className="text-orange-400" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setIsCompDialogOpen(false); setCompNote(''); }}>Cancel</Button>
            <Button size="sm" onClick={() => { setPaymentMethod('complimentary'); handlePlaceOrder(); }} disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90">
              <Gift className="h-3.5 w-3.5 mr-1" /> {isSubmitting ? 'Processing...' : 'Confirm Comp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SUCCESS DIALOG ===== */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex justify-center"><div className="rounded-full bg-green-500/20 p-3"><Check className="h-8 w-8 text-green-400" /></div></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <h3 className="text-xl font-bold">Order Placed!</h3>
            <p className="text-sm text-gray-400">{lastOrder?.orderNumber}</p>
            <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-lg">
              <p className="text-3xl font-bold text-green-400"><CurrencyDisplay amount={lastOrder?.total || 0} /></p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handlePrintReceipt} className="bg-cuephoria-purple hover:bg-cuephoria-purple/90">
                <Printer className="h-4 w-4 mr-1.5" /> Print Receipt
              </Button>
              <Button variant="outline" onClick={() => { setShowSuccess(false); setLastOrder(null); }}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CafePageShell>
  );
};

export default CafePOS;
