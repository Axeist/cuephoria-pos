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
  Loader2, Clock, CheckCircle2, CookingPot, Search, X, History, RefreshCw,
  Sparkles, UtensilsCrossed, Leaf, ChevronRight, ChevronDown, Flame, Star, ArrowRight, Shield, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';
import { normalizeIndianMobile10, phoneMatchVariants } from '@/lib/cafeCustomerLookup';

type Step = 'landing' | 'identify' | 'menu' | 'cart' | 'checkout' | 'tracking' | 'history';
type DietFilter = 'all' | 'veg' | 'nonveg';

const PHONE_STORAGE_KEY = 'cuephoria_cafe_phone';
const NAME_STORAGE_KEY = 'cuephoria_cafe_name';

/* ═══════════════════════════════ GLASS HELPERS ═══════════════════════════════ */
const glass =
  'rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.07)]';

const glassCard =
  'rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent backdrop-blur-xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]';

const accentGrad = 'linear-gradient(135deg, #f97316 0%, #a855f7 60%, #6366f1 100%)';
const accentGradSoft = 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(168,85,247,0.12))';

const FOOD_EMOJIS = ['🍕', '🍔', '🌮', '🍜', '🍰', '☕', '🍩', '🧁', '🍪', '🥐', '🍳', '🥘', '🍲', '🎂', '🍿'];
const PLACING_MESSAGES = [
  'Sending your order to the kitchen…',
  'Our chefs are getting excited…',
  'Warming up the pans…',
  'Picking the freshest ingredients…',
  'A delicious meal is on its way…',
  'Almost there — hang tight!',
];

