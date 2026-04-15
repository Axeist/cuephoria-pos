import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  Loader2, Clock, CheckCircle2, CookingPot, Search, X, History, RefreshCw, Sparkles, UtensilsCrossed
} from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';
import { normalizeIndianMobile10, phoneMatchVariants } from '@/lib/cafeCustomerLookup';

type Step = 'landing' | 'identify' | 'menu' | 'cart' | 'checkout' | 'tracking' | 'history';

const PHONE_STORAGE_KEY = 'cuephoria_cafe_phone';
const NAME_STORAGE_KEY = 'cuephoria_cafe_name';

/* ─────────────────── Animated coffee cup SVG for loading ─────────────────── */
const AnimatedCoffeeCup = () => (
  <div className="relative w-20 h-20">
    <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
      {/* Steam lines */}
      <path d="M22 18 Q22 10 26 6" stroke="url(#steamGrad)" strokeWidth="2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: '0s' }} />
      <path d="M30 16 Q30 8 34 4" stroke="url(#steamGrad)" strokeWidth="2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
      <path d="M38 18 Q38 10 42 6" stroke="url(#steamGrad)" strokeWidth="2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
      {/* Cup body */}
      <rect x="14" y="24" width="32" height="28" rx="4" fill="url(#cupGrad)" />
      {/* Cup handle */}
      <path d="M46 30 Q54 30 54 40 Q54 48 46 48" stroke="url(#cupGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Saucer */}
      <ellipse cx="30" cy="56" rx="22" ry="4" fill="#f97316" opacity="0.3" />
      <defs>
        <linearGradient id="steamGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cupGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#6E59A5" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const CafeCustomerOrder: React.FC = () => {
  const [categories, setCategories] = useState<CafeMenuCategory[]>([]);
  const [items, setItems] = useState<CafeMenuItem[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CafeCartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('landing');
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
  const [landingVisible, setLandingVisible] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);
  const phoneSearchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Auto-detect existing session on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem(PHONE_STORAGE_KEY);
    const savedName = localStorage.getItem(NAME_STORAGE_KEY);
    if (savedPhone && savedName) {
      setCustomerPhone(savedPhone);
      setCustomerName(savedName);
      setHistoryPhone(savedPhone);
      setStep('menu');
    } else {
      setLandingVisible(true);
    }
  }, []);

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

  const popularItemIds = useMemo(() => new Set(items.slice(0, 3).map(i => i.id)), [items]);

  const addToCart = useCallback((item: CafeMenuItem) => {
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 400);
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

  const searchCustomerByPhone = useCallback(async (phone: string) => {
    const core = normalizeIndianMobile10(phone);
    if (!core) return;
    setCustomerSearching(true);
    setCustomerFound(null);
    setLinkedCustomerId(null);
    try {
      const variants = phoneMatchVariants(core);
      const orClause = variants.map(v => `phone.eq.${v}`).join(',');
      let { data: rows, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .or(orClause)
        .limit(20);
      if (error) throw error;
      if (!rows?.length) {
        const { data: loose } = await supabase
          .from('customers')
          .select('id, name, phone')
          .ilike('phone', `%${core}%`)
          .limit(20);
        rows = loose || [];
      }
      let match = rows?.find(r => normalizeIndianMobile10(r.phone || '') === core);
      if (!match && rows?.length === 1) match = rows[0];
      if (!match && rows && rows.length > 1) {
        match = rows.find(r => {
          const d = normalizeIndianMobile10(r.phone || '');
          return d === core;
        }) || rows[0];
      }
      if (match) {
        setCustomerName(match.name || '');
        setLinkedCustomerId(match.id);
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
      }
    } catch {
      setCustomerFound(false);
    } finally {
      setCustomerSearching(false);
    }
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(digits);
    setCustomerFound(null);
    setLinkedCustomerId(null);
    setCustomerName('');
    if (phoneSearchTimeout.current) clearTimeout(phoneSearchTimeout.current);
    if (digits.length === 10) {
      phoneSearchTimeout.current = setTimeout(() => searchCustomerByPhone(digits), 300);
    }
  }, [searchCustomerByPhone]);

  const handleIdentifySubmit = () => {
    if (customerPhone.length === 10) {
      localStorage.setItem(PHONE_STORAGE_KEY, customerPhone);
      if (customerName) localStorage.setItem(NAME_STORAGE_KEY, customerName);
    }
    setStep('menu');
  };

  const handleSkipIdentify = () => {
    setStep('menu');
  };

  const handleFetchHistory = async () => {
    if (!historyPhone || historyPhone.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.from('cafe_orders').select('*')
        .eq('customer_phone', historyPhone).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setOrderHistory((data || []).map(r => transformOrderRow(r as unknown as CafeOrderRow)));
    } catch {
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
        customer_id: linkedCustomerId,
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

      localStorage.setItem(PHONE_STORAGE_KEY, customerPhone.trim());
      localStorage.setItem(NAME_STORAGE_KEY, customerName.trim());

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
    { key: 'pending', label: 'Placed', icon: ShoppingCart },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'preparing', label: 'Preparing', icon: CookingPot },
    { key: 'ready', label: 'Ready', icon: Coffee },
    { key: 'served', label: 'Served', icon: UtensilsCrossed },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];
  const currentStepIndex =
    orderStatus === 'cancelled'
      ? -1
      : Math.max(0, trackingSteps.findIndex(s => s.key === orderStatus));

  /* ═══════════════════════════════ LOADING ═══════════════════════════════ */
  if (loading && step !== 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] gap-6">
        <div className="animate-bounce">
          <AnimatedCoffeeCup />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-heading text-white animate-pulse">
            Preparing your menu...
          </p>
          <div className="flex items-center justify-center gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full animate-pulse"
                style={{
                  background: i % 2 === 0 ? '#f97316' : '#6E59A5',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ LANDING ═══════════════════════════════ */
  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-6 overflow-hidden">
        <div
          className="flex flex-col items-center gap-8 max-w-sm w-full transition-all duration-1000 ease-out"
          style={{
            opacity: landingVisible ? 1 : 0,
            transform: landingVisible ? 'translateY(0)' : 'translateY(30px)',
          }}
        >
          {/* Logos */}
          <div className="flex items-center gap-4">
            <img
              src="/choco-loca-logo.png"
              alt="Choco Loca"
              className="h-20 w-20 rounded-2xl object-contain bg-white/5 p-1 shadow-lg shadow-orange-500/10"
            />
            <span className="text-3xl text-gray-600 font-thin select-none">&times;</span>
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria"
              className="h-20 w-20 rounded-2xl object-contain bg-white/5 p-1 shadow-lg shadow-purple-500/10"
            />
          </div>

          {/* Brand text */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-heading font-bold bg-gradient-to-r from-orange-400 via-orange-300 to-purple-400 bg-clip-text text-transparent leading-tight">
              Choco Loca &times; Cuephoria
            </h1>
            <p className="text-gray-400 font-quicksand text-lg tracking-widest uppercase">
              Cakes & Cafe
            </p>
          </div>

          {/* Decorative line */}
          <div className="w-24 h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-500 opacity-50" />

          {/* CTA */}
          <button
            onClick={() => setStep('identify')}
            className="w-full py-4 rounded-2xl text-white font-quicksand font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl shadow-orange-500/20"
            style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }}
          >
            Start Ordering
          </button>

          <p className="text-[11px] text-gray-600 font-quicksand">
            Powered by Cuephoria
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ IDENTIFY ═══════════════════════════════ */
  if (step === 'identify') {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
              <User className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white">Welcome!</h2>
            <p className="text-gray-400 font-quicksand text-sm">Enter your phone number so we can remember you</p>
          </div>

          {/* Phone input */}
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="tel"
                inputMode="numeric"
                value={customerPhone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="Phone number"
                maxLength={10}
                autoFocus
                className="w-full h-14 pl-12 pr-12 rounded-2xl bg-white/5 border border-gray-700/50 text-white font-quicksand text-lg tracking-wider placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
              />
              {customerSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-400 animate-spin" />
              )}
              {customerFound === true && !customerSearching && (
                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-400" />
              )}
            </div>

            {/* Welcome back message */}
            {customerFound === true && customerName && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center animate-in fade-in duration-300">
                <p className="text-green-400 font-quicksand font-medium">
                  Welcome back, <span className="font-bold">{customerName}</span>!
                </p>
              </div>
            )}

            {/* Name input for new customers */}
            {customerFound === false && customerPhone.length === 10 && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-sm text-gray-400 font-quicksand">New here? Tell us your name</p>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/5 border border-gray-700/50 text-white font-quicksand text-lg placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleIdentifySubmit}
              disabled={customerPhone.length < 10 || customerSearching || (!customerName && customerFound !== true)}
              className="w-full py-4 rounded-2xl text-white font-quicksand font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-orange-500/20"
              style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Continue to Menu'}
            </button>

            <button
              onClick={handleSkipIdentify}
              className="w-full py-3 rounded-2xl text-gray-500 font-quicksand text-sm hover:text-gray-400 transition-colors"
            >
              Skip &mdash; order as guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Loading overlay for menu step (after identify) */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050508] gap-6">
        <div className="animate-bounce">
          <AnimatedCoffeeCup />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-heading text-white animate-pulse">Preparing your menu...</p>
          <div className="flex items-center justify-center gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: i % 2 === 0 ? '#f97316' : '#6E59A5', animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ APP SHELL ═══════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#050508]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a10]/95 backdrop-blur-lg border-b border-gray-800/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {step !== 'menu' && step !== 'tracking' && (
            <button onClick={() => setStep(step === 'checkout' ? 'cart' : step === 'history' ? 'menu' : 'menu')} className="p-1.5 rounded-xl hover:bg-white/5 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>
          )}
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-orange-500/10">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold bg-gradient-to-r from-orange-400 to-purple-400 bg-clip-text text-transparent font-heading leading-tight">
              Choco Loca
            </span>
            <span className="text-[10px] text-gray-500 font-quicksand -mt-0.5 tracking-wider uppercase">
              at Cuephoria
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step === 'menu' && (
            <button onClick={() => setStep('history')} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Order history">
              <History className="h-4 w-4 text-gray-400" />
            </button>
          )}
          {step === 'menu' && cartCount > 0 && (
            <button onClick={() => setStep('cart')} className="relative p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 transition-colors">
              <ShoppingCart className="h-5 w-5 text-orange-400" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold shadow-lg shadow-orange-500/30">
                {cartCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ─── MENU ─── */}
      {step === 'menu' && (
        <div className="p-4 space-y-5 pb-28">
          {/* Greeting */}
          {customerName && (
            <div className="flex items-center gap-2 animate-in fade-in duration-500">
              <span className="text-sm text-gray-500 font-quicksand">Hey,</span>
              <span className="text-sm text-white font-quicksand font-semibold">{customerName}</span>
              <span className="text-sm">👋</span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
              placeholder="Search for dishes..."
              className="pl-11 h-12 bg-white/5 border-gray-800/50 text-white font-quicksand rounded-2xl placeholder:text-gray-600 focus-visible:ring-orange-500/20"
            />
            {menuSearch && (
              <button onClick={() => setMenuSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
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
                    className={`px-5 py-2.5 rounded-2xl text-sm font-quicksand font-medium whitespace-nowrap transition-all duration-300 ${
                      displayCategory === cat.id
                        ? 'text-white shadow-lg shadow-orange-500/20'
                        : 'bg-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'
                    }`}
                    style={displayCategory === cat.id ? { background: 'linear-gradient(135deg, #f97316, #6E59A5)' } : undefined}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map((item, index) => {
              const inCart = cart.find(c => c.menuItemId === item.id);
              const isPopular = popularItemIds.has(item.id);
              const justAdded = addedItemId === item.id;
              return (
                <div
                  key={item.id}
                  className={`bg-white/[0.03] rounded-2xl border border-gray-800/50 overflow-hidden group transition-all duration-300 hover:border-gray-700/50 ${justAdded ? 'scale-95' : 'scale-100'}`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="relative">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover" />
                    )}
                    {isPopular && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[10px] font-quicksand font-bold flex items-center gap-1 shadow-lg">
                        <Sparkles className="h-2.5 w-2.5" /> Popular
                      </span>
                    )}
                    {/* Veg/Non-veg badge on image */}
                    <span className={`absolute top-2 right-2 h-5 w-5 rounded-md flex items-center justify-center ${item.isVeg ? 'bg-green-500/20 border border-green-400/50' : 'bg-red-500/20 border border-red-400/50'}`}>
                      <span className={`block h-2 w-2 rounded-full ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                    </span>
                  </div>

                  <div className="p-3 space-y-2">
                    <p className="text-sm font-semibold text-white font-quicksand leading-tight line-clamp-2">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 leading-snug">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-base font-bold text-orange-400 font-quicksand">
                        <CurrencyDisplay amount={item.price} />
                      </span>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors active:scale-90">
                            <Minus className="h-3.5 w-3.5 text-white" />
                          </button>
                          <span className="text-sm w-6 text-center text-white font-bold font-quicksand">{inCart.quantity}</span>
                          <button onClick={() => addToCart(item)} className="h-8 w-8 rounded-xl bg-orange-500 flex items-center justify-center hover:bg-orange-400 transition-colors active:scale-90 shadow-lg shadow-orange-500/30">
                            <Plus className="h-3.5 w-3.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="px-4 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 text-xs font-quicksand font-bold hover:bg-orange-500/20 transition-all active:scale-90 border border-orange-500/20"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-500">
                <Coffee className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-quicksand text-sm">No items found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── FLOATING CART BAR ─── */}
      {step === 'menu' && cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050508] via-[#050508]/95 to-transparent pt-10 z-30">
          <button
            onClick={() => setStep('cart')}
            className="w-full flex items-center justify-between p-4 rounded-2xl text-white font-quicksand font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] shadow-xl shadow-orange-500/20"
            style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <span>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
            </div>
            <span className="text-lg font-bold"><CurrencyDisplay amount={cartTotal} /></span>
          </button>
        </div>
      )}

      {/* ─── CART ─── */}
      {step === 'cart' && (
        <div className="p-4 space-y-4 pb-24">
          <h2 className="text-xl font-bold text-white font-heading">Your Order</h2>
          {cart.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-quicksand text-sm">Cart is empty</p>
              <Button onClick={() => setStep('menu')} className="mt-4 bg-white/5 text-gray-400 hover:bg-white/10 border-0 rounded-xl" variant="outline">Browse Menu</Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.menuItemId} className="p-4 bg-white/[0.03] rounded-2xl border border-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white font-quicksand flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className="truncate">{item.name}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 font-quicksand"><CurrencyDisplay amount={item.price} /> each</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => updateQuantity(item.menuItemId, -1)} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors active:scale-90">
                          <Minus className="h-3.5 w-3.5 text-white" />
                        </button>
                        <span className="text-sm w-6 text-center text-white font-bold font-quicksand">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.menuItemId, 1)} className="h-8 w-8 rounded-xl bg-orange-500 flex items-center justify-center hover:bg-orange-400 transition-colors active:scale-90">
                          <Plus className="h-3.5 w-3.5 text-white" />
                        </button>
                        <button onClick={() => removeFromCart(item.menuItemId)} className="ml-1 p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="h-4 w-4 text-red-400/70 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2.5 gap-3">
                      <Input
                        value={item.notes || ''}
                        onChange={e => setCart(prev => prev.map(c => c.menuItemId === item.menuItemId ? { ...c, notes: e.target.value } : c))}
                        placeholder="Special instructions..."
                        className="h-8 text-xs bg-transparent border-0 border-b border-gray-800/30 rounded-none px-0 text-gray-400 font-quicksand placeholder:text-gray-700 focus-visible:ring-0 focus-visible:border-orange-500/30"
                      />
                      <span className="text-base font-bold text-orange-400 font-quicksand whitespace-nowrap"><CurrencyDisplay amount={item.total} /></span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-800/50">
                <span className="text-white font-heading">Total</span>
                <span className="text-orange-400"><CurrencyDisplay amount={cartTotal} /></span>
              </div>

              <div className="flex gap-3 pt-1">
                <Button onClick={() => setStep('menu')} variant="outline" className="flex-1 h-12 border-gray-800 text-gray-400 hover:bg-white/5 hover:text-gray-300 rounded-2xl">
                  <Plus className="h-4 w-4 mr-1.5" /> Add More
                </Button>
                <Button
                  onClick={() => setStep('checkout')}
                  disabled={cart.length === 0}
                  className="flex-1 h-12 text-base font-quicksand font-semibold text-white border-0 rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)', boxShadow: '0 4px 20px rgba(249,115,22,0.25)' }}
                >
                  Checkout
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── CHECKOUT ─── */}
      {step === 'checkout' && (
        <div className="p-4 space-y-5 max-w-md mx-auto pb-8">
          <h2 className="text-xl font-bold text-white font-heading">Your Details</h2>

          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Your name *"
                className="pl-11 h-12 bg-white/5 border-gray-800/50 text-white font-quicksand rounded-2xl placeholder:text-gray-600"
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Phone number *"
                className="pl-11 h-12 bg-white/5 border-gray-800/50 text-white font-quicksand rounded-2xl placeholder:text-gray-600"
                maxLength={10}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsTakeaway(false)}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-quicksand font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                  !isTakeaway
                    ? 'text-orange-400 border border-orange-500/50 shadow-lg shadow-orange-500/10'
                    : 'bg-white/5 border border-gray-800/50 text-gray-500 hover:text-gray-400'
                }`}
                style={!isTakeaway ? { background: 'rgba(249, 115, 22, 0.1)' } : undefined}
              >
                <MapPin className="h-4 w-4" /> Dine In
              </button>
              <button
                onClick={() => { setIsTakeaway(true); setSelectedTableId(null); }}
                className={`flex-1 py-3.5 rounded-2xl text-sm font-quicksand font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                  isTakeaway
                    ? 'text-orange-400 border border-orange-500/50 shadow-lg shadow-orange-500/10'
                    : 'bg-white/5 border border-gray-800/50 text-gray-500 hover:text-gray-400'
                }`}
                style={isTakeaway ? { background: 'rgba(249, 115, 22, 0.1)' } : undefined}
              >
                <Coffee className="h-4 w-4" /> Takeaway
              </button>
            </div>

            {!isTakeaway && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 font-quicksand">Select your table:</p>
                {zones.map(zone => {
                  const availableTables = tables.filter(t => t.zone === zone && !t.isOccupied);
                  if (availableTables.length === 0) return null;
                  return (
                    <div key={zone}>
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-quicksand">{zone}</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTables.map(table => (
                          <button
                            key={table.id}
                            onClick={() => setSelectedTableId(table.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-quicksand font-medium transition-all duration-300 ${
                              selectedTableId === table.id
                                ? 'text-orange-400 border border-orange-500/50 shadow-lg shadow-orange-500/10'
                                : 'bg-white/5 border border-gray-800/50 text-gray-500 hover:text-gray-400 hover:bg-white/10'
                            }`}
                            style={selectedTableId === table.id ? { background: 'rgba(249, 115, 22, 0.1)' } : undefined}
                          >
                            {table.tableName} ({table.capacity})
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
          <div className="bg-white/[0.03] rounded-2xl border border-gray-800/50 p-4 space-y-2">
            <p className="text-xs text-gray-500 font-quicksand uppercase tracking-wider mb-2">Order Summary</p>
            {cart.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-sm font-quicksand">
                <span className="text-gray-400">{item.quantity}x {item.name}</span>
                <span className="text-white font-medium"><CurrencyDisplay amount={item.total} /></span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-800/50 mt-2">
              <span className="text-white font-heading">Total</span>
              <span className="text-orange-400"><CurrencyDisplay amount={cartTotal} /></span>
            </div>
          </div>

          <Button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
            className="w-full h-14 text-base font-quicksand font-semibold text-white border-0 rounded-2xl transition-all hover:scale-[1.01] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)', boxShadow: '0 4px 20px rgba(249,115,22,0.25)' }}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Place Order'}
          </Button>
          <p className="text-[11px] text-gray-600 text-center font-quicksand">Payment will be collected at the counter</p>
        </div>
      )}

      {/* ─── TRACKING ─── */}
      {step === 'tracking' && (
        <div className="p-4 space-y-6 max-w-md mx-auto pb-8">
          <div className="text-center pt-6">
            <div className="h-18 w-18 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/20 h-[72px] w-[72px]">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white font-heading">Order Placed!</h2>
            <p className="text-sm text-gray-400 font-quicksand mt-1.5">{orderNumber}</p>
          </div>

          <div className="space-y-0 relative">
            <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gray-800/50" />
            {trackingSteps.map((s, i) => {
              const allComplete = orderStatus === 'completed';
              const isActive = !allComplete && i === currentStepIndex;
              const isCompleted = allComplete || (currentStepIndex >= 0 && i < currentStepIndex);
              return (
                <div key={s.key} className="flex items-center gap-4 py-3.5 relative z-10">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isCompleted ? 'bg-green-500 shadow-lg shadow-green-500/30'
                    : isActive ? 'bg-orange-500 shadow-lg shadow-orange-500/30 animate-pulse'
                    : 'bg-white/5 border-2 border-gray-800'
                  }`}>
                    <s.icon className={`h-5 w-5 ${isCompleted || isActive ? 'text-white' : 'text-gray-700'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-quicksand font-semibold transition-colors ${isActive ? 'text-orange-400' : isCompleted ? 'text-green-400' : 'text-gray-700'}`}>
                      {s.label}
                    </p>
                    {isActive && <p className="text-xs text-gray-500 animate-pulse mt-0.5">In progress...</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {orderStatus === 'ready' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center animate-in fade-in zoom-in-95 duration-500">
              <Coffee className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="text-xl font-bold text-green-400 font-heading">Your order is ready!</p>
              <p className="text-sm text-gray-400 font-quicksand mt-1">Please collect from the counter</p>
            </div>
          )}

          {(orderStatus === 'served' || orderStatus === 'completed') && (
            <div className="text-center pt-2">
              <Button
                onClick={() => { setStep('menu'); setCart([]); setOrderId(null); }}
                className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-0 rounded-2xl px-6 h-12"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Order Again
              </Button>
            </div>
          )}

          <p className="text-[11px] text-gray-600 text-center font-quicksand pt-4">Powered by Cuephoria</p>
        </div>
      )}

      {/* ─── HISTORY ─── */}
      {step === 'history' && (
        <div className="p-4 space-y-4 max-w-md mx-auto pb-8">
          <h2 className="text-xl font-bold text-white font-heading">Order History</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                type="tel"
                value={historyPhone}
                onChange={e => setHistoryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Your phone number"
                className="pl-11 h-12 bg-white/5 border-gray-800/50 text-white font-quicksand rounded-2xl placeholder:text-gray-600"
                maxLength={10}
              />
            </div>
            <Button
              onClick={handleFetchHistory}
              disabled={historyLoading}
              className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-0"
            >
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {orderHistory.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-quicksand text-sm">{historyPhone ? 'No orders found' : 'Enter your phone number to see history'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orderHistory.map(order => (
                  <div key={order.id} className="p-4 bg-white/[0.03] rounded-2xl border border-gray-800/50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white font-heading">{order.orderNumber}</span>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full capitalize font-quicksand font-medium ${
                        order.status === 'completed' ? 'bg-green-500/10 text-green-400'
                        : order.status === 'cancelled' ? 'bg-red-500/10 text-red-400'
                        : 'bg-orange-500/10 text-orange-400'
                      }`}>{order.status}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-xs text-gray-500 font-quicksand">
                      <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="text-orange-400 font-bold text-sm"><CurrencyDisplay amount={order.total} /></span>
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
