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
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import CouponPromotionalPopup from '@/components/CouponPromotionalPopup';
import BookingConfirmationDialog from '@/components/BookingConfirmationDialog';
import LegalDialog from '@/components/dialog/LegalDialog';
import {
  CalendarIcon, Clock, MapPin, Phone, Mail, User, Gamepad2, Timer,
  Sparkles, Star, Zap, Percent, CheckCircle, AlertTriangle, Lock
} from 'lucide-react';
import { format, parse, getDay } from 'date-fns';
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

interface TodayBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  station_id: string;
  customer_id: string;
  stationName: string;
  customerName: string;
  customerPhone: string;
}

export default function PublicBooking() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', phone: '', email: '' });
  const [customerNumber, setCustomerNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [stationType, setStationType] = useState<'all' | 'ps5' | '8ball'>('all');
  // For multiple coupons support:
  const [appliedCoupons, setAppliedCoupons] = useState<{ [key: string]: string }>({});

  const [couponInput, setCouponInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<'terms' | 'privacy' | 'contact'>('terms');

  const [todayRows, setTodayRows] = useState<TodayBookingRow[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

  const today = new Date();

  useEffect(() => {
    fetchStations();
    fetchTodaysBookings();
  }, []);

  // Realtime refresh
  useEffect(() => {
    const channel = supabase
      .channel('booking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (selectedStations.length && selectedDate) fetchAvailableSlots();
        fetchTodaysBookings();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    if (selectedStations.length && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedStations, selectedDate]);

  // Validate NIT99 coupon time restriction on slot or date change
  useEffect(() => {
    if (appliedCoupons['8ball'] === 'NIT99' && !checkHappyHour(selectedDate, selectedSlot)) {
      setAppliedCoupons(prev => {
        const copy = { ...prev };
        delete copy['8ball'];
        toast.error('NIT99 coupon removed - valid only Mon-Fri 11 AM to 3 PM');
        return copy;
      });
    }
  }, [selectedDate, selectedSlot]);

  const fetchStations = async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('id, name, type, hourly_rate')
        .order('name');
      if (error) throw error;
      setStations(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load stations');
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedStations.length) return;

    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      if (selectedStations.length === 1) {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_date: dateStr,
          p_station_id: selectedStations[0],
          p_slot_duration: 60,
        });
        if (error) throw error;
        setAvailableSlots(data || []);
      } else {
        const results = await Promise.all(selectedStations.map(stationId =>
          supabase.rpc('get_available_slots', {
            p_date: dateStr,
            p_station_id: stationId,
            p_slot_duration: 60,
          })
        ));

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
          (r.data || []).forEach((s: TimeSlot) => {
            const key = keyOf(s);
            unionMap.set(key, unionMap.get(key) || Boolean(s.is_available));
          });
        });

        setAvailableSlots(base.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          is_available: unionMap.get(keyOf(s)) || false,
        })));
      }

      if (selectedSlot && !availableSlots.some(s =>
        s.start_time === selectedSlot.start_time && s.end_time === selectedSlot.end_time && s.is_available
      )) {
        setSelectedSlot(null);
      }

      // Re-validate coupons on availability refresh:
      if (appliedCoupons['8ball'] === 'NIT99' && !checkHappyHour(selectedDate, selectedSlot)) {
        setAppliedCoupons(prev => {
          const cp = { ...prev };
          delete cp['8ball'];
          toast.error('NIT99 coupon removed due to invalid time');
          return cp;
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load available slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  function checkHappyHour(date: Date, slot: TimeSlot | null) {
    if (!slot) return false;
    const day = getDay(date); // 0=Sunday, 6=Saturday
    const hour = Number(slot.start_time.split(':')[0]);
    return day >= 1 && day <= 5 && hour >= 11 && hour < 15;
  }

  const searchCustomer = async () => {
    if (!customerNumber.trim()) {
      toast.error('Please enter phone number');
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('phone', customerNumber)
        .single();

      if (error && (error as any).code !== 'PGRST116') throw error;

      if (data) {
        setCustomerInfo({
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email || '',
        });
        setIsReturningCustomer(true);
        toast.success(`Welcome back, ${data.name}!`);
      } else {
        setCustomerInfo({ id: undefined, name: '', phone: customerNumber, email: '' });
        setIsReturningCustomer(false);
        toast.info('New customer, please fill details below.');
      }
      setHasSearched(true);
    } catch (e) {
      console.error(e);
      toast.error('Customer search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleStationToggle = (id: string) => {
    setSelectedStations(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
    setSelectedSlot(null);
  };

  const filterStationsForSlot = async (slot: TimeSlot) => {
    if (!selectedStations.length) return [];

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const checks = await Promise.all(selectedStations.map(async id => {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_date: dateStr,
        p_station_id: id,
        p_slot_duration: 60,
      });
      if (error) return { stationId: id, available: false };
      const isAvailable = (data as TimeSlot[]).some(s =>
        s.start_time === slot.start_time && s.end_time === slot.end_time && s.is_available
      );
      return { stationId: id, available: isAvailable };
    }));

    const availableIds = checks.filter(c => c.available).map(c => c.stationId);
    const removedIds = checks.filter(c => !c.available).map(c => c.stationId);

    if (removedIds.length) {
      const removedNames = stations.filter(s => removedIds.includes(s.id)).map(s => s.name).join(', ');
      toast.message('Some stations removed due to unavailable time slots', { description: removedNames });
    }
    return availableIds;
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    if (selectedStations.length) {
      const available = await filterStationsForSlot(slot);
      if (!available.length) {
        toast.error('This time is not available for selected stations');
        return setSelectedSlot(null);
      }
      if (available.length !== selectedStations.length) setSelectedStations(available);

      // If NIT99 is applied but new slot is invalid, remove coupon
      if (appliedCoupons['8ball'] === 'NIT99' && !checkHappyHour(selectedDate, slot)) {
        setAppliedCoupons(prev => {
          const c = { ...prev };
          delete c['8ball'];
          toast.error('NIT99 coupon removed due to invalid time');
          return c;
        });
      }
    }
    setSelectedSlot(slot);
  };

  const applyCoupon = (code: string) => {
    const c = code.trim().toUpperCase();
    const allowed = ['CUEPHORIA25', 'NIT50', 'ALMA50', 'AXEIST', 'NIT99'];

    if (!allowed.includes(c)) {
      toast.error('Invalid coupon');
      return;
    }

    if (c === 'AXEIST' && !window.confirm('Use AXEIST for 100% OFF?')) return;

    // Check stations matching coupon requirements
    if (c === 'NIT99' && !selectedStations.some(id => stations.find(s => s.id === id && s.type === '8ball'))) {
      toast.error('NIT99 valid only for 8-ball');
      return;
    }
    if ((c === 'NIT99' || c === 'NIT50' || c === 'ALMA50') && !checkHappyHour(selectedDate, selectedSlot)) {
      if(c === 'NIT99') {
        toast.error('NIT99 valid only Mon-Fri from 11AM to 3PM');
        return;
      }
      // NIT50 and ALMA50 can be used anytime for students, so no time check
    }

    if (c === 'NIT50' || c === 'ALMA50') {
      if (!selectedStations.some(id => stations.find(s => s.id === id && s.type === 'ps5'))) {
        toast.error(`${c} valid only on PS5 stations`);
        return;
      }
      // Can't stack NIT50 and ALMA50 both for PS5
      if (appliedCoupons['ps5'] && appliedCoupons['ps5'] !== c) {
        toast.error('Cannot use both NIT50 and ALMA50 together');
        return;
      }
    }

    if (c === 'NIT99') setAppliedCoupons(prev => ({ ...prev, '8ball': c }));
    else if (c === 'NIT50' || c === 'ALMA50') setAppliedCoupons(prev => ({ ...prev, 'ps5': c }));
    else setAppliedCoupons({ 'all': c }); // For global coupons

    toast.success(`${c} coupon applied`);
    setCouponInput('');
  };

  const calculateOriginalPrice = () => {
    if (!selectedStations.length || !selectedSlot) return 0;
    return stations.filter(s => selectedStations.includes(s.id)).reduce((acc, s) => acc + s.hourly_rate, 0);
  };

  const calculateDiscountDetails = () => {
    if (!selectedStations.length || !selectedSlot) return [];
    const details = [];

    const ps5Stations = stations.filter(s => selectedStations.includes(s.id) && s.type === 'ps5');
    const ballStations = stations.filter(s => selectedStations.includes(s.id) && s.type === '8ball');

    if ('8ball' in appliedCoupons) {
      const before = ballStations.reduce((a,s) => a + s.hourly_rate, 0);
      const after = (appliedCoupons['8ball'] === 'NIT99') ? (99 * ballStations.length) : before;
      if (before > 0) details.push({ label: `8-Ball (${ballStations.length}) - ${appliedCoupons['8ball']}`, before, after });
    }
    if ('ps5' in appliedCoupons) {
      const before = ps5Stations.reduce((a,s) => a + s.hourly_rate, 0);
      const after = (appliedCoupons['ps5'] === 'NIT50' || appliedCoupons['ps5'] === 'ALMA50') ? before * 0.5 : before;
      if (before > 0) details.push({ label: `PS5 (${ps5Stations.length}) - ${appliedCoupons['ps5']}`, before, after });
    }
    if ('all' in appliedCoupons) {
      const before = calculateOriginalPrice();
      let after = before;
      if (appliedCoupons['all'] === 'AXEIST') after = 0;
      else if (appliedCoupons['all'] === 'CUEPHORIA25') after = before * 0.75;

      details.push({ label: `${appliedCoupons['all']}`, before, after });
    }
    return details;
  };

  const discountTotal = () => {
    let disc = 0;
    calculateDiscountDetails().forEach(d => disc += d.before - d.after);
    return disc;
  };

  const calculateFinalPrice = () => {
    const original = calculateOriginalPrice();
    let totalDiscount = discountTotal();
    return Math.max(original - totalDiscount, 0);
  };

  const handleBookingSubmit = async () => {
    if (!customerNumber.trim()) {
      toast.error('Please fill phone number');
      return;
    }
    if (!selectedStations.length) {
      toast.error('Select at least one station');
      return;
    }
    if (!selectedSlot) {
      toast.error('Select a time slot');
      return;
    }
    if (!customerInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      let custId = customerInfo.id;
      if (!custId) {
        const { data, error } = await supabase.from('customers').insert({
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email || null,
          is_member: false,
          loyalty_points: 0,
          total_spent: 0,
          total_play_time: 0,
        }).select('id').single();
        if (error) throw error;
        custId = data!.id;
      }
      const totalDiscount = discountTotal();
      const finalAmount = calculateFinalPrice();
      const couponTag = Object.values(appliedCoupons).join(',');

      const bookings = selectedStations.map(id => ({
        station_id: id,
        customer_id: custId!,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot!.start_time,
        end_time: selectedSlot!.end_time,
        duration: 60,
        status: 'confirmed',
        original_price: calculateOriginalPrice(),
        discount_percentage: totalDiscount > 0 ? (totalDiscount / calculateOriginalPrice()) * 100 : null,
        final_price: finalAmount,
        coupon_code: couponTag || null,
      }));

      const { data: bookingsData, error: bookingError } = await supabase.from('bookings').insert(bookings).select('id');
      if (bookingError) throw bookingError;

      setBookingConfirmationData({
        bookingId: bookingsData![0].id.slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: stations.filter(s => selectedStations.includes(s.id)).map(s => s.name),
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: new Date(`2000-01-01T${selectedSlot!.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        endTime: new Date(`2000-01-01T${selectedSlot!.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        totalAmount: finalAmount,
        couponCode: couponTag || undefined,
        discountAmount: totalDiscount > 0 ? totalDiscount : undefined,
      });
      setShowConfirmationDialog(true);

      setSelectedStations([]);
      setSelectedSlot(null);
      setCustomerNumber('');
      setCustomerInfo({ id: undefined, name: '', phone: '', email: '' });
      setIsReturningCustomer(false);
      setHasSearched(false);
      setAppliedCoupons({});
      setCouponInput('');
      setAvailableSlots([]);
    } catch (e) {
      console.error(e);
      toast.error('Booking creation failed');
    } finally {
      setLoading(false);
    }
  };

  const maskPhone = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    return digits.length <= 4 ? digits : `${digits.slice(0, 3)}${'X'.repeat(digits.length - 5)}${digits.slice(-2)}`;
  };

  const fetchTodaysBookings = async () => {
    setTodayLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase.from('bookings').select(
        'id, booking_date, start_time, end_time, status, station_id, customer_id'
      ).eq('booking_date', todayStr).order('start_time', { ascending: true });
      if (error) throw error;
      if (!data?.length) {
        setTodayRows([]);
        setTodayLoading(false);
        return;
      }
      const stationIds = Array.from(new Set(data.map(d => d.station_id)));
      const customerIds = Array.from(new Set(data.map(d => d.customer_id)));

      const [{ data: stationsData }, { data: customersData }] = await Promise.all([
        supabase.from('stations').select('id, name').in('id', stationIds),
        supabase.from('customers').select('id, name, phone').in('id', customerIds),
      ]);

      const rows = data.map(booking => {
        const st = stationsData?.find(s => s.id === booking.station_id);
        const cu = customersData?.find(c => c.id === booking.customer_id);
        return {
          id: booking.id,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status as any,
          station_id: booking.station_id,
          customer_id: booking.customer_id,
          stationName: st?.name || '—',
          customerName: cu?.name || '—',
          customerPhone: maskPhone(cu?.phone),
        };
      });

      setTodayRows(rows);
    } catch (e) {
      setTodayRows([]);
      toast.error('Failed to load today\'s bookings');
      console.error(e);
    } finally {
      setTodayLoading(false);
    }
  };

  const timeKey = (start: string, end: string) => {
    const s = new Date(`2000-01-01T${start}`);
    const e = new Date(`2000-01-01T${end}`);
    return `${s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — ${e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const groupedBookings = useMemo(() => {
    const groupMap = new Map<string, TodayBookingRow[]>();
    todayRows.forEach(row => {
      const k = timeKey(row.start_time, row.end_time);
      if (!groupMap.has(k)) groupMap.set(k, []);
      groupMap.get(k)!.push(row);
    });
    return Array.from(groupMap.entries()).sort((a, b) => {
      const aT = parse(a[0].split(' — ')[0], 'h:mm a', new Date()).getTime();
      const bT = parse(b[0].split(' — ')[0], 'h:mm a', new Date()).getTime();
      return aT - bT;
    });
  }, [todayRows]);

  const statusChip = (status: TodayBookingRow['status']) => {
    const base = 'px-2 py-0.5 rounded-full text-xs capitalize';
    switch (status) {
      case 'confirmed': return <span className={cn(base, 'bg-blue-500/15 text-blue-400 border border-blue-400')}>confirmed</span>;
      case 'in-progress': return <span className={cn(base, 'bg-amber-500/15 text-amber-400 border border-amber-400')}>in-progress</span>;
      case 'completed': return <span className={cn(base, 'bg-green-500/15 text-green-400 border border-green-400')}>completed</span>;
      case 'cancelled': return <span className={cn(base, 'bg-red-500/15 text-red-400 border border-red-400')}>cancelled</span>;
      case 'no-show': return <span className={cn(base, 'bg-gray-500/15 text-gray-400 border border-gray-400')}>no-show</span>;
      default: return <span className={cn(base, 'bg-gray-500/15 text-gray-400 border border-gray-400')}>{status}</span>;
    }
  };

  // News ticker component for mobile and desktop top fixed
  const NewsTicker = () => (
    <div className="fixed top-0 w-full bg-gradient-to-r from-purple-700 via-purple-900 to-indigo-800 text-white text-center select-none py-2 px-4 md:hidden z-[9999] shadow-lg">
      <marquee behavior="scroll" scrollamount={7} direction="left" onMouseEnter={(e) => (e.currentTarget.stop(), setTimeout(() => e.currentTarget.start(), 1000))}>
        <Sparkles className="inline-block mr-2" /> 
        <strong>Happy hours at Cuephoria:</strong> Exclusive for NIT students of Trichy, flat ₹99/hour on 8-Ball tables — Monday to Friday, 11 AM to 3 PM!
      </marquee>
    </div>
  );

  const discountDetails = calculateDiscountDetails();
  const totalDiscount = discountTotal();
  const finalPrice = calculateFinalPrice();

  return (
    <>
      <NewsTicker />
      <div className="pt-10 min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]">
        {/* Decorative background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-700/20 blur-3xl" />
          <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-indigo-700/20 blur-3xl" />
          <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />
        </div>

        {/* Promo popup */}
        <CouponPromotionalPopup onCouponSelect={applyCoupon} />

        {/* Header */}
        <header className="py-10 px-4 sm:px-6 md:px-8 relative z-10">
          <div className="max-w-7xl mx-auto text-center">
            <img src="/lovable-uploads/61f60f.png" alt="Cuephoria Logo" className="mx-auto h-24 drop-shadow-lg" />
            <small className="mt-2 inline-flex items-center justify-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs uppercase text-white tracking-wide shadow-inner shadow-purple-900/40">
              <Sparkles className="h-4 w-4" /> Premium Gaming Lounge
            </small>
            <h1 className="mt-5 text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-purple-400 to-indigo-600 bg-clip-text text-transparent">
              Book Your Gaming Session
            </h1>
            <p className="mt-2 text-lg font-light text-white/80 max-w-xl mx-auto">
              Reserve PlayStation 5 or Pool Table sessions at Cuephoria
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-28 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          {/* Left two columns: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                  <User className="text-purple-600" />
                  Step 1: Customer Information
                  {isReturningCustomer && <CheckCircle className="text-green-400 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Enter phone number"
                      value={customerNumber}
                      onChange={e => {
                        setCustomerNumber(e.target.value);
                        setHasSearched(false);
                        setIsReturningCustomer(false);
                        setCustomerInfo({ id: undefined, name: '', phone: e.target.value, email: '' });
                      }}
                      className="flex-grow bg-black/40 text-white"
                    />
                    <Button disabled={searching} onClick={searchCustomer}>
                      {searching ? 'Searching...' : 'Search'}
                    </Button>
                  </div>

                  {hasSearched && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="input-name">Full Name</Label>
                        <Input
                          id="input-name"
                          placeholder="Full name"
                          value={customerInfo.name}
                          onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                          disabled={isReturningCustomer}
                          className="bg-black/40 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="input-email">Email (optional)</Label>
                        <Input
                          id="input-email"
                          placeholder="Email"
                          value={customerInfo.email}
                          onChange={e => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                          disabled={isReturningCustomer}
                          className="bg-black/40 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {isReturningCustomer && (
                    <div className="flex items-center gap-2 text-green-400 mt-1 text-sm">
                      <CheckCircle /> Customer information verified.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Station Selection */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-white text-lg font-semibold">
                  <MapPin className="text-indigo-500" />
                  Step 2: Select Stations
                </CardTitle>
                {selectedStations.length > 0 && (
                  <Badge variant='secondary' className="bg-green-600 text-white">
                    {selectedStations.length} Selected
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex gap-2">
                  {['all', 'ps5', '8ball'].map(type => (
                    <Button
                      key={type}
                      size="sm"
                      variant={stationType === type ? 'default' : 'outline'}
                      onClick={() => setStationType(type as any)}
                    >
                      {type === 'all' ? 'All' : type.toUpperCase()}
                    </Button>
                  ))}
                </div>

                {!isReturningCustomer || !hasSearched ? (
                  <div className="opacity-60 pointer-events-none">
                    Complete customer info to select stations.
                  </div>
                ) : (
                  <StationSelector
                    stations={stationType === 'all' ? stations : stations.filter(s => s.type === stationType)}
                    selectedStations={selectedStations}
                    onToggle={handleStationToggle}
                  />
                )}
              </CardContent>
            </Card>

            {/* Step 3: Select Date and Time */}
            <Card>
              <CardHeader className="flex items-center gap-3">
                <div>
                  {stationType === 'none' || !isReturningCustomer ? (
                    <Lock className="text-gray-400" />
                  ) : (
                    <CalendarIcon className="text-blue-400" />
                  )}
                </div>
                <CardTitle className="text-white text-lg font-semibold">Step 3: Choose Date & Time</CardTitle>
                {isReturningCustomer && selectedSlot && <CheckCircle className="text-green-400 ml-auto" />}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Pick a Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={date => date && setSelectedDate(date)}
                      disabled={date => date < today}
                      className="bg-black/40 text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <Label>Available Time Slots</Label>
                    <TimeSlotPicker
                      slots={availableSlots}
                      selectedSlot={selectedSlot}
                      onSelect={handleSlotSelect}
                      loading={slotsLoading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Booking Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStations.length > 0 && (
                  <>
                    <Label className="text-xs uppercase text-gray-400 mb-2">Selected Stations</Label>
                    <div className="space-y-2 mb-4">
                      {selectedStations.map(id => {
                        const st = stations.find(s => s.id === id);
                        if (!st) return null;
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <div className={cn("w-5 h-5 flex items-center justify-center rounded-md",
                              st.type === 'ps5' ? "bg-purple-600" : "bg-green-600")}>
                              {st.type === 'ps5' ? <Gamepad2 className="text-white w-3.5 h-3.5" /> : <Timer className="text-white w-3.5 h-3.5" />}
                            </div>
                            <Badge>{st.name}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {selectedDate && (
                  <div className="mb-2">
                    <Label className="text-xs uppercase text-gray-400">Date</Label>
                    <p>{format(selectedDate, 'eeee, MMMM d, yyyy')}</p>
                  </div>
                )}

                {selectedSlot && (
                  <div className="mb-4">
                    <Label className="text-xs uppercase text-gray-400">Time</Label>
                    <p>{new Date(`2000-01-01T${selectedSlot.start_time}`).toLocaleTimeString()} - {new Date(`2000-01-01T${selectedSlot.end_time}`).toLocaleTimeString()}</p>
                  </div>
                )}

                <div className="mb-4">
                  <Label className="text-xs uppercase text-gray-400">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      className="bg-black/40 text-white"
                    />
                    <Button size="sm" onClick={() => couponInput && applyCoupon(couponInput)}>
                      Apply
                    </Button>
                  </div>
                  {Object.keys(appliedCoupons).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {appliedCoupons['all'] && (
                        <div className="p-2 bg-gradient-to-r from-purple-700 via-purple-900 to-indigo-800 text-white rounded">
                          <Sparkles className="inline mr-2" /> Applied: <strong>{appliedCoupons['all']}</strong> (Global Discount)
                        </div>
                      )}
                      {appliedCoupons['ps5'] && (
                        <div className="p-2 bg-purple-700 text-white rounded">
                          Applied on PS5: <strong>{appliedCoupons['ps5']}</strong>
                        </div>
                      )}
                      {appliedCoupons['8ball'] && (
                        <div className="p-2 bg-green-700 text-white rounded">
                          Applied on 8-Ball: <strong>{appliedCoupons['8ball']}</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {(selectedStations.length > 0 && selectedSlot) && (
                  <>
                    <Separator />
                    <div className="mb-2 text-sm">
                      {calculateDiscountDetails().map(({ label, before, after }) => (
                        <div key={label} className="flex justify-between text-gray-300">
                          <span>{label}:</span>
                          <span><s>₹{before.toFixed(0)}</s> → ₹{after.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-gray-400 text-sm font-semibold">
                      <span>Subtotal:</span> <span>₹{calculateOriginalPrice().toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-green-400 text-sm font-semibold">
                      <span>Total Discount:</span> <span>-₹{discountTotal().toFixed(0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-extrabold text-xl text-gradient-purple">
                      <span>Total Amount:</span> <span>₹{calculateFinalPrice().toFixed(0)}</span>
                    </div>
                  </>
                )}

                <Button
                  disabled={loading || !selectedSlot || !selectedStations.length || !customerNumber}
                  onClick={handleBookingSubmit}
                  size="lg"
                  className="w-full mt-6 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-600 text-white font-bold"
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </Button>

                <p className="text-xs text-gray-400 mt-2 text-center">Payment collected at venue</p>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Today's Bookings */}
        <div className="max-w-7xl mx-auto px-4 py-10">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="text-indigo-400" /> Today's Bookings ({todayRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayLoading && <p className="text-gray-500">Loading...</p>}
              {!todayLoading && todayRows.length === 0 && <p className="text-gray-500">No bookings for today.</p>}
              {!todayLoading && todayRows.length > 0 && (
                <div className="divide-y divide-gray-700">
                  {groupedBookings.map(([timeLabel, bookings]) => (
                    <details key={timeLabel} className="mb-3 bg-black bg-opacity-30 rounded shadow">
                      <summary className="flex justify-between py-2 px-4 cursor-pointer font-medium text-indigo-400">
                        <span>{timeLabel}</span>
                        <span>{bookings.length} booking{bookings.length > 1 ? 's' : ''}</span>
                      </summary>
                      <div className="px-4 py-2 overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-300">
                          <thead>
                            <tr>
                              <th className="py-1">Customer</th>
                              <th className="py-1">Station</th>
                              <th className="py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookings.map(b => (
                              <tr key={b.id} className="border-t border-gray-700">
                                <td>
                                  <div>{b.customerName}</div>
                                  <div className="text-xs text-gray-500">{b.customerPhone}</div>
                                </td>
                                <td>
                                  <Badge>{b.stationName}</Badge>
                                </td>
                                <td>
                                  {statusChip(b.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="bg-black bg-opacity-70 py-6 px-4 w-full fixed bottom-0 text-center backdrop-blur-md text-sm text-gray-400">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/lovable-uploads/61f60f.png" alt="Cuephoria" className="h-8" />
              <span>&copy; {new Date().getFullYear()} Cuephoria. All Rights Reserved.</span>
            </div>
            <div className="flex gap-5">
              <button className="hover:underline" onClick={() => { setLegalDialogType('terms'); setShowLegalDialog(true); }}>
                Terms & Conditions
              </button>
              <button className="hover:underline" onClick={() => { setLegalDialogType('privacy'); setShowLegalDialog(true); }}>
                Privacy Policy
              </button>
              <button className="hover:underline" onClick={() => { setLegalDialogType('contact'); setShowLegalDialog(true); }}>
                Contact Us
              </button>
            </div>
            <div className="flex gap-4 items-center text-gray-400">
              <Phone />
              <a href="tel:+918637625155" className="text-gray-400 hover:text-white">+91 8637 625 155</a>
              <Mail />
              <a href="mailto:contact@cuephoria.in" className="text-gray-400 hover:text-white">contact@cuephoria.in</a>
            </div>
          </div>
        </footer>

        {/* Dialogs */}
        {bookingConfirmationData && (
          <BookingConfirmationDialog 
            isOpen={showConfirmationDialog}
            onClose={() => setShowConfirmationDialog(false)}
            bookingData={bookingConfirmationData}
          />
        )}

        <LegalDialog 
          isOpen={showLegalDialog}
          onClose={() => setShowLegalDialog(false)}
          type={legalDialogType}
        />
      </div>
    </>
  );
}
