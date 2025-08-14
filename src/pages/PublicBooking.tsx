// app/public/booking/PublicBooking.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StationSelector } from '@/components/booking/StationSelector';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker'; // your (multi) picker
import CouponPromotionalPopup from '@/components/CouponPromotionalPopup';
import BookingConfirmationDialog from '@/components/BookingConfirmationDialog';
import LegalDialog from '@/components/dialog/LegalDialog';
import {
  CalendarIcon, Clock, MapPin, Phone, Mail, User, Gamepad2, Timer, Sparkles, Star, Zap,
  Percent, CheckCircle, AlertTriangle, Lock, Info, ChevronDown, Dot
} from 'lucide-react';
import { format, compareAsc } from 'date-fns';
import { cn } from '@/lib/utils';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball';
  hourly_rate: number;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  email: string;
}

interface BookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  station_name: string;
  customer_name: string;
  customer_phone: string;
}

export default function PublicBooking() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Multi-slot support: store an array of selected slots (unique by start/end)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', phone: '', email: '' });
  const [customerNumber, setCustomerNumber] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);

  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<'terms' | 'privacy' | 'contact'>('terms');

  // “Today’s bookings” data
  const [todayBookings, setTodayBookings] = useState<BookingRow[]>([]);
  const [openTimeGroups, setOpenTimeGroups] = useState<Record<string, boolean>>({});

  useEffect(() => { fetchStations(); }, []);

  // live updates
  useEffect(() => {
    const channel = supabase
      .channel('booking-changes-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
        fetchTodayBookings(); // keep “LIVE”
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    if (selectedStations.length > 0 && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlots([]);
    }
  }, [selectedStations, selectedDate]);

  useEffect(() => { fetchTodayBookings(); }, []);

  const fetchStations = async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('id, name, type, hourly_rate')
        .order('name');
      if (error) throw error;
      setStations((data || []) as Station[]);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load stations');
    }
  };

  const fetchAvailableSlots = async () => {
    if (selectedStations.length === 0) return;
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // union availability across selected stations (so customers can book any slot that is free in at least one station)
      const results = await Promise.all(
        selectedStations.map((stationId) =>
          supabase.rpc('get_available_slots', {
            p_date: dateStr,
            p_station_id: stationId,
            p_slot_duration: 60
          })
        )
      );

      const base = results.find(r => !r.error && Array.isArray(r.data))?.data as TimeSlot[] | undefined;
      if (!base) {
        const firstErr = results.find(r => r.error)?.error;
        if (firstErr) throw firstErr;
        setAvailableSlots([]);
        return;
      }
      const key = (s: TimeSlot) => `${s.start_time}-${s.end_time}`;
      const union = new Map<string, boolean>();
      base.forEach(s => union.set(key(s), !!s.is_available));
      results.forEach(r => {
        const arr = (r.data || []) as TimeSlot[];
        arr.forEach(s => union.set(key(s), Boolean(union.get(key(s))) || Boolean(s.is_available)));
      });
      const merged = base.map(s => ({ ...s, is_available: Boolean(union.get(key(s))) }));
      setAvailableSlots(merged);

      // prune any selectedSlots that are no longer available
      setSelectedSlots(prev =>
        prev.filter(sel => merged.find(m => m.start_time === sel.start_time && m.end_time === sel.end_time && m.is_available))
      );
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const searchCustomer = async () => {
    if (!customerNumber.trim()) {
      toast.error('Please enter a customer number');
      return;
    }
    setSearchingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('phone', customerNumber)
        .single();

      if (error && (error as any).code !== 'PGRST116') throw error;

      if (data) {
        setIsReturningCustomer(true);
        setCustomerInfo({
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email || ''
        });
        toast.success(`Welcome back, ${data.name}! 🎮`);
      } else {
        setIsReturningCustomer(false);
        setCustomerInfo({
          name: '',
          phone: customerNumber,
          email: ''
        });
        toast.info('New customer! Please fill in your details below.');
      }
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Failed to search customer');
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleStationToggle = (stationId: string) => {
    setSelectedStations(prev =>
      prev.includes(stationId) ? prev.filter(id => id !== stationId) : [...prev, stationId]
    );
    setSelectedSlots([]);
  };

  // Multi-select in TimeSlotPicker
  const handleSlotToggle = async (slot: TimeSlot) => {
    // Filter stations: keep only stations actually free for this slot
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const checks = await Promise.all(selectedStations.map(async (stationId) => {
      const { data } = await supabase.rpc('get_available_slots', {
        p_date: dateStr, p_station_id: stationId, p_slot_duration: 60
      });
      const match = (data || []).find((s: any) =>
        s.start_time === slot.start_time &&
        s.end_time === slot.end_time &&
        s.is_available
      );
      return { stationId, ok: !!match };
    }));
    const okIds = checks.filter(c => c.ok).map(c => c.stationId);
    const removed = checks.filter(c => !c.ok).map(c => c.stationId);
    if (removed.length) {
      const names = stations.filter(s => removed.includes(s.id)).map(s => s.name).join(', ');
      toast.message('Some stations aren’t free at this time', { description: `Removed: ${names}` });
    }
    setSelectedStations(okIds);

    setSelectedSlots(prev => {
      const exists = prev.find(s => s.start_time === slot.start_time && s.end_time === slot.end_time);
      if (exists) return prev.filter(s => !(s.start_time === slot.start_time && s.end_time === slot.end_time));
      return [...prev, slot];
    });
  };

  const handleCouponApply = () => {
    const upper = couponCode.toUpperCase();
    if (upper === 'CUEPHORIA25' || upper === 'NIT50') {
      setAppliedCoupon(upper);
      toast.success(`Coupon ${upper} applied successfully! 🎉`);
    } else {
      toast.error('Invalid coupon code');
    }
  };

  const handleCouponSelect = (coupon: string) => {
    setCouponCode(coupon);
    setAppliedCoupon(coupon);
    toast.success(`Coupon ${coupon} applied successfully! 🎉`);
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0 || selectedSlots.length === 0) return 0;
    const selectedObjs = stations.filter(s => selectedStations.includes(s.id));
    const perHour = selectedObjs.reduce((sum, s) => sum + s.hourly_rate, 0);
    return perHour * selectedSlots.length;
  };
  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    if (!appliedCoupon || original === 0) return 0;
    if (appliedCoupon === 'CUEPHORIA25') return Math.round(original * 0.25);
    if (appliedCoupon === 'NIT50') return Math.round(original * 0.5);
    return 0;
  };
  const calculateFinalPrice = () => calculateOriginalPrice() - calculateDiscount();

  const handleLegalClick = (type: 'terms' | 'privacy' | 'contact') => {
    setLegalDialogType(type);
    setShowLegalDialog(true);
  };

  const isCustomerInfoComplete = () => hasSearched && customerNumber.trim() && customerInfo.name.trim();
  const isStationSelectionAvailable = () => isCustomerInfoComplete();
  const isTimeSelectionAvailable = () => isStationSelectionAvailable() && selectedStations.length > 0;

  const handleBookingSubmit = async () => {
    if (!customerNumber.trim()) { toast.error('Please complete customer information first'); return; }
    if (selectedStations.length === 0) { toast.error('Please select at least one station'); return; }
    if (selectedSlots.length === 0) { toast.error('Please select at least one time slot'); return; }
    if (!customerInfo.name.trim()) { toast.error('Please enter your name'); return; }

    setLoading(true);
    try {
      // ensure customer
      let customerId = customerInfo.id;
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customerInfo.name,
            phone: customerInfo.phone,
            email: customerInfo.email || null,
            is_member: false,
            loyalty_points: 0,
            total_spent: 0,
            total_play_time: 0
          })
          .select('id')
          .single();
        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      const originalPrice = calculateOriginalPrice();
      const discount = calculateDiscount();
      const finalPrice = calculateFinalPrice();

      // create a booking row per (station x slot)
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const rows = selectedStations.flatMap(stationId =>
        selectedSlots.map(slot => ({
          station_id: stationId,
          customer_id: customerId!,
          booking_date: dateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration: 60,
          status: 'confirmed' as const,
          original_price: stations.find(s => s.id === stationId)?.hourly_rate ?? 0,
          discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
          final_price: (stations.find(s => s.id === stationId)?.hourly_rate ?? 0) * (1 - (discount > 0 ? discount / originalPrice : 0)),
          coupon_code: appliedCoupon || null
        }))
      );

      const { data: inserted, error: bookingError } = await supabase
        .from('bookings')
        .insert(rows)
        .select('id');
      if (bookingError) throw bookingError;

      // Confirmation dialog data
      const selStations = stations.filter(s => selectedStations.includes(s.id)).map(s => s.name);
      const slotStr = selectedSlots
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map(s =>
          `${new Date(`2000-01-01T${s.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${new Date(`2000-01-01T${s.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        )
        .join(', ');

      setBookingConfirmationData({
        bookingId: inserted[0].id.slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: selStations,
        date: dateStr,
        // show the list of slots (instead of a single dash)
        startTime: slotStr,
        endTime: '',
        totalAmount: finalPrice,
        couponCode: appliedCoupon || undefined,
        discountAmount: discount > 0 ? discount : undefined
      });
      setShowConfirmationDialog(true);

      // reset
      setSelectedStations([]);
      setSelectedSlots([]);
      setCustomerNumber('');
      setCustomerInfo({ name: '', phone: '', email: '' });
      setIsReturningCustomer(false);
      setHasSearched(false);
      setCouponCode('');
      setAppliedCoupon('');
      setAvailableSlots([]);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Today’s bookings (group by time then customer) ----------
  const fetchTodayBookings = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, end_time, status,
          stations:station_id ( name ),
          customers:customer_id ( name, phone )
        `)
        .eq('booking_date', todayStr)
        .in('status', ['confirmed','in-progress']); // active ones
      if (error) throw error;

      const rows: BookingRow[] = (data || []).map((r: any) => ({
        id: r.id,
        booking_date: r.booking_date,
        start_time: r.start_time,
        end_time: r.end_time,
        status: r.status,
        station_name: r.stations?.name || 'Unknown',
        customer_name: r.customers?.name || 'Unknown',
        customer_phone: r.customers?.phone || ''
      }));
      setTodayBookings(rows);
    } catch (e) {
      console.error(e);
    }
  };

  const timeKey = (start: string, end: string) => `${start}-${end}`;
  const groupByTimeThenCustomer = useMemo(() => {
    const byTime: Record<string, BookingRow[]> = {};
    [...todayBookings].sort((a, b) => a.start_time.localeCompare(b.start_time)).forEach(b => {
      const key = timeKey(b.start_time, b.end_time);
      (byTime[key] ||= []).push(b);
    });
    const final = Object.entries(byTime).map(([tkey, list]) => {
      const [s, e] = tkey.split('-');
      // group by customer inside this time
      const byCust: Record<string, BookingRow[]> = {};
      list.forEach(b => (byCust[b.customer_name] ||= []).push(b));
      // sort customers alphabetically
      const buckets = Object.entries(byCust)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cust, rows]) => ({
          customer: cust,
          rows: rows.sort((a, b) => a.station_name.localeCompare(b.station_name))
        }));
      return { start: s, end: e, total: list.length, buckets };
    });
    return final;
  }, [todayBookings]);

  const toggleGroup = (key: string) =>
    setOpenTimeGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const maskedPhone = (p: string) =>
    p && p.length >= 7 ? `${p.slice(0, 2)}XXX${p.slice(-2)}` : p || '-';

  // -------------------------------------------------------------------

  const today = new Date();
  const originalPrice = calculateOriginalPrice();
  const discount = calculateDiscount();
  const finalPrice = calculateFinalPrice();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]">
      {/* subtle glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cuephoria-purple/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-cuephoria-blue/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cuephoria-lightpurple/20 blur-3xl" />
      </div>

      <CouponPromotionalPopup onCouponSelect={handleCouponSelect} />

      {/* Header */}
      <header className="py-10 px-4 sm:px-6 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 animate-float">
              <img
                src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                alt="Cuephoria Logo"
                className="h-24 drop-shadow-[0_0_25px_rgba(168,85,247,0.15)]"
              />
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-widest uppercase text-gray-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-cuephoria-lightpurple" />
              Premium Gaming Lounge
            </span>

            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-white font-heading bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple via-cuephoria-lightpurple to-cuephoria-blue animate-text-gradient">
              Book Your Gaming Session
            </h1>
            <p className="mt-2 text-lg text-gray-300/90 max-w-2xl text-center">
              Reserve PlayStation 5 or Pool Table sessions at Cuephoria
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-14 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-2xl shadow-cuephoria-purple/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-purple/20 ring-1 ring-white/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-cuephoria-purple" />
                  </div>
                  Step 1: Customer Information
                  {isCustomerInfoComplete() && <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-cuephoria-purple/10 border border-cuephoria-purple/20 rounded-xl p-3">
                  <p className="text-sm text-cuephoria-purple/90 font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Please complete customer information to proceed with booking
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={customerNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerNumber(val);
                      setHasSearched(false);
                      setIsReturningCustomer(false);
                      setCustomerInfo(prev => ({ ...prev, name: '', email: '', phone: val }));
                    }}
                    placeholder="Enter phone number"
                    className="bg-black/30 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-cuephoria-purple/40 flex-1"
                  />
                  <Button
                    onClick={searchCustomer}
                    disabled={searchingCustomer}
                    className="rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90"
                  >
                    {searchingCustomer ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Name/Email appear ONLY after Search */}
                {hasSearched && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Full Name {isReturningCustomer && <CheckCircle className="inline h-4 w-4 text-green-400 ml-1" />}
                      </Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-cuephoria-purple/40"
                        disabled={isReturningCustomer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email address"
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-cuephoria-purple/40"
                        disabled={isReturningCustomer}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card
              className={cn(
                "bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-xl shadow-cuephoria-blue/10 transition",
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-white tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-blue/20 ring-1 ring-white/10 flex items-center justify-center">
                    {isStationSelectionAvailable() ? <MapPin className="h-4 w-4 text-cuephoria-blue" /> : <Lock className="h-4 w-4 text-gray-500" />}
                  </div>
                  Step 2: Select Gaming Stations
                </CardTitle>

                {/* Tip is ALWAYS visible (even when locked) */}
                <div className="mt-2 flex items-start gap-2 text-xs text-gray-300/90 bg-white/5 border border-white/10 rounded-lg p-2">
                  <Info className="h-4 w-4 text-cuephoria-lightpurple mt-0.5" />
                  <span>You can select <strong>multiple stations</strong>. In next step, you can also choose <strong>multiple time slots</strong>.</span>
                </div>
              </CardHeader>

              <CardContent>
                {!isStationSelectionAvailable() ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Complete customer information to unlock station selection</p>
                  </div>
                ) : (
                  <StationSelector
                    stations={stations}
                    selectedStations={selectedStations}
                    onStationToggle={handleStationToggle}
                  />
                )}
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card
              className={cn(
                "bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-xl shadow-cuephoria-lightpurple/10 transition",
                !isTimeSelectionAvailable() && "opacity-100" // keep tip visible even if locked
              )}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-white tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-lightpurple/20 ring-1 ring-white/10 flex items-center justify-center">
                    {!isTimeSelectionAvailable() ? <Lock className="h-4 w-4 text-gray-500" /> : <CalendarIcon className="h-4 w-4 text-cuephoria-lightpurple" />}
                  </div>
                  Step 3: Choose Date & Time
                </CardTitle>
                <div className="mt-2 flex items-start gap-2 text-xs text-gray-300/90 bg-white/5 border border-white/10 rounded-lg p-2">
                  <Info className="h-4 w-4 text-cuephoria-lightpurple mt-0.5" />
                  <span>You can choose <strong>multiple time slots</strong> (one per hour) after selecting stations. The price updates automatically.</span>
                </div>
              </CardHeader>

              <CardContent className={cn(!isTimeSelectionAvailable() && "pointer-events-none opacity-60")}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium text-gray-200">Choose Date</Label>
                    <div className="mt-2 flex justify-center md:justify-start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        disabled={(date) => date < today}
                        className="rounded-xl border bg-black/30 border-white/10"
                      />
                    </div>
                  </div>

                  {isTimeSelectionAvailable() && (
                    <div>
                      <Label className="text-base font-medium text-gray-200">Available Time Slots</Label>
                      <div className="mt-2">
                        <TimeSlotPicker
                          slots={availableSlots}
                          selectedSlots={selectedSlots}
                          onSlotToggle={handleSlotToggle}
                          loading={slotsLoading}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-white/10 backdrop-blur-xl border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,.25)]">
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStations.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Selected Stations</Label>
                    <div className="mt-2 space-y-1">
                      {selectedStations.map(stationId => {
                        const station = stations.find(s => s.id === stationId);
                        return station ? (
                          <div key={stationId} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-cuephoria-purple/20 border border-white/10 flex items-center justify-center">
                              {station.type === 'ps5' ? <Gamepad2 className="h-3.5 w-3.5 text-cuephoria-purple" /> : <Timer className="h-3.5 w-3.5 text-green-400" />}
                            </div>
                            <Badge variant="secondary" className="bg-white/5 text-gray-200 border-white/10 rounded-full px-2.5 py-1">
                              {station.name}
                            </Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {selectedSlots.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time Slots</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedSlots
                        .slice()
                        .sort((a,b)=>a.start_time.localeCompare(b.start_time))
                        .map((s, i) => (
                          <Badge key={i} variant="outline" className="border-white/10 text-gray-200 bg-white/5">
                            {new Date(`2000-01-01T${s.start_time}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
                            {' – '}
                            {new Date(`2000-01-01T${s.end_time}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Coupon */}
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Coupon Code</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-cuephoria-purple/40 flex-1"
                    />
                    <Button
                      onClick={handleCouponApply}
                      size="sm"
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                    >
                      Apply
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <div className="mt-2 space-y-2">
                      <div className="p-2 bg-green-900/30 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-green-400 flex items-center gap-2">
                          <Percent className="h-4 w-4" /> Coupon {appliedCoupon} applied!
                        </p>
                      </div>
                      {appliedCoupon === 'NIT50' && (
                        <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded-lg">
                          <p className="text-sm text-amber-400">
                            <strong>Note:</strong> Show valid NIT Trichy ID at reception to use this offer.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {originalPrice > 0 && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-300">Subtotal</Label>
                        <span className="text-sm text-gray-200">₹{originalPrice}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between items-center">
                          <Label className="text-sm text-green-400">Discount ({appliedCoupon})</Label>
                          <span className="text-sm text-green-400">-₹{discount}</span>
                        </div>
                      )}
                      <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold text-gray-100">Total Amount</Label>
                        <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">₹{finalPrice}</span>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={handleBookingSubmit}
                  disabled={selectedStations.length === 0 || selectedSlots.length === 0 || !customerNumber || loading}
                  className="w-full rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90"
                  size="lg"
                >
                  {loading ? 'Creating Booking...' : 'Confirm Booking'}
                </Button>

                <p className="text-xs text-gray-400 text-center">Payment will be collected at the venue</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ---------- TODAY’S BOOKINGS (aligned like steps) ---------- */}
        <Card className="mt-8 bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-3">
                Today’s Bookings
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 text-[11px]">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                  LIVE
                </span>
              </CardTitle>
              <Badge variant="outline" className="border-white/10 text-gray-300 bg-white/5">
                {todayBookings.length} total
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {groupByTimeThenCustomer.length === 0 ? (
              <div className="py-10 text-center text-gray-400">No bookings yet today.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {groupByTimeThenCustomer.map((grp, idx) => {
                  const k = timeKey(grp.start, grp.end);
                  const isOpen = !!openTimeGroups[k];
                  const label = `${new Date(`2000-01-01T${grp.start}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} — ${new Date(`2000-01-01T${grp.end}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`;

                  return (
                    <div key={k} className="py-1">
                      {/* Collapsed Row (no headers) */}
                      <button
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition text-left"
                        onClick={() => toggleGroup(k)}
                        title="Tap to expand"
                      >
                        <ChevronDown className={cn("h-5 w-5 text-gray-300 transition", isOpen ? "rotate-180" : "")} />
                        <div className="font-medium text-gray-100">{label}</div>
                        <Badge className="ml-auto bg-white/5 border-white/10 text-gray-300">
                          {grp.total} booking{grp.total !== 1 ? 's' : ''}
                        </Badge>
                      </button>

                      {/* Expanded table */}
                      {isOpen && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-[720px] w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-400">
                                <th className="px-3 py-2 font-medium">Customer</th>
                                <th className="px-3 py-2 font-medium">Phone</th>
                                <th className="px-3 py-2 font-medium">Station(s)</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {grp.buckets.map((bucket, i) => (
                                <tr key={i} className="border-t border-white/10">
                                  <td className="px-3 py-3 text-gray-100 align-top">{bucket.customer}</td>
                                  <td className="px-3 py-3 text-gray-300 align-top">{maskedPhone(bucket.rows[0]?.customer_phone)}</td>
                                  <td className="px-3 py-3 text-gray-300">
                                    <div className="flex flex-wrap gap-2">
                                      {bucket.rows.map(r => (
                                        <Badge key={r.id} variant="outline" className="border-white/10 bg-white/5 text-gray-200">
                                          {r.station_name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 align-top">
                                    <Badge
                                      className={cn(
                                        "border-white/10 bg-white/5",
                                        bucket.rows[0].status === 'confirmed' && "text-blue-300",
                                        bucket.rows[0].status === 'in-progress' && "text-amber-300"
                                      )}
                                      variant="outline"
                                    >
                                      {bucket.rows[0].status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 md:px-8 border-t border-white/10 backdrop-blur-md bg-black/30 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria Logo" className="h-8 mr-3" />
              <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Cuephoria. All rights reserved.</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-400 text-sm">
                <Clock className="h-4 w-4 text-gray-400 mr-1.5" /><span>Book anytime, anywhere</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <button onClick={() => handleLegalClick('terms')} className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1 transition">
                Terms & Conditions
              </button>
              <button onClick={() => handleLegalClick('privacy')} className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1 transition">
                Privacy Policy
              </button>
              <button onClick={() => handleLegalClick('contact')} className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1 transition">
                Contact Us
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <a href="tel:+918637625155" className="hover:text-white transition-colors">+91 86376 25155</a>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <a href="mailto:contact@cuephoria.in" className="hover:text-white transition-colors">contact@cuephoria.in</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Confirmation Dialog */}
      {bookingConfirmationData && (
        <BookingConfirmationDialog
          isOpen={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          bookingData={bookingConfirmationData}
        />
      )}

      {/* Legal Dialog */}
      <LegalDialog
        isOpen={showLegalDialog}
        onClose={() => setShowLegalDialog(false)}
        type={legalDialogType}
      />
    </div>
  );
}
