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
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [stationType, setStationType] = useState<'all' | 'ps5' | '8ball'>('all');

  // Using object to hold multiple coupons (per station type or all)
  const [appliedCoupons, setAppliedCoupons] = useState<{ [key: string]: string }>({});

  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<'terms' | 'privacy' | 'contact'>('terms');

  // Today's bookings
  const [todayRows, setTodayRows] = useState<TodayBookingRow[]>([]);
  const [todayLoading, setTodayLoading] = useState<boolean>(true);

  useEffect(() => { fetchStations(); fetchTodaysBookings(); }, []);

  useEffect(() => {
    // Coupon validity check on date or slot change for NIT99 (happy hour coupon)
    if (appliedCoupons['8ball'] === 'NIT99' && !isHappyHour(selectedDate, selectedSlot)) {
      // Remove the coupon and notify user
      setAppliedCoupons(prev => {
        const copy = { ...prev };
        delete copy['8ball'];
        return copy;
      });
      toast.error('NIT99 coupon removed: valid only Monday-Friday, 11 AM to 3 PM');
    }
  }, [selectedDate, selectedSlot]);

  useEffect(() => {
    const channel = supabase
      .channel('booking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
        fetchTodaysBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    if (selectedStations.length > 0 && selectedDate) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedStations, selectedDate]);

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

      if (selectedStations.length === 1) {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_date: dateStr,
          p_station_id: selectedStations[0],
          p_slot_duration: 60
        });
        if (error) throw error;
        setAvailableSlots(data || []);
      } else {
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
          is_available: Boolean(unionMap.get(keyOf(s)))
        }));
        setAvailableSlots(merged);
      }

      if (selectedSlot && !(availableSlots || []).some(
        s => s.start_time === selectedSlot.start_time &&
          s.end_time === selectedSlot.end_time &&
          s.is_available
      )) {
        setSelectedSlot(null);
      }
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
    setSelectedSlot(null);
  };

  const filterStationsForSlot = async (slot: TimeSlot) => {
    if (selectedStations.length === 0) return selectedStations;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const checks = await Promise.all(
      selectedStations.map(async (stationId) => {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_date: dateStr,
          p_station_id: stationId,
          p_slot_duration: 60
        });
        if (error) return { stationId, available: false };
        const match = (data || []).find(
          (s: any) =>
            s.start_time === slot.start_time &&
            s.end_time === slot.end_time &&
            s.is_available
        );
        return { stationId, available: Boolean(match) };
      })
    );

    const availableIds = checks.filter(c => c.available).map(c => c.stationId);
    const removedIds = checks.filter(c => !c.available).map(c => c.stationId);

    if (removedIds.length > 0) {
      const removedNames = stations
        .filter(s => removedIds.includes(s.id))
        .map(s => s.name)
        .join(', ');
      toast.message('Some stations aren’t free at this time', {
        description: `Removed: ${removedNames}. You can proceed with the rest.`,
      });
    }

    return availableIds;
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    if (selectedStations.length > 0) {
      const filtered = await filterStationsForSlot(slot);

      if (filtered.length === 0) {
        toast.error('That time isn’t available for the selected stations.');
        setSelectedSlot(null);
        return;
      }

      if (filtered.length !== selectedStations.length) {
        setSelectedStations(filtered);
      }
    }
    setSelectedSlot(slot);
  };

  // Helpers for coupon validation
  const isHappyHour = (date: Date, slot: TimeSlot | null) => {
    if (!slot) return false;
    const day = getDay(date);
    const startHour = Number(slot.start_time.split(':')[0]);
    return day >= 1 && day <= 5 && startHour >= 11 && startHour < 15;
  };

  /** Centralized coupon applier with multi-coupon support and validation */
  const applyCoupon = (code: string) => {
    const upper = (code || '').toUpperCase().trim();

    const allowed = ['CUEPHORIA25', 'NIT50', 'ALMA50', 'AXEIST', 'NIT99'];
    if (!allowed.includes(upper)) {
      toast.error('Invalid coupon code');
      return;
    }

    if (upper === 'NIT99') {
      if (!selectedStations.some(id => stations.find(s => s.id === id && s.type === '8ball'))) {
        toast.error('NIT99 applies only to 8-Ball stations');
        return;
      }
      if (!isHappyHour(selectedDate, selectedSlot)) {
        toast.error('NIT99 valid only Monday-Friday, 11 AM to 3 PM');
        return;
      }
      setAppliedCoupons(prev => ({ ...prev, '8ball': 'NIT99' }));
      toast.success('NIT99 applied to 8-Ball stations');
      return;
    }

    if (upper === 'NIT50' || upper === 'ALMA50') {
      if (!selectedStations.some(id => stations.find(s => s.id === id && s.type === 'ps5'))) {
        toast.error(`${upper} applies only to PS5 stations`);
        return;
      }
      if (appliedCoupons['ps5'] && appliedCoupons['ps5'] !== upper) {
        toast.error(`You can apply only one PS5 coupon: either NIT50 or ALMA50`);
        return;
      }
      setAppliedCoupons(prev => ({ ...prev, 'ps5': upper }));
      toast.success(`${upper} applied to PS5 stations`);
      return;
    }

    if (upper === 'AXEIST' || upper === 'CUEPHORIA25') {
      setAppliedCoupons({ 'all': upper });
      toast.success(`${upper} applied globally`);
      return;
    }
  };

  const handleCouponApply = () => {
    applyCoupon(couponCode);
    setCouponCode('');
  };

  const handleCouponSelect = (coupon: string) => {
    applyCoupon(coupon);
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0 || !selectedSlot) return 0;
    const selectedObjs = stations.filter(s => selectedStations.includes(s.id));
    return selectedObjs.reduce((sum, s) => sum + s.hourly_rate, 0);
  };

  /** Returns detailed discount breakdown and total discount */
  const calculateDiscount = () => {
    if (selectedStations.length === 0 || !selectedSlot) return { total: 0, breakdown: {} };

    if (appliedCoupons['all']) {
      const original = calculateOriginalPrice();
      if (appliedCoupons['all'] === 'AXEIST') return { total: original, breakdown: { all: original } };
      if (appliedCoupons['all'] === 'CUEPHORIA25') {
        const d = original * 0.25;
        return { total: d, breakdown: { all: d } };
      }
      return { total: 0, breakdown: {} };
    }

    let discount = 0;
    const breakdown: Record<string, number> = {};

    if (appliedCoupons['8ball'] === 'NIT99') {
      const eightBalls = stations.filter(s => selectedStations.includes(s.id) && s.type === '8ball');
      const sum = eightBalls.reduce((acc, s) => acc + s.hourly_rate, 0);
      const discounted = 99 * eightBalls.length;
      const d = sum - discounted > 0 ? sum - discounted : 0;
      discount += d;
      breakdown['8ball (NIT99)'] = d;
    }

    if (appliedCoupons['ps5']) {
      const ps5Stations = stations.filter(s => selectedStations.includes(s.id) && s.type === 'ps5');
      const sum = ps5Stations.reduce((acc, s) => acc + s.hourly_rate, 0);
      if (appliedCoupons['ps5'] === 'NIT50' || appliedCoupons['ps5'] === 'ALMA50') {
        const d = sum * 0.5;
        discount += d;
        breakdown[`ps5 (${appliedCoupons['ps5']})`] = d;
      }
    }

    return { total: discount, breakdown };
  };

  const calculateFinalPrice = () => {
    const original = calculateOriginalPrice();
    const { total } = calculateDiscount();
    return Math.max(0, original - total);
  };

  const handleLegalClick = (type: 'terms' | 'privacy' | 'contact') => {
    setLegalDialogType(type);
    setShowLegalDialog(true);
  };

  const isCustomerInfoComplete = () =>
    hasSearched && customerNumber.trim() && customerInfo.name.trim();

  const isStationSelectionAvailable = () => isCustomerInfoComplete();
  const isTimeSelectionAvailable = () => isStationSelectionAvailable() && selectedStations.length > 0;

  const handleBookingSubmit = async () => {
    if (!customerNumber.trim()) { toast.error('Please complete customer information first'); return; }
    if (selectedStations.length === 0) { toast.error('Please select at least one station'); return; }
    if (!selectedSlot) { toast.error('Please select a time slot'); return; }
    if (!customerInfo.name.trim()) { toast.error('Please enter your name'); return; }

    setLoading(true);
    try {
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
      const { total: discount, breakdown: discountBreakdown } = calculateDiscount();
      const finalPrice = calculateFinalPrice();

      // Store all coupons applied as comma separated string
      const couponCodes = Object.values(appliedCoupons).join(',');

      const bookings = selectedStations.map(stationId => ({
        station_id: stationId,
        customer_id: customerId!,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot!.start_time,
        end_time: selectedSlot!.end_time,
        duration: 60,
        status: 'confirmed',
        original_price: originalPrice,
        discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
        final_price: finalPrice,
        coupon_code: couponCodes || null
      }));

      const { data: insertedBookings, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookings)
        .select('id');

      if (bookingError) throw bookingError;

      const selectedStationObjects = stations.filter(s => selectedStations.includes(s.id));
      const confirmationData = {
        bookingId: insertedBookings[0].id.slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: selectedStationObjects.map(s => s.name),
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: new Date(`2000-01-01T${selectedSlot!.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        endTime: new Date(`2000-01-01T${selectedSlot!.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        totalAmount: finalPrice,
        couponCode: couponCodes || undefined,
        discountAmount: discount > 0 ? discount : undefined
      };

      setBookingConfirmationData(confirmationData);
      setShowConfirmationDialog(true);

      setSelectedStations([]);
      setSelectedSlot(null);
      setCustomerNumber('');
      setCustomerInfo({ name: '', phone: '', email: '' });
      setIsReturningCustomer(false);
      setHasSearched(false);
      setCouponCode('');
      setAppliedCoupons({});
      setAvailableSlots([]);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ========= TODAY'S BOOKINGS (group by TIME -> customers) ========= // (No changes here, same as original)

  const maskPhone = (p?: string) => {
    if (!p) return '';
    const s = p.replace(/\D/g, '');
    if (s.length <= 4) return s;
    return `${s.slice(0, 3)}${'X'.repeat(Math.max(0, s.length - 5))}${s.slice(-2)}`;
  };

  const fetchTodaysBookings = async () => {
    setTodayLoading(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, end_time, status, station_id, customer_id')
        .eq('booking_date', todayStr)
        .order('start_time', { ascending: true });

      if (error) throw error;
      if (!bookingsData || bookingsData.length === 0) {
        setTodayRows([]);
        setTodayLoading(false);
        return;
      }

      const stationIds = [...new Set(bookingsData.map(b => b.station_id))];
      const customerIds = [...new Set(bookingsData.map(b => b.customer_id))];

      const [{ data: stationsData }, { data: customersData }] = await Promise.all([
        supabase.from('stations').select('id, name').in('id', stationIds),
        supabase.from('customers').select('id, name, phone').in('id', customerIds)
      ]);

      const rows: TodayBookingRow[] = bookingsData.map(b => {
        const st = stationsData?.find(s => s.id === b.station_id);
        const cu = customersData?.find(c => c.id === b.customer_id);
        return {
          id: b.id,
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status as TodayBookingRow['status'],
          station_id: b.station_id,
          customer_id: b.customer_id,
          stationName: st?.name || '—',
          customerName: cu?.name || '—',
          customerPhone: maskPhone(cu?.phone)
        };
      });

      setTodayRows(rows);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load today’s bookings');
    } finally {
      setTodayLoading(false);
    }
  };

  const timeKey = (s: string, e: string) => {
    const start = new Date(`2000-01-01T${s}`);
    const end = new Date(`2000-01-01T${e}`);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const groupedByTime = useMemo(() => {
    const map = new Map<string, TodayBookingRow[]>();
    todayRows.forEach(r => {
      const k = timeKey(r.start_time, r.end_time);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    const entries = Array.from(map.entries()).sort(([a], [b]) => {
      const aStart = parse(a.split(' — ')[0], 'h:mm a', new Date()).getTime();
      const bStart = parse(b.split(' — ')[0], 'h:mm a', new Date()).getTime();
      return aStart - bStart;
    });
    return entries;
  }, [todayRows]);

  const statusChip = (s: TodayBookingRow['status']) => {
    const base = 'px-2 py-0.5 rounded-full text-xs capitalize';
    switch (s) {
      case 'confirmed': return <span className={cn(base, 'bg-blue-500/15 text-blue-300 border border-blue-400/20')}>confirmed</span>;
      case 'in-progress': return <span className={cn(base, 'bg-amber-500/15 text-amber-300 border border-amber-400/20')}>in-progress</span>;
      case 'completed': return <span className={cn(base, 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20')}>completed</span>;
      case 'cancelled': return <span className={cn(base, 'bg-rose-500/15 text-rose-300 border border-rose-400/20')}>cancelled</span>;
      case 'no-show': return <span className={cn(base, 'bg-zinc-500/15 text-zinc-300 border border-zinc-400/20')}>no-show</span>;
      default: return <span className={cn(base, 'bg-zinc-500/15 text-zinc-300 border border-zinc-400/20')}>{s}</span>;
    }
  };

  const today = new Date();
  const originalPrice = calculateOriginalPrice();
  const discountResult = calculateDiscount();
  const discount = discountResult.total;
  const discountBreakdown = discountResult.breakdown || {};
  const finalPrice = calculateFinalPrice();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]">
      {/* ...rest of the UI remains unchanged (header, form, selection steps) */}

      {/* Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4 bg-white/10 backdrop-blur-xl border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,.25)] animate-scale-in">
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

            {selectedSlot && (
              <div>
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</Label>
                <p className="mt-1 text-sm text-gray-200">
                  {new Date(`2000-01-01T${selectedSlot.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  {' — '}
                  {new Date(`2000-01-01T${selectedSlot.end_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            )}

            {/* Coupon input and applied coupons display unchanged */}

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

              {Object.entries(appliedCoupons).length > 0 && (
                <div className="mt-2 space-y-2">
                  {appliedCoupons['8ball'] === 'NIT99' && (
                    <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                      <p className="text-sm text-blue-300 flex items-start gap-2">
                        <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>✅ <strong>NIT99 applied</strong> — ₹99/hr for 8-Ball during Mon-Fri 11 AM–3 PM</span>
                      </p>
                    </div>
                  )}
                  {appliedCoupons['ps5'] === 'NIT50' && (
                    <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-400 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>✅ <strong>NIT50 applied</strong> — 50% OFF on PS5 stations</span>
                      </p>
                    </div>
                  )}
                  {appliedCoupons['ps5'] === 'ALMA50' && (
                    <div className="p-2 bg-emerald-900/20 border border-emerald-500/20 rounded-lg">
                      <p className="text-sm text-emerald-300">
                        ✅ <strong>ALMA50 applied</strong> — 50% OFF on PS5 stations (ALMA users only, verification required)
                      </p>
                    </div>
                  )}
                  {appliedCoupons['all'] && (
                    <div className="p-3 bg-violet-900/30 border border-violet-500/30 rounded-lg">
                      <p className="text-sm text-violet-300 flex items-start gap-2">
                        <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>✅ <strong>{appliedCoupons['all']}</strong> applied globally</span>
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

                  {Object.keys(discountBreakdown).length > 0 && (
                    <>
                      <div className="border border-white/10 rounded-lg p-3 bg-black/10">
                        <Label className="text-xs font-semibold text-green-400 uppercase tracking-wider block mb-1">Discount Breakdown</Label>
                        {Object.entries(discountBreakdown).map(([key, val]) => {
                          // Format for NIT99: from total hourly rate of 8ball stations to 99 each
                          if (key.startsWith('8ball')) {
                            const count = stations.filter(s => selectedStations.includes(s.id) && s.type === '8ball').length;
                            const totalRate = stations.filter(s => selectedStations.includes(s.id) && s.type === '8ball')
                              .reduce((sum, s) => sum + s.hourly_rate, 0);
                            return (
                              <p key={key} className="text-green-400 text-sm">
                                {key}: ₹{totalRate} → ₹{99 * count} for {count} table{count > 1 ? 's' : ''}
                              </p>
                            );
                          }
                          if (key.startsWith('ps5')) {
                            const count = stations.filter(s => selectedStations.includes(s.id) && s.type === 'ps5').length;
                            const totalRate = stations.filter(s => selectedStations.includes(s.id) && s.type === 'ps5')
                              .reduce((sum, s) => sum + s.hourly_rate, 0);
                            const half = totalRate / 2;
                            return (
                              <p key={key} className="text-green-400 text-sm">
                                {key}: ₹{totalRate} → ₹{half} for {count} console{count > 1 ? 's' : ''}
                              </p>
                            );
                          }
                          // Fallback to generic amount
                          return (
                            <p key={key} className="text-green-400 text-sm">
                              {key}: ₹{val.toFixed(2)}
                            </p>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {discount > 0 && (
                    <div className="flex justify-between items-center">
                      <Label className="text-sm text-green-400">Total Discount</Label>
                      <span className="text-sm text-green-400">-₹{discount.toFixed(2)}</span>
                    </div>
                  )}

                  <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold text-gray-100">Total Amount</Label>
                    <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">
                      ₹{finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={handleBookingSubmit}
              disabled={!selectedSlot || selectedStations.length === 0 || !customerNumber || loading}
              className="w-full rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90 text-white border-0 transition-all duration-150 active:scale-[.99] shadow-xl shadow-cuephoria-lightpurple/20"
              size="lg"
            >
              {loading ? 'Creating Booking...' : 'Confirm Booking'}
            </Button>

            <p className="text-xs text-gray-400 text-center">Payment will be collected at the venue</p>
          </CardContent>
        </Card>
      </div>

     {/* ==== TODAY'S BOOKINGS (grouped by TIME; expandable) ==== */}
<div className="mt-10">
  <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-xl shadow-xl">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-white flex items-center gap-2">
        <Clock className="h-5 w-5 text-cuechia-lightpurple" />
        Today’s Bookings
      </CardTitle>
      <span className="text-xs text-gray-300 rounded-full border border-white/10 px-2 py-0.5">
        {todayRows.length} total
      </span>
    </CardHeader>

    <CardContent className="space-y-3">
      {todayLoading ? (
        <div className="h-12 rounded-md bg-white/5 animate-pulse" />
      ) : groupedByTime.length === 0 ? (
        <div className="text-sm text-gray-400">No bookings.</div>
      ) : (
        groupedByTime.map(([timeLabel, rows]) => (
          <details key={timeLabel} className="group rounded-xl border border-white/10 bg-black/30 open:bg-black/40">
            <summary className="list-none cursor-pointer select-none px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-200">
                <Clock className="h-4 w-4 text-cuechia-lightpurple" />
                <span className="font-medium">{timeLabel}</span>
              </div>
              <span className="text-xs text-gray-300 rounded-full border border-white/10 px-2 py-0.5">
                {rows.length} booking{rows.length !== 1 ? 's' : ''}
              </span>
            </summary>

            <div className="px-3 sm:px-4 pb-3 overflow-x-auto">
              <table className="min-w-[520px] w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="py-2 pr-3 font-medium">Customer</th>
                    <th className="py-2 pr-3 font-medium">Station</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-t border-white/10">
                      <td className="py-2 pr-3">
                        <div className="text-gray-100">{row.customerName}</div>
                        <div className="text-xs text-gray-400">{row.customerPhone}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge className="bg-white/5 border-white/10 text-gray-200">{row.stationName}</Badge>
                      </td>
                      <td className="py-2">{statusChip(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))
      )}
    </CardContent>
  </Card>
</div>

{/* Footer */}
<footer className="py-10 px-4 sm:px-6 md:px-8 border-t border-white/10 backdrop-blur-md bg-black/30 relative z-10">
  <div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col md:flex-row justify-between items-center">
      <div className="flex items-center mb-4 md:mb-0">
        <img src="/lovable-uploads/61f60a_8-logo.png" alt="Cuechia Logo" className="h-8 mr-3" />
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Cuechia. All rights reserved.</p>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center text-gray-400 text-sm">
          <Clock className="h-4 w-4 text-gray-400 mr-1.5" />
          <span>Book anytime, anywhere</span>
        </div>
      </div>
    </div>

    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
      <div className="flex flex-wrap justify-center md:justify-start gap-6">
        <button onClick={() => setLegalDialogType('terms') || setShowLegalDialog(true)} className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1">
          Terms & Conditions
        </button>
        <button onClick={() => setLegalDialogType('privacy') || setShowLegalDialog(true)} className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1">
          Privacy Policy
        </button>
        <button onClick={() => setLegalDialogType('contact') || setShowLegalDialog(true)} className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1">
          Contact Us
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <Phone className="h-4 w-4" />
          <a href="tel:+918637625155" className="hover:text-white">+91 8637 625 155</a>
        </div>
        <div className="flex items-center gap-1">
          <Mail className="h-4 w-4" />
          <a href="mailto:contact@cuechia.in" className="hover:text-white">contact@cuechia.in</a>
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
