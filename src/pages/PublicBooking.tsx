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
import { TimeSlotPicker, TimeSlot } from '@/components/booking/TimeSlotPicker';
import CouponPromotionalPopup from '@/components/CouponPromotionalPopup';
import BookingConfirmationDialog from '@/components/BookingConfirmationDialog';
import LegalDialog from '@/components/dialog/LegalDialog';
import {
  CalendarIcon, Clock, MapPin, Phone, Mail, User, Gamepad2, Timer, Sparkles, Star, Zap,
  Percent, CheckCircle, AlertTriangle, Lock, Info, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball';
  hourly_rate: number;
}

interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  email: string;
}

type FilterType = 'all' | 'ps5' | '8ball';

export default function PublicBooking() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', phone: '', email: '' });
  const [customerNumber, setCustomerNumber] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);

  // Only show name/email after Search is pressed
  const [hasSearched, setHasSearched] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<'terms' | 'privacy' | 'contact'>('terms');

  // Step 2 filters
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  // Today’s bookings block
  const [todayRows, setTodayRows] = useState<any[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);

  // Fetch stations on component mount
  useEffect(() => { fetchStations(); }, []);

  // Real-time updates for bookings
  useEffect(() => {
    const channel = supabase
      .channel('booking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
        fetchTodayBookings(); // keep the Today’s block fresh
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedStations, selectedDate]);

  // Fetch available slots when date or stations change
  useEffect(() => {
    if (selectedStations.length > 0 && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlots([]);
    }
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    fetchTodayBookings();
  }, []);

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

  // When multiple stations are selected, show a slot as AVAILABLE if ANY selected station has it free (union view).
  const fetchAvailableSlots = async () => {
    if (selectedStations.length === 0) return;
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const results = await Promise.all(
        selectedStations.map(stationId =>
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

      const unionMap = new Map<string, boolean>();
      const keyOf = (s: TimeSlot) => `${s.start_time}-${s.end_time}`;

      base.forEach(s => unionMap.set(keyOf(s), Boolean(s.is_available)));
      results.forEach(r => {
        const arr = (r.data || []) as TimeSlot[];
        arr.forEach(s => {
          const k = keyOf(s);
          unionMap.set(k, Boolean(unionMap.get(k)) || Boolean(s.is_available));
        });
      });

      const merged: TimeSlot[] = base.map(s => ({
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: Boolean(unionMap.get(`${s.start_time}-${s.end_time}`))
      }));

      setAvailableSlots(merged);

      // Drop any previously selected slots that are no longer available
      setSelectedSlots(prev =>
        prev.filter(ps => merged.some(m => m.start_time === ps.start_time && m.end_time === ps.end_time && m.is_available))
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
      setHasSearched(true); // show the fields now
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
    // keep selected time slots (we’ll re-validate in fetchAvailableSlots)
  };

  // Filtered station list for Step 2
  const filteredStations = useMemo(() => {
    if (typeFilter === 'all') return stations;
    return stations.filter(s => s.type === (typeFilter as any));
  }, [stations, typeFilter]);

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

  // ----- PRICING -----
  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0 || selectedSlots.length === 0) return 0;
    const selectedObjs = stations.filter(s => selectedStations.includes(s.id));
    const perHourSum = selectedObjs.reduce((sum, s) => sum + s.hourly_rate, 0);
    return perHourSum * selectedSlots.length;
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

  const isCustomerInfoComplete = () => {
    return hasSearched && customerNumber.trim() && customerInfo.name.trim();
  };
  const isStationSelectionAvailable = () => isCustomerInfoComplete();
  const isTimeSelectionAvailable = () => isStationSelectionAvailable() && selectedStations.length > 0;

  const handleBookingSubmit = async () => {
    if (!customerNumber.trim()) { toast.error('Please complete customer information first'); return; }
    if (selectedStations.length === 0) { toast.error('Please select at least one station'); return; }
    if (selectedSlots.length === 0) { toast.error('Please select at least one time slot'); return; }
    if (!customerInfo.name.trim()) { toast.error('Please enter your name'); return; }

    setLoading(true);
    try {
      // Create or update customer
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

      // Create bookings: one row per (station × slot)
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const bookings: any[] = [];
      for (const stationId of selectedStations) {
        for (const slot of selectedSlots) {
          bookings.push({
            station_id: stationId,
            customer_id: customerId!,
            booking_date: dateStr,
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration: 60,
            status: 'confirmed',
            original_price: stations.find(s => s.id === stationId)?.hourly_rate || 0,
            discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
            final_price: Math.round((stations.find(s => s.id === stationId)?.hourly_rate || 0) * (finalPrice / originalPrice)),
            coupon_code: appliedCoupon || null
          });
        }
      }

      const { data: insertedBookings, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookings)
        .select('id');

      if (bookingError) throw bookingError;

      // Confirmation payload: show first-start → last-end
      const sorted = [...selectedSlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const selectedStationObjects = stations.filter(s => selectedStations.includes(s.id));
      const confirmationData = {
        bookingId: insertedBookings[0].id.slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: selectedStationObjects.map(s => s.name),
        date: dateStr,
        startTime: new Date(`2000-01-01T${first.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        endTime: new Date(`2000-01-01T${last.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        totalAmount: finalPrice,
        couponCode: appliedCoupon || undefined,
        discountAmount: discount > 0 ? discount : undefined
      };

      setBookingConfirmationData(confirmationData);
      setShowConfirmationDialog(true);

      // Reset form
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

  // Today’s bookings (group by time then by customer)
  const fetchTodayBookings = async () => {
    setTodayLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const { data: rows, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, end_time, status, final_price,
          customer:customers ( name, phone ),
          station:stations ( name )
        `)
        .eq('booking_date', todayStr)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setTodayRows(rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTodayLoading(false);
    }
  };

  // Group by time then by customer
  const todayGrouped = useMemo(() => {
    const byTime: Record<string, any[]> = {};
    const f = (t: string) =>
      new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    for (const r of todayRows) {
      const key = `${f(r.start_time)} — ${f(r.end_time)}`;
      if (!byTime[key]) byTime[key] = [];
      byTime[key].push(r);
    }

    // inside each time, group by customer
    const out = Object.entries(byTime).map(([time, arr]) => {
      const byCust: Record<string, any[]> = {};
      arr.forEach(row => {
        const name = row.customer?.name || 'Unknown';
        if (!byCust[name]) byCust[name] = [];
        byCust[name].push(row);
      });
      return { time, groups: Object.entries(byCust).map(([name, items]) => ({ name, items })) };
    });

    // sort by time (first slot start)
    const parseStart = (time: string) => {
      const [st] = time.split(' — ');
      return new Date(`2000-01-01 ${st}`).getTime();
    };
    return out.sort((a, b) => parseStart(a.time) - parseStart(b.time));
  }, [todayRows]);

  const todayTotal = todayRows.length;

  const today = new Date();
  const originalPrice = calculateOriginalPrice();
  const discount = calculateDiscount();
  const finalPrice = calculateFinalPrice();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]">
      {/* Decorative glows */}
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
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-2xl shadow-cuephoria-purple/10 animate-scale-in">
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

                {/* Phone + Search */}
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
                    className="bg-black/30 border-white/10 text-white placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-cuephoria-purple/40 focus:border-cuephoria-purple/40 transition flex-1"
                  />
                  <Button
                    onClick={searchCustomer}
                    disabled={searchingCustomer}
                    className="rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90 transition-all duration-150 active:scale-[.98] shadow-lg shadow-cuephoria-lightpurple/20"
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
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-cuephoria-purple/40 focus:border-cuephoria-purple/40 transition"
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
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-cuephoria-purple/40 focus:border-cuephoria-purple/40 transition"
                        disabled={isReturningCustomer}
                      />
                    </div>
                  </div>
                )}

                {isCustomerInfoComplete() && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" /> Customer information complete! You can now proceed to station selection.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card
              className={cn(
                "bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-xl shadow-cuephoria-blue/10 animate-scale-in transition-all duration-300",
                !isStationSelectionAvailable() && "opacity-50 pointer-events-none"
              )}
              style={{ animationDelay: '100ms' }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-blue/20 ring-1 ring-white/10 flex items-center justify-center">
                    {!isStationSelectionAvailable() ? <Lock className="h-4 w-4 text-gray-500" /> : <MapPin className="h-4 w-4 text-cuephoria-blue" />}
                  </div>
                  Step 2: Select Gaming Stations
                  {isStationSelectionAvailable() && selectedStations.length > 0 && <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Small tip */}
                <div className="flex items-start gap-2 text-xs text-gray-300 bg-white/5 border border-white/10 rounded-lg p-2">
                  <Info className="h-4 w-4 mt-0.5 text-cuephoria-lightpurple" />
                  <p>You can select <strong>multiple stations</strong>. In the next step, you can also choose <strong>multiple time slots</strong>.</p>
                </div>

                {/* Filter chips */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-300">
                    <Filter className="h-3.5 w-3.5" /> Filter:
                  </span>
                  {(['all','ps5','8ball'] as FilterType[]).map(ft => (
                    <button
                      key={ft}
                      onClick={() => setTypeFilter(ft)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm border backdrop-blur-md",
                        ft === typeFilter
                          ? "border-cuephoria-lightpurple/40 bg-cuephoria-lightpurple/10 text-white"
                          : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                      )}
                    >
                      {ft === 'all' ? 'All' : ft === 'ps5' ? 'PS5' : '8-Ball'}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-gray-400">{selectedStations.length} selected</span>
                </div>

                <StationSelector
                  stations={filteredStations}
                  selectedStations={selectedStations}
                  onStationToggle={handleStationToggle}
                />
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card
              className={cn(
                "bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl shadow-xl shadow-cuephoria-lightpurple/10 animate-scale-in transition-all duration-300",
                !isTimeSelectionAvailable() && "opacity-50 pointer-events-none"
              )}
              style={{ animationDelay: '200ms' }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white tracking-wide">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-lightpurple/20 ring-1 ring-white/10 flex items-center justify-center">
                    {!isTimeSelectionAvailable() ? <Lock className="h-4 w-4 text-gray-500" /> : <CalendarIcon className="h-4 w-4 text-cuephoria-lightpurple" />}
                  </div>
                  Step 3: Choose Date & Time
                  {isTimeSelectionAvailable() && selectedSlots.length > 0 && <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tiny tip */}
                <div className="flex items-start gap-2 text-xs text-gray-300 bg-white/5 border border-white/10 rounded-lg p-2">
                  <Info className="h-4 w-4 mt-0.5 text-cuephoria-lightpurple" />
                  <p>You can select <strong>multiple time slots</strong>. Total updates automatically.</p>
                </div>

                {!isTimeSelectionAvailable() ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Select stations to unlock date and time selection</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <Label className="text-base font-medium text-gray-200 text-center md:text-left">Choose Date</Label>
                      <div className="mt-2 flex justify-center md:justify-start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          disabled={(date) => date < today}
                          className="rounded-xl border bg-black/30 border-white/10 pointer-events-auto"
                        />
                      </div>
                    </div>

                    {selectedStations.length > 0 && (
                      <div>
                        <Label className="text-base font-medium text-gray-200">Available Time Slots</Label>
                        <div className="mt-2">
                          <TimeSlotPicker
                            slots={availableSlots}
                            selectedSlots={selectedSlots}
                            onChange={setSelectedSlots}
                            loading={slotsLoading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TODAY'S BOOKINGS */}
            <Card className="bg-white/5 border-white/10 rounded-2xl shadow-xl mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Today’s Bookings</CardTitle>
                <span className="text-xs text-gray-400 border border-white/10 rounded-full px-2 py-0.5">{todayTotal} total</span>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}
                  </div>
                ) : todayGrouped.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <CalendarIcon className="h-6 w-6 mx-auto mb-2 opacity-70" />
                    No bookings yet today.
                  </div>
                ) : (
                  todayGrouped.map((blk) => (
                    <details key={blk.time} className="group border border-white/10 rounded-xl overflow-hidden">
                      <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 bg-white/5">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                          <span className="font-medium text-white">{blk.time}</span>
                        </div>
                        <span className="text-xs text-gray-400">{blk.groups.reduce((acc:any,g:any)=>acc+g.items.length,0)} bookings</span>
                      </summary>
                      <div className="px-4 py-3 overflow-x-auto">
                        <div className="min-w-[520px]">
                          <div className="grid grid-cols-3 text-xs text-gray-400 border-b border-white/10 pb-2">
                            <div>Customer</div>
                            <div>Stations</div>
                            <div className="text-right">Status</div>
                          </div>
                          {blk.groups.map((g:any, idx:number) => (
                            <div key={idx} className="grid grid-cols-3 py-2 border-b border-white/5">
                              <div className="text-sm text-white">{g.name}</div>
                              <div className="text-sm text-gray-200">
                                {g.items.map((i:any)=>i.station?.name).filter(Boolean).join(', ')}
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-xs capitalize">{g.items[0]?.status || 'confirmed'}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-white/10 backdrop-blur-xl border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,.25)] animate-scale-in" style={{ animationDelay: '300ms' }}>
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

                {selectedDate && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</Label>
                    <p className="mt-1 text-sm text-gray-200">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                )}

                {selectedSlots.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</Label>
                    <ul className="mt-1 text-sm text-gray-200 space-y-1 max-h-28 overflow-auto pr-1">
                      {[...selectedSlots]
                        .sort((a,b)=>a.start_time.localeCompare(b.start_time))
                        .map(s => (
                          <li key={`${s.start_time}-${s.end_time}`}>
                            {new Date(`2000-01-01T${s.start_time}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
                            {' — '}
                            {new Date(`2000-01-01T${s.end_time}`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}
                          </li>
                        ))}
                    </ul>
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
                      className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-cuephoria-purple/40 focus:border-cuephoria-purple/40 transition flex-1"
                    />
                    <Button
                      onClick={handleCouponApply}
                      size="sm"
                      className="rounded-xl bg-green-600 hover:bg-green-700 transition-all duration-150 active:scale-[.98] shadow-lg shadow-green-500/10"
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
                          <p className="text-sm text-amber-400 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span><strong>Important:</strong> To avail this offer, you must present a valid NIT Trichy student ID card at reception. This is mandatory.</span>
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
                  disabled={selectedSlots.length === 0 || selectedStations.length === 0 || !customerNumber || loading}
                  className="w-full rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90 text-white border-0 transition-all duration-150 active:scale-[.99] shadow-xl shadow-cuephoria-lightpurple/20"
                  size="lg"
                >
                  {loading ? 'Creating Booking...' : 'Confirm Booking'}
                </Button>

                <p className="text-xs text-gray-400 text-center">Payment will be collected at the venue</p>
              </CardContent>
            </Card>
          </div>
        </div>
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

          {/* Legal Links */}
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