const OrderPlacingSplash: React.FC<{ cartTotal: number; itemCount: number }> = ({ cartTotal, itemCount }) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [emojis] = useState(() => {
    const shuffled = [...FOOD_EMOJIS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  });

  useEffect(() => {
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % PLACING_MESSAGES.length), 2200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, hsl(222 47% 10%) 0%, hsl(222 47% 4%) 70%)' }}>
      
      {/* Floating food emojis */}
      {emojis.map((emoji, i) => (
        <span
          key={i}
          className="absolute text-3xl opacity-0 pointer-events-none select-none"
          style={{
            left: `${10 + (i % 4) * 22}%`,
            animation: `foodFloat ${3.5 + (i % 3) * 0.8}s ease-in-out ${i * 0.4}s infinite`,
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Warm radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} />
      <div className="absolute bottom-1/4 left-1/3 h-60 w-60 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 max-w-sm text-center">
        {/* Animated plate / bowl */}
        <div className="relative">
          <div className="h-28 w-28 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="h-20 w-20 rounded-full flex items-center justify-center animate-pulse"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(168,85,247,0.2))' }}>
              <span className="text-5xl" style={{ animation: 'wiggle 1.5s ease-in-out infinite' }}>🍽️</span>
            </div>
          </div>
          {/* Orbiting ring */}
          <div className="absolute inset-[-6px] rounded-full animate-spin" style={{ animationDuration: '4s' }}>
            <div className="h-3 w-3 rounded-full absolute -top-1 left-1/2 -translate-x-1/2"
              style={{ background: accentGrad, boxShadow: '0 0 12px rgba(249,115,22,0.6)' }} />
          </div>
          {/* Steam wisps */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 bg-white/20 rounded-full"
                style={{ height: 12 + i * 4, animation: `steamRise 1.8s ease-in-out ${i * 0.3}s infinite` }} />
            ))}
          </div>
        </div>

        {/* Cycling message */}
        <div className="min-h-[3rem]">
          <p key={msgIdx} className="text-lg font-heading text-white/90 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {PLACING_MESSAGES[msgIdx]}
          </p>
        </div>

        {/* Order summary chip */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-white/[0.08]"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <span className="text-sm text-zinc-400 font-quicksand">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
          <span className="h-4 w-px bg-white/10" />
          <span className="text-sm font-bold text-orange-300 font-quicksand"><CurrencyDisplay amount={cartTotal} /></span>
        </div>

        {/* Shimmer bar */}
        <div className="w-48 h-1 rounded-full overflow-hidden bg-white/[0.06]">
          <div className="h-full rounded-full" style={{
            background: accentGrad,
            animation: 'shimmerSlide 1.4s ease-in-out infinite',
          }} />
        </div>

        <p className="text-[11px] text-zinc-600 font-quicksand">Please don't close this page</p>
      </div>
    </div>
  );
};

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */
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
  const [kotStatus, setKotStatus] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderPayment, setOrderPayment] = useState<string>('pending');
  const readyNotified = useRef(false);
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
  const [dietFilter, setDietFilter] = useState<DietFilter>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const phoneSearchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem(PHONE_STORAGE_KEY);
    const savedName = localStorage.getItem(NAME_STORAGE_KEY);
    if (savedPhone && savedName) {
      setCustomerPhone(savedPhone);
      setCustomerName(savedName);
      setHistoryPhone(savedPhone);
      (async () => {
        const { data } = await supabase.from('cafe_orders').select('id, order_number, status, payment_method')
          .eq('customer_phone', savedPhone).in('status', ['pending', 'confirmed', 'preparing', 'ready'])
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (data) {
          setOrderId(data.id);
          setOrderNumber(data.order_number);
          setOrderStatus(data.status);
          setOrderPayment(data.payment_method || 'pending');
          setStep('tracking');
        } else {
          setStep('menu');
        }
      })();
    } else {
      setLandingVisible(true);
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
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
    readyNotified.current = false;

    const orderChannel: RealtimeChannel = supabase
      .channel(`customer-order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafe_orders', filter: `id=eq.${orderId}` }, (payload) => {
        if (payload.new) {
          const newStatus = (payload.new as any).status;
          const newPayment = (payload.new as any).payment_method;
          setOrderStatus(newStatus);
          if (newPayment) setOrderPayment(newPayment);
          if (newStatus === 'ready' && !readyNotified.current) {
            readyNotified.current = true;
            try {
              if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.8;
              audio.play().catch(() => {});
            } catch {}
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Your order is ready!', { body: `Order ${orderNumber} — collect from the counter`, icon: '/favicon.ico' });
            }
          }
        }
      })
      .subscribe();

    const kotChannel: RealtimeChannel = supabase
      .channel(`customer-kot-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_kot', filter: `order_id=eq.${orderId}` }, (payload) => {
        if (payload.new) setKotStatus((payload.new as any).status);
      })
      .subscribe();

    (async () => {
      const { data } = await supabase.from('cafe_kot').select('status').eq('order_id', orderId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setKotStatus(data.status);
    })();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(kotChannel);
    };
  }, [orderId, orderNumber]);

  /* ── Derived data ── */
  const displayCategory = activeCategory || categories[0]?.id;

  const filteredItems = useMemo(() => {
    let result = displayCategory ? items.filter(i => i.categoryId === displayCategory) : items;
    if (menuSearch) {
      const q = menuSearch.toLowerCase();
      result = items.filter(i => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
    }
    if (dietFilter === 'veg') result = result.filter(i => i.isVeg);
    if (dietFilter === 'nonveg') result = result.filter(i => !i.isVeg);
    return result;
  }, [items, displayCategory, menuSearch, dietFilter]);

  const cartTotal = cart.reduce((s, i) => s + i.total, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const zones = useMemo(() => [...new Set(tables.map(t => t.zone))].sort(), [tables]);

  const popularItemIds = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    return new Set(sorted.slice(0, 5).map(i => i.id));
  }, [items]);

  const bestsellerIds = useMemo(() => new Set(items.slice(0, 3).map(i => i.id)), [items]);

  const itemCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) map.set(cat.id, cat.name);
    return map;
  }, [categories]);

  /* ── Cart actions ── */
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

  /* ── Customer lookup ── */
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
        match = rows.find(r => normalizeIndianMobile10(r.phone || '') === core) || rows[0];
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

  const handleSkipIdentify = () => setStep('menu');

  const [historyItems, setHistoryItems] = useState<Record<string, { name: string; qty: number; price: number }[]>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleFetchHistory = useCallback(async (phone?: string) => {
    const p = phone || historyPhone;
    if (!p || p.length < 10) { if (!phone) toast.error('Enter a valid 10-digit phone number'); return; }
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.from('cafe_orders')
        .select('*, cafe_order_items(item_name, quantity, unit_price)')
        .eq('customer_phone', p).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      const orders = (data || []).map(r => {
        const itemsArr = ((r as any).cafe_order_items || []).map((i: any) => ({ name: i.item_name, qty: i.quantity, price: i.unit_price }));
        return { order: transformOrderRow(r as unknown as CafeOrderRow), items: itemsArr };
      });
      setOrderHistory(orders.map(o => o.order));
      const itemMap: Record<string, { name: string; qty: number; price: number }[]> = {};
      orders.forEach(o => { itemMap[o.order.id] = o.items; });
      setHistoryItems(itemMap);
    } catch {
      toast.error('Failed to fetch history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPhone]);

  useEffect(() => {
    if (step === 'history' && historyPhone && historyPhone.length >= 10 && orderHistory.length === 0) {
      handleFetchHistory(historyPhone);
    }
  }, [step, historyPhone]);

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) { toast.error('Please enter your name'); return; }
    if (!customerPhone.trim() || customerPhone.length < 10) { toast.error('Please enter a valid phone number'); return; }
    if (cart.length === 0) return;

    setIsSubmitting(true);
    const splashStart = Date.now();
    try {
      const cafeLocation = await supabase.from('locations').select('id').eq('slug', 'cafe').single();
      if (!cafeLocation.data) throw new Error('Cafe not found');

      const partnerRes = await supabase.from('cafe_partners').select('id, partner_rate, cuephoria_rate').eq('location_id', cafeLocation.data.id).eq('is_active', true).limit(1).maybeSingle();
      if (!partnerRes.data) throw new Error('Cafe not configured — please contact staff');

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

      const kotItems = cart.filter(c => {
        const mi = items.find(i => i.id === c.menuItemId);
        return mi ? !inventoryCatIds.has(mi.categoryId) : true;
      });

      if (kotItems.length > 0) {
        try {
          const { data: kotNum } = await supabase.rpc('next_cafe_kot_number', { p_location_id: cafeLocation.data.id });
          await supabase.from('cafe_kot').insert({
            order_id: orderData.id,
            location_id: cafeLocation.data.id,
            kot_number: kotNum as string,
            status: 'pending',
            items: kotItems.map(i => ({ item_id: i.menuItemId, name: i.name, qty: i.quantity, notes: i.notes || undefined })),
            created_by: null,
          });
          await supabase.from('cafe_order_items')
            .update({ kot_status: 'sent_to_kitchen' })
            .eq('order_id', orderData.id)
            .in('menu_item_id', kotItems.map(i => i.menuItemId))
            .eq('kot_status', 'pending');
        } catch (kotErr) {
          console.error('KOT generation failed:', kotErr);
        }
      }

      localStorage.setItem(PHONE_STORAGE_KEY, customerPhone.trim());
      localStorage.setItem(NAME_STORAGE_KEY, customerName.trim());

      const elapsed = Date.now() - splashStart;
      const MIN_SPLASH = 2200;
      if (elapsed < MIN_SPLASH) await new Promise(r => setTimeout(r, MIN_SPLASH - elapsed));

      setOrderId(orderData.id);
      setOrderNumber((orderData as any).order_number);
      setOrderStatus('pending');
      setOrderPayment('pending');
      setStep('tracking');
      toast.success('Order placed successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inventoryCatIds = useMemo(() => new Set(categories.filter(c => c.tracksInventory).map(c => c.id)), [categories]);

  const isInventoryOnly = useMemo(() => {
    if (cart.length === 0) return false;
    return cart.every(c => {
      const item = items.find(i => i.id === c.menuItemId);
      return item ? inventoryCatIds.has(item.categoryId) : false;
    });
  }, [cart, items, inventoryCatIds]);

  const kotTrackingSteps = [
    { key: 'pending', label: 'Order Received', desc: 'Your order has been placed', icon: ShoppingCart, emoji: '📝' },
    { key: 'confirmed', label: 'Order Accepted', desc: 'Kitchen has accepted your order', icon: CheckCircle2, emoji: '✅' },
    { key: 'preparing', label: 'Being Prepared', desc: 'Our chef is preparing your food', icon: CookingPot, emoji: '👨‍🍳' },
    { key: 'ready', label: 'Ready!', desc: 'Your order is ready — collect from the counter', icon: Coffee, emoji: '🔔' },
  ];

  const directTrackingSteps = [
    { key: 'pending', label: 'Order Received', desc: 'Your order has been placed', icon: ShoppingCart, emoji: '📝' },
    { key: 'ready', label: 'Ready!', desc: 'Your order is ready — collect from the counter', icon: Coffee, emoji: '🔔' },
  ];

  const trackingSteps = isInventoryOnly ? directTrackingSteps : kotTrackingSteps;

  const resolvedStatus = useMemo(() => {
    if (orderStatus === 'cancelled') return 'cancelled';
    if (['completed', 'served'].includes(orderStatus)) return 'ready';
    if (orderStatus === 'ready' || kotStatus === 'ready' || kotStatus === 'served') return 'ready';
    if (kotStatus === 'preparing' || orderStatus === 'preparing') return 'preparing';
    if (kotStatus === 'acknowledged' || orderStatus === 'confirmed') return 'confirmed';
    return 'pending';
  }, [orderStatus, kotStatus]);

  const currentStepIndex =
    resolvedStatus === 'cancelled' ? -1 : Math.max(0, trackingSteps.findIndex(s => s.key === resolvedStatus));

  const estimatedPrepTime = useMemo(() => {
    const maxTime = cart.reduce((m, c) => {
      const item = items.find(i => i.id === c.menuItemId);
      return Math.max(m, item?.prepTimeMinutes || 15);
    }, 0);
    return maxTime;
  }, [cart, items]);

  /* ═══════════════════════════════ AMBIENT BG ═══════════════════════════════ */
  const AmbientBg = () => (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-[0.22] blur-[120px]" style={{ background: 'radial-gradient(circle, #f97316, transparent 65%)' }} />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-[0.18] blur-[120px]" style={{ background: 'radial-gradient(circle, #a855f7, transparent 65%)' }} />
      <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full opacity-[0.08] blur-[100px]" style={{ background: 'radial-gradient(circle, #3b82f6, transparent 60%)' }} />
      <div className="fixed inset-0 opacity-[0.035]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
    </div>
  );

  /* ═══════════════════════════════ VEG BADGE ═══════════════════════════════ */
  const VegBadge = ({ isVeg, size = 'sm' }: { isVeg: boolean; size?: 'sm' | 'md' }) => {
    const s = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
    const d = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
    return (
      <span className={`${s} rounded-[3px] flex items-center justify-center ${isVeg ? 'border border-green-500 bg-green-500/10' : 'border border-red-500 bg-red-500/10'}`}>
        <span className={`${d} rounded-full ${isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
      </span>
    );
  };

  /* ═══════════════════════════════ LOADING ═══════════════════════════════ */
  if (loading && step !== 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, hsl(222 47% 10%) 0%, hsl(222 47% 4%) 70%)' }}>
        {/* Floating food */}
        {['☕', '🍰', '🍕', '🥐', '🍔', '🍜'].map((e, i) => (
          <span key={i} className="absolute text-2xl opacity-0 pointer-events-none select-none"
            style={{ left: `${8 + (i % 3) * 30}%`, animation: `foodFloat ${3 + (i % 3)}s ease-in-out ${i * 0.5}s infinite` }}>
            {e}
          </span>
        ))}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} />
        <div className="relative z-10 flex flex-col items-center gap-6 px-8">
          <div className="relative">
            <div className="h-24 w-24 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-4xl" style={{ animation: 'wiggle 1.5s ease-in-out infinite' }}>☕</span>
            </div>
            <div className="absolute inset-[-4px] rounded-full animate-spin" style={{ animationDuration: '3s' }}>
              <div className="h-2.5 w-2.5 rounded-full absolute -top-0.5 left-1/2 -translate-x-1/2"
                style={{ background: accentGrad, boxShadow: '0 0 10px rgba(249,115,22,0.5)' }} />
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-0.5 bg-white/20 rounded-full"
                  style={{ height: 8 + i * 3, animation: `steamRise 1.8s ease-in-out ${i * 0.3}s infinite` }} />
              ))}
            </div>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-lg font-heading text-white">Brewing your menu…</p>
            <p className="text-sm text-zinc-500 font-quicksand">Fresh dishes loading</p>
          </div>
          <div className="w-40 h-1 rounded-full overflow-hidden bg-white/[0.06]">
            <div className="h-full rounded-full" style={{ background: accentGrad, animation: 'shimmerSlide 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ LANDING ═══════════════════════════════ */
  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-[hsl(222_47%_5%)] flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <AmbientBg />
        <div
          className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full transition-all duration-1000 ease-out"
          style={{ opacity: landingVisible ? 1 : 0, transform: landingVisible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          {/* Glass logo card */}
          <div className={`${glass} p-8 w-full flex flex-col items-center gap-6`}>
          <div className="flex items-center gap-4">
              <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-20 w-20 rounded-2xl object-contain bg-white/5 p-1.5 shadow-xl shadow-orange-500/15 ring-1 ring-white/10" />
              <span className="text-3xl text-zinc-600 font-thin select-none">×</span>
              <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-20 w-20 rounded-2xl object-contain bg-white/5 p-1.5 shadow-xl shadow-purple-500/15 ring-1 ring-white/10" />
          </div>

          <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-heading font-bold bg-gradient-to-r from-orange-200 via-amber-100 to-violet-200 bg-clip-text text-transparent leading-tight">
                Choco Loca
            </h1>
              <p className="text-zinc-500 font-quicksand text-sm tracking-[0.25em] uppercase">
                Cakes & Cafe at Cuephoria
            </p>
          </div>

            <div className="w-20 h-0.5 rounded-full bg-gradient-to-r from-orange-500 via-violet-500 to-indigo-500 opacity-60" />

            <div className="flex items-center gap-2 text-xs text-zinc-500 font-quicksand">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Open now · Self-order · Dine-in & Takeaway
            </div>
          </div>

          <button
            onClick={() => setStep('identify')}
            className="w-full py-4 rounded-2xl text-white font-quicksand font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl shadow-orange-500/25 relative overflow-hidden"
            style={{ background: accentGrad }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <UtensilsCrossed className="h-5 w-5" /> Browse Menu & Order
            </span>
          </button>

          <p className="text-[10px] text-zinc-600 font-quicksand flex items-center gap-1.5">
            <Shield className="h-3 w-3" /> Powered by Cuephoria · Secure ordering
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ IDENTIFY ═══════════════════════════════ */
  if (step === 'identify') {
    return (
      <div className="min-h-screen bg-[hsl(222_47%_5%)] flex flex-col items-center justify-center px-6 relative">
        <AmbientBg />
        <div className="relative z-10 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`${glass} p-8 space-y-6`}>
          <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-orange-500/20 relative overflow-hidden" style={{ background: accentGrad }}>
                <User className="h-8 w-8 text-white relative z-10" />
            </div>
              <h2 className="text-2xl font-heading font-bold text-white mt-4">Welcome!</h2>
              <p className="text-zinc-400 font-quicksand text-sm">Enter your phone to earn loyalty points & track orders</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                  type="tel" inputMode="numeric"
                value={customerPhone}
                onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="10-digit phone number"
                  maxLength={10} autoFocus
                  className="w-full h-14 pl-12 pr-12 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-quicksand text-lg tracking-wider placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10 transition-all backdrop-blur-sm"
                />
                {customerSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-400 animate-spin" />}
                {customerFound === true && !customerSearching && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-400" />}
            </div>

            {customerFound === true && customerName && (
                <div className={`${glassCard} border-green-500/20 p-4 text-center animate-in fade-in duration-300`}>
                <p className="text-green-400 font-quicksand font-medium">
                    Welcome back, <span className="font-bold text-green-300">{customerName}</span>! 🎉
                </p>
              </div>
            )}

            {customerFound === false && customerPhone.length === 10 && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-zinc-400 font-quicksand flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-orange-400" /> New here? Tell us your name</p>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <input
                      type="text" value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Your name"
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/[0.05] border border-white/10 text-white font-quicksand text-lg placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10 transition-all backdrop-blur-sm"
                  />
                </div>
              </div>
            )}
          </div>

            <div className="space-y-3 pt-2">
            <button
              onClick={handleIdentifySubmit}
              disabled={customerPhone.length < 10 || customerSearching || (!customerName && customerFound !== true)}
              className="w-full py-4 rounded-2xl text-white font-quicksand font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-orange-500/20"
                style={{ background: accentGrad }}
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
                  <span className="flex items-center justify-center gap-2">Continue <ArrowRight className="h-4 w-4" /></span>
                )}
            </button>
              <button onClick={handleSkipIdentify} className="w-full py-3 rounded-2xl text-zinc-500 font-quicksand text-sm hover:text-zinc-400 transition-colors">
                Skip — order as guest
            </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* Loading overlay for menu step — reuses the same fancy splash */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, hsl(222 47% 10%) 0%, hsl(222 47% 4%) 70%)' }}>
        {['🍩', '🧁', '🍳', '🥘'].map((e, i) => (
          <span key={i} className="absolute text-2xl opacity-0 pointer-events-none select-none"
            style={{ left: `${15 + (i % 2) * 35}%`, animation: `foodFloat ${3.2 + i * 0.6}s ease-in-out ${i * 0.4}s infinite` }}>
            {e}
          </span>
        ))}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-60 w-60 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="h-20 w-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(168,85,247,0.15))', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-3xl" style={{ animation: 'wiggle 1.5s ease-in-out infinite' }}>☕</span>
            </div>
            <div className="absolute inset-[-4px] rounded-full animate-spin" style={{ animationDuration: '3s' }}>
              <div className="h-2 w-2 rounded-full absolute -top-0.5 left-1/2 -translate-x-1/2"
                style={{ background: accentGrad, boxShadow: '0 0 8px rgba(249,115,22,0.5)' }} />
            </div>
          </div>
          <p className="text-lg font-heading text-white">Brewing your menu…</p>
          <div className="w-36 h-1 rounded-full overflow-hidden bg-white/[0.06]">
            <div className="h-full rounded-full" style={{ background: accentGrad, animation: 'shimmerSlide 1.4s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ APP SHELL ═══════════════════════════════ */
  return (
    <div className="min-h-screen bg-[hsl(222_47%_5%)] relative">
      {isSubmitting && <OrderPlacingSplash cartTotal={cartTotal} itemCount={cartCount} />}
      <AmbientBg />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08]" style={{ background: 'rgba(10,12,22,0.85)', backdropFilter: 'blur(20px) saturate(1.5)' }}>
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
          {step !== 'menu' && step !== 'tracking' && (
              <button onClick={() => setStep(step === 'checkout' ? 'cart' : step === 'history' ? 'menu' : 'menu')} className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-4 w-4 text-zinc-300" />
            </button>
          )}
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/15 overflow-hidden" style={{ background: accentGrad }}>
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
              <span className="text-sm font-bold bg-gradient-to-r from-orange-200 to-violet-200 bg-clip-text text-transparent font-heading leading-tight">Choco Loca</span>
              <span className="text-[10px] text-zinc-500 font-quicksand tracking-wider uppercase">at Cuephoria</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step === 'menu' && (
              <button onClick={() => setStep('history')} className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors" title="Order history">
                <History className="h-4 w-4 text-zinc-400" />
            </button>
          )}
          {step === 'menu' && cartCount > 0 && (
              <button onClick={() => setStep('cart')} className="relative p-2.5 rounded-xl hover:bg-white/10 transition-colors" style={{ background: 'rgba(249,115,22,0.12)' }}>
              <ShoppingCart className="h-5 w-5 text-orange-400" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow-lg shadow-orange-500/30" style={{ background: accentGrad }}>
                {cartCount}
              </span>
            </button>
          )}
        </div>
      </div>
      </header>

      <div className="relative z-10">
      {/* ─── MENU ─── */}
      {step === 'menu' && (
          <div className="max-w-2xl mx-auto px-4 pb-32">
          {/* Greeting */}
          {customerName && (
              <div className="flex items-center gap-2 pt-5 pb-2 animate-in fade-in duration-500">
                <span className="text-sm text-zinc-500 font-quicksand">Hey,</span>
              <span className="text-sm text-white font-quicksand font-semibold">{customerName}</span>
              <span className="text-sm">👋</span>
            </div>
          )}

            {/* Search + veg filter */}
            <div className="pt-4 pb-3 space-y-3">
          <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={menuSearch}
              onChange={e => setMenuSearch(e.target.value)}
                  placeholder="Search dishes, cuisines..."
                  className="pl-11 h-12 bg-white/[0.05] border-white/10 text-white font-quicksand rounded-2xl placeholder:text-zinc-600 focus-visible:ring-orange-500/20 backdrop-blur-sm"
            />
            {menuSearch && (
              <button onClick={() => setMenuSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-zinc-500" />
              </button>
            )}
              </div>
              {/* Veg / Non-Veg filter — Swiggy / Zomato style */}
              <div className="flex items-center gap-2">
                {(['all', 'veg', 'nonveg'] as DietFilter[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setDietFilter(f)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-quicksand font-medium border transition-all duration-200 ${
                      dietFilter === f
                        ? f === 'veg' ? 'border-green-500/50 bg-green-500/15 text-green-300' : f === 'nonveg' ? 'border-red-500/50 bg-red-500/15 text-red-300' : 'border-orange-500/40 bg-orange-500/15 text-orange-200'
                        : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07]'
                    }`}
                  >
                    {f === 'all' && <UtensilsCrossed className="h-3 w-3" />}
                    {f === 'veg' && <Leaf className="h-3 w-3" />}
                    {f === 'nonveg' && <Flame className="h-3 w-3" />}
                    {f === 'all' ? 'All' : f === 'veg' ? 'Pure Veg' : 'Non-Veg'}
                  </button>
                ))}
              </div>
          </div>

          {/* Category Tabs */}
          {!menuSearch && (
            <div ref={categoryScrollRef} className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {categories.map(cat => {
                const isActive = displayCategory === cat.id;
                const count = items.filter(i => i.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-quicksand font-medium whitespace-nowrap transition-all duration-200 shrink-0 ${
                      isActive
                        ? 'text-white shadow-md shadow-orange-500/20'
                        : 'bg-white/[0.04] text-zinc-500 hover:text-zinc-300 border border-white/[0.06]'
                    }`}
                    style={isActive ? { background: accentGrad } : undefined}
                  >
                    {cat.name} <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
              </div>
          )}

            {/* Items */}
            <div className="space-y-3 pt-1">
              {filteredItems.map((item) => {
              const inCart = cart.find(c => c.menuItemId === item.id);
              const isPopular = popularItemIds.has(item.id);
                const isBestseller = bestsellerIds.has(item.id);
              const justAdded = addedItemId === item.id;
                const isExpanded = expandedItemId === item.id;
                const catName = itemCategoryMap.get(item.categoryId);

              return (
                <div
                  key={item.id}
                    className={`${glassCard} overflow-hidden transition-all duration-300 ${justAdded ? 'ring-2 ring-orange-500/40 scale-[0.98]' : ''}`}
                  >
                    <div className="flex gap-3 p-3.5">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <VegBadge isVeg={item.isVeg} />
                          {isBestseller && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-quicksand uppercase tracking-wider" style={{ background: accentGradSoft, color: '#fb923c' }}>
                              <Star className="h-2.5 w-2.5 fill-current" /> Bestseller
                            </span>
                          )}
                          {isPopular && !isBestseller && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 text-[10px] font-bold font-quicksand uppercase tracking-wider">
                        <Sparkles className="h-2.5 w-2.5" /> Popular
                      </span>
                    )}
                        </div>
                        <p className="text-[15px] font-semibold text-white font-quicksand leading-tight">{item.name}</p>
                        <p className="text-base font-bold text-orange-300 font-quicksand"><CurrencyDisplay amount={item.price} /></p>

                        {/* Prep time + category */}
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-quicksand">
                          {item.prepTimeMinutes && item.prepTimeMinutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-zinc-600" /> {item.prepTimeMinutes} min
                    </span>
                          )}
                          {catName && <span className="text-zinc-600">{catName}</span>}
                  </div>

                    {item.description && (
                          <button type="button" onClick={() => setExpandedItemId(isExpanded ? null : item.id)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-quicksand flex items-center gap-1">
                            {isExpanded ? 'Less' : 'More info'}
                            <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                        {isExpanded && item.description && (
                          <p className="text-xs text-zinc-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200 font-quicksand">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right: image + add */}
                      <div className="flex flex-col items-center shrink-0 w-24">
                        {item.imageUrl ? (
                          <div className="relative h-20 w-full rounded-xl overflow-hidden">
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-20 w-full rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                            <Coffee className="h-7 w-7 text-zinc-700" />
                          </div>
                        )}

                      {inCart ? (
                          <div className="flex items-center gap-1 -mt-4 relative z-10">
                            <button onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center active:scale-90 shadow-md">
                              <Minus className="h-3 w-3 text-white" />
                          </button>
                            <span className="text-xs w-6 text-center text-white font-bold font-quicksand">{inCart.quantity}</span>
                            <button onClick={() => addToCart(item)} className="h-7 w-7 rounded-lg flex items-center justify-center active:scale-90 shadow-md shadow-orange-500/25" style={{ background: accentGrad }}>
                              <Plus className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                            className="px-4 py-1.5 -mt-4 relative z-10 rounded-lg text-orange-300 text-xs font-quicksand font-bold transition-all active:scale-90 border border-orange-500/30 shadow-md shadow-black/30"
                            style={{ background: 'rgba(15,15,25,0.92)', backdropFilter: 'blur(12px)' }}
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
                <div className="text-center py-20 text-zinc-500">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-quicksand text-sm">No dishes found</p>
                  <p className="font-quicksand text-xs text-zinc-600 mt-1">Try a different search or category</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── FLOATING CART BAR ─── */}
      {step === 'menu' && cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 z-30" style={{ background: 'linear-gradient(to top, hsl(222 47% 5%) 60%, transparent)' }}>
          <button
            onClick={() => setStep('cart')}
              className="w-full max-w-2xl mx-auto flex items-center justify-between p-4 rounded-2xl text-white font-quicksand font-semibold transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] shadow-2xl shadow-orange-500/25 ring-1 ring-white/10"
              style={{ background: accentGrad }}
          >
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <ShoppingCart className="h-4 w-4" />
              </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{cartCount} {cartCount === 1 ? 'item' : 'items'}</p>
                  {estimatedPrepTime > 0 && (
                    <p className="text-[10px] opacity-80 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> ~{estimatedPrepTime} min</p>
                  )}
            </div>
              </div>
              <div className="flex items-center gap-2">
            <span className="text-lg font-bold"><CurrencyDisplay amount={cartTotal} /></span>
                <ChevronRight className="h-4 w-4 opacity-70" />
              </div>
          </button>
        </div>
      )}

      {/* ─── CART ─── */}
      {step === 'cart' && (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-28">
            <h2 className="text-xl font-bold text-white font-heading flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-400" /> Your Order
              {estimatedPrepTime > 0 && (
                <span className="ml-auto text-xs text-zinc-400 font-quicksand font-normal flex items-center gap-1">
                  <Clock className="h-3 w-3" /> ~{estimatedPrepTime} min
                </span>
              )}
            </h2>
          {cart.length === 0 ? (
              <div className={`${glassCard} text-center py-16 text-zinc-500`}>
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-quicksand text-sm">Your cart is empty</p>
                <Button onClick={() => setStep('menu')} className="mt-4 bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/10 rounded-xl" variant="outline">Browse Menu</Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                  {cart.map(item => {
                    const menuItem = items.find(i => i.id === item.menuItemId);
                    return (
                      <div key={item.menuItemId} className={`${glassCard} p-4`}>
                        <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white font-quicksand flex items-center gap-2">
                              <VegBadge isVeg={item.isVeg} />
                          <span className="truncate">{item.name}</span>
                        </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 font-quicksand">
                              <CurrencyDisplay amount={item.price} /> each
                              {menuItem?.prepTimeMinutes && menuItem.prepTimeMinutes > 0 && (
                                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {menuItem.prepTimeMinutes}m</span>
                              )}
                      </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => updateQuantity(item.menuItemId, -1)} className="h-8 w-8 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors active:scale-90">
                          <Minus className="h-3.5 w-3.5 text-white" />
                        </button>
                        <span className="text-sm w-6 text-center text-white font-bold font-quicksand">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.menuItemId, 1)} className="h-8 w-8 rounded-xl flex items-center justify-center hover:opacity-90 transition-colors active:scale-90" style={{ background: accentGrad }}>
                          <Plus className="h-3.5 w-3.5 text-white" />
                        </button>
                            <button onClick={() => removeFromCart(item.menuItemId)} className="ml-1 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 className="h-3.5 w-3.5 text-red-400/70 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                        <div className="flex justify-between items-center mt-3 gap-3">
                      <Input
                        value={item.notes || ''}
                        onChange={e => setCart(prev => prev.map(c => c.menuItemId === item.menuItemId ? { ...c, notes: e.target.value } : c))}
                            placeholder="Add cooking instructions..."
                            className="h-8 text-xs bg-transparent border-0 border-b border-white/[0.06] rounded-none px-0 text-zinc-400 font-quicksand placeholder:text-zinc-700 focus-visible:ring-0 focus-visible:border-orange-500/30"
                      />
                          <span className="text-base font-bold text-orange-300 font-quicksand whitespace-nowrap"><CurrencyDisplay amount={item.total} /></span>
                    </div>
                  </div>
                    );
                  })}
              </div>

                {/* Bill summary */}
                <div className={`${glassCard} p-4 space-y-2`}>
                  <p className="text-xs text-zinc-500 font-quicksand uppercase tracking-wider font-semibold">Bill summary</p>
                  <div className="flex justify-between text-sm font-quicksand">
                    <span className="text-zinc-400">Subtotal ({cartCount} items)</span>
                    <span className="text-white"><CurrencyDisplay amount={cartTotal} /></span>
                  </div>
                  <div className="flex justify-between text-sm font-quicksand">
                    <span className="text-zinc-400">Taxes & charges</span>
                    <span className="text-green-400 text-xs">Included</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/[0.08] mt-2">
                    <span className="text-white font-heading">To pay</span>
                    <span className="text-orange-300"><CurrencyDisplay amount={cartTotal} /></span>
                  </div>
              </div>

              <div className="flex gap-3 pt-1">
                  <Button onClick={() => setStep('menu')} variant="outline" className="flex-1 h-12 border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] rounded-2xl backdrop-blur-sm">
                  <Plus className="h-4 w-4 mr-1.5" /> Add More
                </Button>
                  <button
                  onClick={() => setStep('checkout')}
                  disabled={cart.length === 0}
                    className="flex-1 h-12 text-base font-quicksand font-semibold text-white rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                    style={{ background: accentGrad }}
                >
                    Checkout <ArrowRight className="h-4 w-4" />
                  </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── CHECKOUT ─── */}
      {step === 'checkout' && (
          <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-8">
            <h2 className="text-xl font-bold text-white font-heading">Confirm & place order</h2>

            <div className={`${glassCard} p-5 space-y-4`}>
              <p className="text-xs text-zinc-500 font-quicksand uppercase tracking-wider font-semibold">Your details</p>
          <div className="space-y-3">
            <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your name *"
                    className="pl-11 h-12 bg-white/[0.04] border-white/10 text-white font-quicksand rounded-2xl placeholder:text-zinc-600 backdrop-blur-sm" />
            </div>
            <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Phone number *"
                    className="pl-11 h-12 bg-white/[0.04] border-white/10 text-white font-quicksand rounded-2xl placeholder:text-zinc-600 backdrop-blur-sm" maxLength={10} />
                </div>
              </div>
            </div>

            <div className={`${glassCard} p-5 space-y-4`}>
              <p className="text-xs text-zinc-500 font-quicksand uppercase tracking-wider font-semibold">Order type</p>
            <div className="flex gap-2">
                {[
                  { take: false, label: 'Dine In', icon: MapPin, desc: 'Eat at the cafe' },
                  { take: true, label: 'Takeaway', icon: Coffee, desc: 'Pack and go' },
                ].map(t => (
                  <button key={t.label} onClick={() => { setIsTakeaway(t.take); if (t.take) setSelectedTableId(null); }}
                    className={`flex-1 py-4 rounded-2xl text-center font-quicksand transition-all duration-300 border ${
                      isTakeaway === t.take
                        ? 'border-orange-500/40 text-orange-200 shadow-lg shadow-orange-500/10'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
                    }`}
                    style={isTakeaway === t.take ? { background: accentGradSoft } : undefined}
                  >
                    <t.icon className="h-5 w-5 mx-auto mb-1.5" />
                    <p className="text-sm font-semibold">{t.label}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{t.desc}</p>
              </button>
                ))}
            </div>

              {!isTakeaway && zones.length > 0 && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-zinc-400 font-quicksand">Select your table:</p>
                {zones.map(zone => {
                  const availableTables = tables.filter(t => t.zone === zone && !t.isOccupied);
                  if (availableTables.length === 0) return null;
                  return (
                    <div key={zone}>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2 font-quicksand font-semibold">{zone}</p>
                      <div className="flex flex-wrap gap-2">
                        {availableTables.map(table => (
                            <button key={table.id} onClick={() => setSelectedTableId(table.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-quicksand font-medium border transition-all duration-300 ${
                              selectedTableId === table.id
                                  ? 'border-orange-500/40 text-orange-200 shadow-lg shadow-orange-500/10'
                                  : 'bg-white/[0.03] border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
                            }`}
                              style={selectedTableId === table.id ? { background: accentGradSoft } : undefined}
                          >
                              {table.tableName} <span className="opacity-50">({table.capacity})</span>
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
            <div className={`${glassCard} p-4 space-y-2`}>
              <p className="text-xs text-zinc-500 font-quicksand uppercase tracking-wider font-semibold">Order summary</p>
            {cart.map(item => (
              <div key={item.menuItemId} className="flex justify-between text-sm font-quicksand">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <VegBadge isVeg={item.isVeg} />
                    {item.quantity}× {item.name}
                  </span>
                <span className="text-white font-medium"><CurrencyDisplay amount={item.total} /></span>
              </div>
            ))}
              {estimatedPrepTime > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-quicksand pt-1">
                  <Clock className="h-3 w-3" /> Estimated cooking: ~{estimatedPrepTime} min
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/[0.08] mt-2">
                <span className="text-white font-heading">To pay</span>
                <span className="text-orange-300"><CurrencyDisplay amount={cartTotal} /></span>
            </div>
          </div>

            <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting || cart.length === 0}
              className="w-full h-14 text-base font-quicksand font-semibold text-white rounded-2xl transition-all hover:scale-[1.01] active:scale-95 shadow-xl shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: accentGrad }}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>Place Order · <CurrencyDisplay amount={cartTotal} /></>
              )}
            </button>
            <p className="text-[11px] text-zinc-600 text-center font-quicksand flex items-center justify-center gap-1.5">
              <Shield className="h-3 w-3" /> Pay at counter · No online payment required
            </p>
        </div>
      )}

      {/* ─── TRACKING ─── */}
      {step === 'tracking' && (
        <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-8">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('menu')} className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors" title="Back to menu">
              <ArrowLeft className="h-4 w-4 text-zinc-400" />
            </button>
            <span className="text-xs text-zinc-500 font-quicksand">Back to menu</span>
            <div className="flex-1" />
            <button onClick={() => setStep('history')} className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors" title="Order history">
              <History className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
          {/* Hero card */}
          <div className={`${glass} p-6 text-center relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-20" style={{ background: resolvedStatus === 'ready' ? 'radial-gradient(circle at 50% 30%, #10b981 0%, transparent 70%)' : resolvedStatus === 'preparing' ? 'radial-gradient(circle at 50% 30%, #f97316 0%, transparent 70%)' : 'radial-gradient(circle at 50% 30%, #6366f1 0%, transparent 70%)' }} />
            <div className="relative z-10">
              <div className={`h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl relative overflow-hidden ${
                resolvedStatus === 'ready' ? 'shadow-green-500/30' : resolvedStatus === 'preparing' ? 'shadow-orange-500/30' : 'shadow-violet-500/30'
              }`} style={{ background: resolvedStatus === 'ready' ? 'linear-gradient(135deg, #10b981, #059669)' : resolvedStatus === 'preparing' ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {resolvedStatus === 'ready' ? <Coffee className="h-10 w-10 text-white" /> : resolvedStatus === 'preparing' ? <CookingPot className="h-10 w-10 text-white animate-pulse" /> : <CheckCircle2 className="h-10 w-10 text-white" />}
              </div>
              <h2 className="text-2xl font-bold text-white font-heading">
                {resolvedStatus === 'pending' && 'Order Received!'}
                {resolvedStatus === 'confirmed' && 'Order Accepted!'}
                {resolvedStatus === 'preparing' && 'Being Prepared...'}
                {resolvedStatus === 'ready' && '🔔 Order Ready!'}
                {resolvedStatus === 'cancelled' && 'Order Cancelled'}
              </h2>
              <p className="text-sm text-zinc-400 font-quicksand mt-1">{orderNumber}</p>
              {isInventoryOnly && resolvedStatus === 'pending' && (
                <p className="text-xs text-emerald-400/80 font-quicksand mt-2">Pre-made items — no kitchen wait!</p>
              )}
              {!isInventoryOnly && estimatedPrepTime > 0 && resolvedStatus !== 'ready' && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-quicksand font-medium" style={{ background: accentGradSoft, color: '#fbbf24' }}>
                  <Clock className="h-3 w-3" /> Estimated: ~{estimatedPrepTime} min
                </div>
              )}
            </div>
          </div>

          {/* Live progress bar */}
          {resolvedStatus !== 'cancelled' && (
            <div className={`${glassCard} p-4`}>
              <div className="flex items-center justify-between">
                {trackingSteps.map((s, i) => {
                  const isLast = i === trackingSteps.length - 1;
                  const isDone = currentStepIndex >= 0 && i < currentStepIndex;
                  const isActive = i === currentStepIndex;
                  const isFinal = isLast && isActive;
                  return (
                    <React.Fragment key={s.key}>
                      {i > 0 && <div className={`flex-1 h-1 rounded-full mx-1 transition-all duration-700 ${isDone || isFinal ? 'bg-green-500' : isActive ? 'bg-gradient-to-r from-green-500 to-orange-500' : 'bg-white/[0.06]'}`} />}
                      <div className="flex flex-col items-center">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-500 ${
                          isDone || isFinal ? 'bg-green-500/90 shadow-lg shadow-green-500/20' : isActive ? 'shadow-lg shadow-orange-500/20' : 'bg-white/[0.04] border border-white/[0.08]'
                        }`} style={isActive && !isFinal ? { background: accentGrad } : undefined}>
                          {isDone || isFinal ? <CheckCircle2 className="h-4 w-4 text-white" /> : <span className="text-sm">{s.emoji}</span>}
                        </div>
                        <span className={`text-[9px] mt-1.5 font-quicksand text-center leading-tight max-w-[56px] ${isActive ? (isFinal ? 'text-green-400 font-semibold' : 'text-orange-300 font-semibold') : isDone ? 'text-green-400' : 'text-zinc-600'}`}>{s.label}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed timeline */}
          <div className={`${glassCard} p-5 space-y-0`}>
            <p className="text-xs text-zinc-500 font-quicksand uppercase tracking-wider font-semibold mb-4">
              {isInventoryOnly ? 'Order Status' : 'Kitchen Progress'}
            </p>
            <div className="relative">
              <div className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-white/[0.06]" />
              {trackingSteps.map((s, i) => {
                const isLast = i === trackingSteps.length - 1;
                const isActive = i === currentStepIndex;
                const isCompleted = currentStepIndex >= 0 && i < currentStepIndex;
                const isFinal = isLast && isActive;
                return (
                  <div key={s.key} className={`flex items-start gap-3.5 py-2.5 relative z-10 transition-all duration-300 ${isActive || isCompleted ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                      isCompleted || isFinal ? 'bg-green-500/90 shadow-md shadow-green-500/20'
                      : isActive ? 'shadow-md shadow-orange-500/20 ring-2 ring-orange-500/30' : 'bg-white/[0.04] border border-white/[0.08]'
                    }`} style={isActive && !isFinal ? { background: accentGrad } : undefined}>
                      {isCompleted || isFinal ? <CheckCircle2 className="h-4 w-4 text-white" /> : <span className="text-base">{s.emoji}</span>}
                    </div>
                    <div className="pt-0.5 flex-1">
                      <p className={`text-sm font-quicksand font-semibold transition-colors ${isActive ? (isFinal ? 'text-green-400' : 'text-orange-300') : isCompleted ? 'text-green-400' : 'text-zinc-600'}`}>
                        {s.label}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${isActive ? 'text-zinc-400' : isCompleted ? 'text-zinc-500' : 'text-zinc-700'}`}>
                        {s.desc}
                      </p>
                    </div>
                    {isActive && !isFinal && (
                      <span className="shrink-0 mt-1 h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ready banner */}
          {resolvedStatus === 'ready' && (
            <div className={`${glassCard} border-green-500/25 p-6 text-center animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-15" style={{ background: 'radial-gradient(circle at 50% 50%, #10b981, transparent 70%)' }} />
              <div className="relative z-10">
                <div className="text-5xl mb-3">🔔</div>
                <p className="text-xl font-bold text-green-300 font-heading">Your order is ready!</p>
                <p className="text-sm text-zinc-400 font-quicksand mt-1">Please collect from the counter</p>
                <p className="text-xs text-green-400/80 font-quicksand mt-2 font-medium">{orderNumber}</p>
                <button
                  onClick={() => { setStep('menu'); setCart([]); setOrderId(null); setKotStatus(null); setOrderPayment('pending'); }}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-quicksand font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/20"
                  style={{ background: accentGrad }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Order More
                </button>
              </div>
            </div>
          )}

          {/* Payment status card */}
          {orderPayment === 'pending' ? (
            <div className={`${glassCard} border-amber-500/25 p-4 relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, #f59e0b, transparent 70%)' }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(249,115,22,0.2))', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Wallet className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-300 font-heading">Payment Pending</p>
                  <p className="text-xs text-zinc-400 font-quicksand mt-0.5">Pay at the counter · Amount: <span className="text-amber-300 font-bold"><CurrencyDisplay amount={cartTotal} /></span></p>
                </div>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              </div>
            </div>
          ) : (
            <div className={`${glassCard} border-green-500/20 p-4 relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, #10b981, transparent 70%)' }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.2))', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-green-300 font-heading">Payment Complete</p>
                  <p className="text-xs text-zinc-400 font-quicksand mt-0.5">Paid via {orderPayment === 'complimentary' ? 'Complimentary' : orderPayment.toUpperCase()}</p>
                </div>
                <span className="text-green-400 text-xs font-quicksand font-bold px-2 py-1 rounded-full bg-green-500/15 border border-green-500/20">Paid</span>
              </div>
            </div>
          )}

          {/* Cancelled */}
          {resolvedStatus === 'cancelled' && (
            <div className={`${glassCard} border-red-500/20 p-6 text-center`}>
              <div className="text-4xl mb-3">😔</div>
              <p className="text-lg font-bold text-red-300 font-heading">Order was cancelled</p>
              <p className="text-sm text-zinc-400 font-quicksand mt-1">Please contact staff for assistance</p>
              <button
                onClick={() => { setStep('menu'); setCart([]); setOrderId(null); setKotStatus(null); setOrderPayment('pending'); }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-quicksand font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: accentGrad }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try Again
              </button>
            </div>
          )}

          {/* Cart summary on tracking */}
          {cart.length > 0 && (
            <div className={`${glassCard} p-4`}>
              <p className="text-xs text-zinc-500 font-quicksand uppercase tracking-wider font-semibold mb-2">Your Items</p>
              <div className="space-y-1.5">
                {cart.map(item => (
                  <div key={item.menuItemId} className="flex justify-between text-sm font-quicksand">
                    <span className="text-zinc-400">{item.quantity}× {item.name}</span>
                    <span className="text-white"><CurrencyDisplay amount={item.total} /></span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] mt-2 pt-2 flex justify-between text-sm font-quicksand font-bold">
                <span className="text-zinc-300">Total</span>
                <span className="text-orange-400"><CurrencyDisplay amount={cartTotal} /></span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-zinc-600 text-center font-quicksand flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" /> Powered by Cuephoria
          </p>
        </div>
      )}

      {/* ─── HISTORY ─── */}
      {step === 'history' && (
        <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('menu')} className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 transition-colors" title="Back to menu">
              <ArrowLeft className="h-4 w-4 text-zinc-400" />
            </button>
            <h2 className="text-xl font-bold text-white font-heading flex items-center gap-2">
              <History className="h-5 w-5 text-orange-400" /> Order History
            </h2>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input type="tel" value={historyPhone}
                onChange={e => setHistoryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Your phone number"
                className="pl-11 h-12 bg-white/[0.05] border-white/10 text-white font-quicksand rounded-2xl placeholder:text-zinc-600 backdrop-blur-sm"
                maxLength={10} />
            </div>
            <Button onClick={handleFetchHistory} disabled={historyLoading}
              className="h-12 w-12 rounded-2xl border border-white/10 text-orange-400 hover:bg-white/[0.06]"
              style={{ background: 'rgba(249,115,22,0.1)' }}>
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {orderHistory.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-quicksand text-sm">{historyPhone ? 'No orders found' : 'Enter your phone to see past orders'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orderHistory.map(order => {
                  const isActive = !['completed', 'cancelled', 'served'].includes(order.status);
                  const isExpanded = expandedOrderId === order.id;
                  const orderItems = historyItems[order.id] || [];
                  const isPaid = order.paymentMethod !== 'pending';
                  return (
                    <div key={order.id} className={`${glassCard} transition-all ${isActive ? 'hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10' : ''}`}>
                      {/* Main row — tap to track (active) or expand (completed) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setOrderId(order.id);
                            setOrderNumber(order.orderNumber);
                            setOrderStatus(order.status);
                            setOrderPayment(order.paymentMethod);
                            setKotStatus(null);
                            setStep('tracking');
                          } else {
                            setExpandedOrderId(isExpanded ? null : order.id);
                          }
                        }}
                        className="w-full text-left p-4"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-heading">{order.orderNumber}</span>
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isPaid ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-quicksand font-bold bg-green-500/15 text-green-400 border border-green-500/20">Paid</span>
                            ) : !['cancelled'].includes(order.status) ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-quicksand font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse">Unpaid</span>
                            ) : null}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-quicksand font-medium border ${
                              order.status === 'completed' || order.status === 'served' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : order.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : order.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            }`}>{order.status === 'served' ? 'done' : order.status}</span>
                            {!isActive && (
                              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-zinc-500 font-quicksand">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}
                            {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-orange-300 font-bold text-sm font-quicksand"><CurrencyDisplay amount={order.total} /></span>
                        </div>
                        {isActive && (
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-orange-400 font-quicksand font-medium">
                            <ArrowRight className="h-3 w-3" /> Tap to track this order
                          </div>
                        )}
                      </button>

                      {/* Expanded item details */}
                      {isExpanded && orderItems.length > 0 && (
                        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="text-[10px] text-zinc-500 font-quicksand uppercase tracking-wider font-semibold mb-2">Items</p>
                          <div className="space-y-1.5">
                            {orderItems.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm font-quicksand">
                                <span className="text-zinc-400">{item.qty}× {item.name}</span>
                                <span className="text-zinc-300 tabular-nums"><CurrencyDisplay amount={item.qty * item.price} /></span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-white/[0.06] mt-2 pt-2 flex justify-between text-sm font-quicksand font-bold">
                            <span className="text-zinc-300">Total</span>
                            <span className="text-orange-400"><CurrencyDisplay amount={order.total} /></span>
                          </div>
                        </div>
                      )}
                      {isExpanded && orderItems.length === 0 && (
                        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                          <p className="text-xs text-zinc-500 font-quicksand">No item details available</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
      </div>
    </div>
  );
};

export default CafeCustomerOrder;
