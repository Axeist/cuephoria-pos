import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ShoppingCart, Plus, Minus, Trash2, Coffee, X, ChefHat, User, Search,
  MapPin, Monitor, UtensilsCrossed, CreditCard, Banknote, SplitSquareHorizontal,
  Percent, MessageSquare, Printer, Gift, Phone, Check, ReceiptIcon, Award, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const CafePOS: React.FC = () => {
  const { user } = useCafeAuth();
  const { categories, items } = useCafeMenu(user?.locationId);
  const { tables, tablesByZone, zones, assignTable } = useCafeTables(user?.locationId);
  const { createOrder, activeOrders } = useCafeOrders(user?.locationId);
  const { generateKOT } = useCafeKOT(user?.locationId);
  const { partner } = useCafePartner(user?.locationId);
  const { customers } = useCafeCustomers();
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

  const activeCategories = categories.filter(c => c.isActive);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    items.filter(i => i.isAvailable).forEach(item => {
      const cat = activeCategories.find(c => c.id === item.categoryId);
      if (cat) {
        counts[cat.id] = (counts[cat.id] || 0) + 1;
        counts.all++;
      }
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
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(customerSearchQuery) ||
      c.customerId?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [customers, customerSearchQuery]);

  const cartSubtotal = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

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
          ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
          : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, total: item.price, isVeg: item.isVeg }];
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => prev.map(c =>
      c.menuItemId === menuItemId ? { ...c, quantity: newQty, total: newQty * c.price } : c
    ));
  }, []);

  const removeFromCart = useCallback((menuItemId: string) => {
    setCart(prev => prev.filter(c => c.menuItemId !== menuItemId));
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(false);
    toast.success(`${customer.name} selected`);
  };

  const handlePaymentMethodChange = (value: 'cash' | 'upi' | 'split' | 'complimentary') => {
    setPaymentMethod(value);
    if (value === 'split') {
      const half = Math.floor(cartTotal / 2);
      setCashAmount(half);
      setUpiAmount(cartTotal - half);
    }
  };

  const handlePlaceOrder = useCallback(async () => {
    if (!user || !partner || cart.length === 0) return;
    if (orderType === 'dine_in' && !selectedTableId) {
      toast.error('Please select a table for dine-in');
      return;
    }
    if (paymentMethod === 'split' && Math.abs(cashAmount + upiAmount - cartTotal) > 0.5) {
      toast.error(`Split amounts must equal ${formatCurrency(cartTotal)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const pm: CafePaymentMethod = paymentMethod === 'complimentary' ? 'complimentary' : paymentMethod;
      const order = await createOrder({
        locationId: user.locationId,
        partnerId: partner.id,
        partnerRate: partner.partnerRate,
        cuephoriaRate: partner.cuephoriaRate,
        orderType,
        orderSource: 'pos',
        cafeTableId: orderType === 'dine_in' ? selectedTableId : null,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || undefined,
        customerPhone: selectedCustomer?.phone || undefined,
        items: cart,
        discount,
        paymentMethod: pm,
        cashAmount: paymentMethod === 'split' ? cashAmount : undefined,
        upiAmount: paymentMethod === 'split' ? upiAmount : undefined,
        notes: orderNotes || compNote || undefined,
        createdBy: user.id,
      });

      if (order) {
        if (orderType === 'dine_in' && selectedTableId) {
          await assignTable(selectedTableId, order.id);
        }
        await generateKOT(order.id, cart, user.id);

        setLastOrder({ orderNumber: order.orderNumber, total: cartTotal, items: [...cart] });
        setIsCheckoutDialogOpen(false);
        setIsCompDialogOpen(false);
        setShowSuccess(true);

        // Reset
        setCart([]);
        setSelectedTableId(null);
        setDiscountAmount('0');
        setOrderNotes('');
        setCompNote('');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, partner, cart, orderType, selectedTableId, selectedCustomer, paymentMethod, discount, cashAmount, upiAmount, orderNotes, compNote, cartTotal, createOrder, assignTable, generateKOT]);

  const handlePrintReceipt = useCallback(() => {
    if (!lastOrder) return;
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) { toast.error('Allow popups to print'); return; }
    printWindow.document.write(`<html><head><title>Receipt</title>
      <style>body{font-family:monospace;font-size:12px;padding:8px;max-width:280px;margin:0 auto}
      .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}
      .row{display:flex;justify-content:space-between}</style></head><body>
      <div class="center bold" style="font-size:16px">CUEPHORIA CAFE</div>
      <div class="center">${lastOrder.orderNumber}</div>
      <div class="center">${new Date().toLocaleString('en-IN')}</div>
      ${selectedCustomer ? `<div class="center">${selectedCustomer.name} - ${selectedCustomer.phone}</div>` : ''}
      <div class="line"></div>
      ${lastOrder.items.map(i => `<div class="row"><span>${i.quantity}x ${i.name}</span><span>₹${i.total.toFixed(2)}</span></div>`).join('')}
      <div class="line"></div>
      <div class="row bold"><span>Total</span><span>₹${lastOrder.total.toFixed(2)}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top:8px;font-size:10px">Thank you for visiting!</div>
      <script>setTimeout(()=>{window.print();window.close()},300)</script></body></html>`);
    printWindow.document.close();
  }, [lastOrder, selectedCustomer]);

  const categoryColorMap: Record<number, { active: string; inactive: string }> = {
    0: { active: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30', inactive: 'text-muted-foreground hover:text-white hover:bg-orange-500/20' },
    1: { active: 'bg-cuephoria-purple text-white shadow-lg shadow-cuephoria-purple/30', inactive: 'text-muted-foreground hover:text-white hover:bg-cuephoria-purple/20' },
    2: { active: 'bg-cuephoria-blue text-white shadow-lg shadow-cuephoria-blue/30', inactive: 'text-muted-foreground hover:text-white hover:bg-cuephoria-blue/20' },
    3: { active: 'bg-green-500 text-white shadow-lg shadow-green-500/30', inactive: 'text-muted-foreground hover:text-white hover:bg-green-500/20' },
    4: { active: 'bg-red-500 text-white shadow-lg shadow-red-500/30', inactive: 'text-muted-foreground hover:text-white hover:bg-red-500/20' },
    5: { active: 'bg-violet-500 text-white shadow-lg shadow-violet-500/30', inactive: 'text-muted-foreground hover:text-white hover:bg-violet-500/20' },
  };

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 pt-3 sm:pt-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6 animate-slide-down">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight gradient-text font-heading">Cafe POS</h2>
        {activeOrders.length > 0 && (
          <span className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full font-quicksand animate-pulse-soft">
            {activeOrders.length} active orders
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* ===== CART (Left, 1 col) ===== */}
        <Card className={`lg:col-span-1 ${isMobile ? 'h-auto min-h-[300px]' : 'h-[calc(100vh-12rem)]'} flex flex-col animate-slide-up`}>
          <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-orange-500/20 to-transparent px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-xl font-heading">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-2 text-orange-400" />
                Cart
              </CardTitle>
              <Button variant="ghost" size={isMobile ? 'sm' : 'default'} onClick={() => setCart([])}
                className="hover:text-red-500 transition-colors h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm">
                Clear
              </Button>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
            </CardDescription>
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
            {orderType === 'dine_in' && (
              <ScrollArea className="h-16 mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {zones.map(zone => (
                    <React.Fragment key={zone}>
                      <span className="text-[10px] text-gray-500 w-full uppercase tracking-wider">{zone}</span>
                      {(tablesByZone[zone] || []).map(table => (
                        <button key={table.id} onClick={() => !table.isOccupied && setSelectedTableId(table.id)}
                          disabled={table.isOccupied}
                          className={`px-2 py-0.5 rounded text-[10px] font-quicksand border transition-all ${
                            selectedTableId === table.id ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                            : table.isOccupied ? 'bg-red-500/10 border-red-500/30 text-red-400/50 cursor-not-allowed'
                            : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-orange-500/30'
                          }`}>
                          {table.tableName}
                        </button>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardHeader>

          <CardContent className={`flex-grow overflow-auto px-3 sm:px-6 ${isMobile ? 'max-h-[400px]' : ''}`}>
            {cart.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {cart.map((item, index) => (
                  <div key={item.menuItemId}
                    className="flex items-center justify-between border-b border-gray-700/30 pb-2 sm:pb-3 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex flex-col justify-center flex-1 min-w-0">
                      <p className="font-medium font-quicksand truncate text-sm sm:text-base flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                        {item.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        <CurrencyDisplay amount={item.price} /> each
                      </p>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs"
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}>-</Button>
                      <span className="w-6 sm:w-8 text-center text-sm">{item.quantity}</span>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs"
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}>+</Button>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <div className="font-mono text-right text-sm sm:text-base text-orange-400 font-bold">
                        <CurrencyDisplay amount={item.total} />
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-destructive hover:bg-red-500/10"
                        onClick={() => removeFromCart(item.menuItemId)}>
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full animate-fade-in py-8">
                <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4 animate-pulse-soft" />
                <h3 className="text-lg sm:text-xl font-medium font-heading">Cart Empty</h3>
                <p className="text-muted-foreground mt-2 text-center text-xs sm:text-sm px-4">
                  Add items from the menu to begin
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t pt-3 sm:pt-4 flex flex-col bg-gradient-to-r from-transparent to-orange-500/10 px-3 sm:px-6 pb-3 sm:pb-4">
            <div className="w-full text-sm sm:text-base">
              <div className="flex justify-between py-1">
                <span className="text-xs sm:text-sm">Subtotal</span>
                <CurrencyDisplay amount={cartSubtotal} className="text-xs sm:text-base" />
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-green-400">
                  <span className="text-xs sm:text-sm">Discount</span>
                  <span>-<CurrencyDisplay amount={discount} /></span>
                </div>
              )}
              <div className="flex justify-between py-1 text-base sm:text-lg font-bold border-t border-gray-700/30 mt-2 pt-2">
                <span>Total</span>
                <CurrencyDisplay amount={cartTotal} className="text-orange-400" />
              </div>
            </div>

            <div className="flex flex-col space-y-2 sm:space-y-3 w-full mt-3 sm:mt-4">
              <Button
                variant={selectedCustomer ? 'outline' : 'default'}
                size={isMobile ? 'sm' : 'default'}
                className={`w-full btn-hover-effect ${selectedCustomer ? 'border-orange-500/30' : 'bg-gradient-to-r from-orange-500 to-cuephoria-purple'} h-10 sm:h-11 text-xs sm:text-sm rounded-lg`}
                onClick={() => setIsCustomerDialogOpen(true)}>
                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="truncate">{selectedCustomer ? selectedCustomer.name : 'Select Customer'}</span>
                {selectedCustomer && (
                  <span className="ml-1 text-[10px] text-gray-400">({selectedCustomer.phone})</span>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 transition-all duration-300 active:scale-95 h-10 sm:h-11 text-xs sm:text-sm rounded-lg font-medium"
                  disabled={cart.length === 0}
                  onClick={() => setIsCheckoutDialogOpen(true)}>
                  <ReceiptIcon className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Checkout
                </Button>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 transition-all duration-300 active:scale-95 h-10 sm:h-11 text-xs sm:text-sm rounded-lg font-medium"
                  disabled={cart.length === 0}
                  onClick={() => setIsCompDialogOpen(true)}>
                  <Gift className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Comp
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* ===== MENU ITEMS (Right, 2 cols) ===== */}
        <Card className={`lg:col-span-2 ${isMobile ? 'h-auto min-h-[500px]' : 'h-[calc(100vh-12rem)]'} flex flex-col animate-slide-up delay-200`}>
          <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-transparent to-orange-500/10 flex-shrink-0 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-xl font-heading mb-2 sm:mb-3">Menu</CardTitle>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input placeholder="Search menu items..." className="pl-8 font-quicksand h-9 sm:h-10 text-sm rounded-lg"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5"><X className="h-4 w-4 text-gray-500" /></button>
                )}
              </div>
            </div>
          </CardHeader>

          <div className="flex flex-col flex-grow min-h-0">
            {/* Category tabs — same style as gaming POS */}
            <div className="px-2 sm:px-3 md:px-6 bg-gradient-to-r from-orange-500/10 to-cuephoria-purple/10 flex-shrink-0 animate-scale-in">
              <div className={`${isMobile ? 'flex w-full overflow-x-auto scrollbar-hide gap-1 mb-3 p-1' : 'flex flex-wrap gap-1 mb-4 p-1'}`}>
                <button type="button" onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
                  className={`text-[10px] sm:text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 rounded-lg font-medium transition-all duration-200 ${
                    activeTab === 'all' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-muted-foreground hover:text-white hover:bg-orange-500/20'
                  }`}>
                  All ({categoryCounts.all || 0})
                </button>
                {activeCategories.map((cat, i) => {
                  const colors = categoryColorMap[(i + 1) % 6] || categoryColorMap[0];
                  return (
                    <button key={cat.id} type="button" onClick={() => { setActiveTab(cat.id); setSearchQuery(''); }}
                      className={`text-[10px] sm:text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 rounded-lg font-medium transition-all duration-200 ${
                        activeTab === cat.id ? colors.active : colors.inactive
                      }`}>
                      {cat.name} ({categoryCounts[cat.id] || 0})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-grow min-h-0 m-0 p-4 sm:p-6 overflow-auto">
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 auto-rows-fr">
                  {filteredItems.map((item, index) => {
                    const inCart = cart.find(c => c.menuItemId === item.id);
                    return (
                      <div key={item.id} className="animate-scale-in" style={{ animationDelay: `${(index % 8) * 50}ms` }}>
                        <Card className="h-full flex flex-col group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 cursor-pointer"
                          onClick={() => addToCart(item)}>
                          {inCart && (
                            <div className="absolute top-2 right-2 z-10 h-6 min-w-[24px] px-1.5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold shadow-lg">
                              {inCart.quantity}
                            </div>
                          )}
                          {item.imageUrl && (
                            <div className="h-24 overflow-hidden">
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          )}
                          <CardContent className="flex-1 p-3">
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
                          </CardContent>
                          <CardFooter className="p-3 pt-0 flex justify-between items-center">
                            <span className="text-sm font-bold text-orange-400"><CurrencyDisplay amount={item.price} /></span>
                            {item.prepTimeMinutes && (
                              <span className="text-[9px] text-gray-500 font-quicksand">{item.prepTimeMinutes}min</span>
                            )}
                          </CardFooter>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                  <Coffee className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                  <h3 className="text-xl font-medium font-heading">No Items Found</h3>
                  <p className="text-muted-foreground mt-2">Try a different search or category</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ===== CUSTOMER SELECTION DIALOG ===== */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Select Customer</DialogTitle>
            <DialogDescription>Choose a customer from the main database</DialogDescription>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone, or ID..." className="pl-8 font-quicksand"
              value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} />
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {filteredCustomers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer, index) => (
                  <Card key={customer.id}
                    className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-1 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 animate-scale-in"
                    style={{ animationDelay: `${(index % 6) * 80}ms` }}
                    onClick={() => handleSelectCustomer(customer)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-600 to-cuephoria-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{customer.name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </div>
                        </div>
                        {customer.isMember && (
                          <span className="text-[9px] bg-cuephoria-purple/30 text-purple-300 px-1.5 py-0.5 rounded">Member</span>
                        )}
                      </div>
                      {customer.customerId && (
                        <div className="flex items-center gap-1 mb-2 text-[10px] text-purple-300 font-mono bg-purple-900/20 rounded px-2 py-1 border border-purple-500/10">
                          <span>#{customer.customerId}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-800/40 rounded p-1.5">
                          <p className="text-xs font-bold text-yellow-400">{customer.loyaltyPoints}</p>
                          <p className="text-[9px] text-gray-500">Points</p>
                        </div>
                        <div className="bg-gray-800/40 rounded p-1.5">
                          <p className="text-xs font-bold text-green-400"><CurrencyDisplay amount={customer.totalSpent} /></p>
                          <p className="text-[9px] text-gray-500">Spent</p>
                        </div>
                        <div className="bg-gray-800/40 rounded p-1.5">
                          <p className="text-xs font-bold text-blue-400">{Math.floor(customer.totalPlayTime / 60)}h</p>
                          <p className="text-[9px] text-gray-500">Play</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-3 pt-0">
                      <Button className="w-full bg-gradient-to-r from-orange-600 to-cuephoria-purple hover:opacity-90 text-white border-0 text-xs h-8">
                        Select Customer
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium font-heading">No Customers Found</h3>
                <p className="text-muted-foreground mt-2">Try a different search</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== CHECKOUT DIALOG ===== */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Complete Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedCustomer && (
              <div className="border rounded-md p-3 bg-gradient-to-r from-orange-500/10 to-transparent animate-fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium flex items-center">
                      <User className="h-4 w-4 mr-2 text-orange-400" /> {selectedCustomer.name}
                    </div>
                    <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                  </div>
                  {selectedCustomer.isMember && (
                    <div className="bg-cuephoria-purple text-white text-xs px-2 py-1 rounded">Member</div>
                  )}
                </div>
                {selectedCustomer.loyaltyPoints > 0 && (
                  <div className="mt-2 text-sm flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    Points: <span className="font-semibold text-yellow-400">{selectedCustomer.loyaltyPoints}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 animate-slide-up delay-100">
              <h4 className="font-medium font-heading">Discount</h4>
              <div className="flex space-x-2">
                <Input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="Amount" className="font-quicksand flex-1" />
                <select className="px-3 py-2 rounded-md border border-input bg-background font-quicksand"
                  value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}>
                  <option value="percentage">%</option>
                  <option value="fixed">₹</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 animate-slide-up delay-100">
              <Label className="font-heading">Order Notes</Label>
              <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Optional notes..." className="font-quicksand" />
            </div>

            <div className="border-t pt-4 mt-2 animate-slide-up delay-200">
              <div className="flex justify-between py-1"><span>Subtotal</span><CurrencyDisplay amount={cartSubtotal} /></div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-green-400">
                  <span>Discount {discountType === 'percentage' ? `(${discountAmount}%)` : ''}</span>
                  <span>-<CurrencyDisplay amount={discount} /></span>
                </div>
              )}
              <div className="flex justify-between py-1 text-lg font-bold border-t mt-2 pt-2">
                <span>Total</span><CurrencyDisplay amount={cartTotal} className="text-orange-400" />
              </div>
            </div>

            <div className="space-y-3 animate-slide-up delay-300">
              <h4 className="font-medium font-heading">Payment Method</h4>
              <RadioGroup value={paymentMethod} onValueChange={(v) => handlePaymentMethodChange(v as any)} className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cafe-cash" /><Label htmlFor="cafe-cash" className="font-quicksand">Cash</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="upi" id="cafe-upi" /><Label htmlFor="cafe-upi" className="font-quicksand">UPI</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="split" id="cafe-split" /><Label htmlFor="cafe-split" className="font-quicksand">Split</Label></div>
              </RadioGroup>
            </div>

            {paymentMethod === 'split' && (
              <div className="grid grid-cols-2 gap-3 animate-slide-up delay-350">
                <div className="space-y-1">
                  <Label className="text-sm font-quicksand">Cash</Label>
                  <Input type="number" value={cashAmount} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setCashAmount(v); setUpiAmount(Math.max(0, cartTotal - v)); }}
                    className="font-quicksand" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-quicksand">UPI</Label>
                  <Input type="number" value={upiAmount} onChange={(e) => { const v = parseFloat(e.target.value) || 0; setUpiAmount(v); setCashAmount(Math.max(0, cartTotal - v)); }}
                    className="font-quicksand" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="animate-slide-up delay-400">
            <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={isSubmitting || cart.length === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90">
              {isSubmitting ? 'Processing...' : `Place Order (${formatCurrency(cartTotal)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== COMP DIALOG ===== */}
      <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Gift className="h-5 w-5 text-orange-500" /> Complimentary
            </DialogTitle>
            <DialogDescription>Items given free. No payment recorded.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCustomer && (
              <div className="border border-orange-500/20 rounded-md p-3 bg-gradient-to-r from-orange-900/20 to-transparent">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-orange-400" /><span className="font-medium">{selectedCustomer.name}</span></div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cafe-comp-note" className="font-heading">Reason (Optional)</Label>
              <Input id="cafe-comp-note" placeholder="e.g., Owner, Staff meal..." value={compNote}
                onChange={(e) => setCompNote(e.target.value)} className="font-quicksand" />
            </div>
            <div className="border rounded-md p-3 bg-gradient-to-r from-orange-500/10 to-cuephoria-purple/10">
              <h4 className="font-medium mb-2 font-heading">Items</h4>
              <div className="space-y-1 max-h-32 overflow-auto">
                {cart.map(item => (
                  <div key={item.menuItemId} className="flex justify-between text-sm">
                    <span className="font-quicksand">{item.name} x {item.quantity}</span>
                    <span className="font-mono font-semibold"><CurrencyDisplay amount={item.total} /></span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold border-t mt-2 pt-2">
                <span className="font-heading">Total Value</span>
                <CurrencyDisplay amount={cartSubtotal} className="text-orange-400" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCompDialogOpen(false); setCompNote(''); }}>Cancel</Button>
            <Button onClick={() => { setPaymentMethod('complimentary'); handlePlaceOrder(); }}
              disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90">
              <Gift className="mr-2 h-4 w-4" /> {isSubmitting ? 'Processing...' : 'Confirm Comp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SUCCESS DIALOG ===== */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md animate-scale-in text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading mb-2 flex items-center justify-center gap-2">
              <div className="rounded-full bg-green-500/20 p-3"><Check className="h-8 w-8 text-green-400" /></div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <h3 className="text-2xl font-bold mb-2">Order Placed!</h3>
            <DialogDescription className="text-center mb-4">{lastOrder?.orderNumber}</DialogDescription>
            <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-4 rounded-lg w-full mb-4">
              <p className="font-bold text-3xl mb-2 text-green-400"><CurrencyDisplay amount={lastOrder?.total || 0} /></p>
              <p className="text-sm text-muted-foreground">{new Date().toLocaleString('en-IN')}</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button onClick={handlePrintReceipt} className="w-full bg-cuephoria-purple hover:bg-cuephoria-purple/90">
                <Printer className="mr-2 h-4 w-4" /> Print Receipt
              </Button>
              <Button variant="outline" onClick={() => { setShowSuccess(false); setLastOrder(null); }} className="w-full">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CafePOS;
