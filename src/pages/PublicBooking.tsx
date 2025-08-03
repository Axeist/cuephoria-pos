import React, { useState, useEffect } from 'react';
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
  CalendarIcon, Clock, MapPin, Phone, Mail, User, Gamepad2, Timer, Sparkles, Star, Zap,
  Percent, CheckCircle, AlertTriangle, Lock
} from 'lucide-react';
import { format } from 'date-fns';
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

  // NEW: only show name/email after Search is pressed
  const [hasSearched, setHasSearched] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<'terms' | 'privacy' | 'contact'>('terms');

  // Fetch stations on component mount
  useEffect(() => { fetchStations(); }, []);

  // Real-time updates for bookings
  useEffect(() => {
    const channel = supabase
      .channel('booking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
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
      const stationId = selectedStations[0];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_date: dateStr, p_station_id: stationId, p_slot_duration: 60
      });
      if (error) throw error;
      setAvailableSlots(data || []);
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
        toast.success(Welcome back, ${data.name}! 🎮);
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
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => setSelectedSlot(slot);

  const handleCouponApply = () => {
    const upper = couponCode.toUpperCase();
    if (upper === 'CUEPHORIA25' || upper === 'NIT50') {
      setAppliedCoupon(upper);
      toast.success(Coupon ${upper} applied successfully! 🎉);
    } else {
      toast.error('Invalid coupon code');
    }
  };

  const handleCouponSelect = (coupon: string) => {
    setCouponCode(coupon);
    setAppliedCoupon(coupon);
    toast.success(Coupon ${coupon} applied successfully! 🎉);
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0 || !selectedSlot) return 0;
    const selectedObjs = stations.filter(s => selectedStations.includes(s.id));
    return selectedObjs.reduce((sum, s) => sum + s.hourly_rate, 0);
  };
  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    if (!appliedCoupon || original === 0) return 0;
    if (appliedCoupon === 'CUEPHORIA25') return original * 0.25;
    if (appliedCoupon === 'NIT50') return original * 0.5;
    return 0;
  };
  const calculateFinalPrice = () => calculateOriginalPrice() - calculateDiscount();

  const handleLegalClick = (type: 'terms' | 'privacy' | 'contact') => {
    setLegalDialogType(type);
    setShowLegalDialog(true);
  };

  const isCustomerInfoComplete = () => {
    // Must press Search first, then provide name (for new customers)
    return hasSearched && customerNumber.trim() && customerInfo.name.trim();
  };
  const isStationSelectionAvailable = () => isCustomerInfoComplete();
  const isTimeSelectionAvailable = () => isStationSelectionAvailable() && selectedStations.length > 0;

  const handleBookingSubmit = async () => {
    if (!customerNumber.trim()) { toast.error('Please complete customer information first'); return; }
    if (selectedStations.length === 0) { toast.error('Please select at least one station'); return; }
    if (!selectedSlot) { toast.error('Please select a time slot'); return; }
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

      const bookings = selectedStations.map(stationId => ({
        station_id: stationId,
        customer_id: customerId!,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        duration: 60,
        status: 'confirmed',
        original_price: originalPrice,
        discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
        final_price: finalPrice,
        coupon_code: appliedCoupon || null
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
        startTime: new Date(2000-01-01T${selectedSlot.start_time}).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        endTime: new Date(2000-01-01T${selectedSlot.end_time}).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        totalAmount: finalPrice,
        couponCode: appliedCoupon || undefined,
        discountAmount: discount > 0 ? discount : undefined
      };

      setBookingConfirmationData(confirmationData);
      setShowConfirmationDialog(true);

      // Reset form
      setSelectedStations([]);
      setSelectedSlot(null);
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

  const today = new Date();
  const originalPrice = calculateOriginalPrice();
  const discount = calculateDiscount();
  const finalPrice = calculateFinalPrice();

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 to-black overflow-hidden">
      <CouponPromotionalPopup onCouponSelect={handleCouponSelect} />

      {/* background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cuephoria-purple rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cuephoria-lightpurple rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-cuephoria-blue rounded-full animate-pulse opacity-50" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-cuephoria-purple/30 rounded-full animate-pulse opacity-30" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 right-1/2 w-2 h-2 bg-cuephoria-lightpurple/40 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Header */}
      <header className="py-8 px-4 sm:px-6 md:px-8 animate-fade-in relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 animate-float">
              <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria Logo" className="h-24 shadow-lg shadow-cuephoria-purple/30" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white font-heading bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple via-cuephoria-lightpurple to-cuephoria-blue animate-text-gradient">
              Book Your Gaming Session
            </h1>
            <p className="mt-2 text-xl text-gray-300 max-w-2xl text-center">Reserve PlayStation 5 or Pool Table sessions at Cuephoria</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <div className="flex items-center bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-cuephoria-purple/20">
                <Sparkles className="h-4 w-4 text-cuephoria-purple mr-2" /><span className="text-sm text-gray-300">Premium Equipment</span>
              </div>
              <div className="flex items-center bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-cuephoria-blue/20">
                <Star className="h-4 w-4 text-cuephoria-blue mr-2" /><span className="text-sm text-gray-300">Best Gaming Experience</span>
              </div>
              <div className="flex items-center bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-cuephoria-lightpurple/20">
                <Zap className="h-4 w-4 text-cuephoria-lightpurple mr-2" /><span className="text-sm text-gray-300">Instant Booking</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-12 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1 */}
            <Card className="bg-black/20 backdrop-blur-md border-gray-800/50 animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-purple/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-cuephoria-purple" />
                  </div>
                  Step 1: Customer Information
                  {isCustomerInfoComplete() && <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-cuephoria-purple/10 border border-cuephoria-purple/20 rounded-lg p-3">
                  <p className="text-sm text-cuephoria-purple font-medium flex items-center gap-2">
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
                      // Hide fields again until Search is pressed
                      setHasSearched(false);
                      setIsReturningCustomer(false);
                      setCustomerInfo(prev => ({ ...prev, name: '', email: '', phone: val }));
                    }}
                    placeholder="Enter phone number"
                    className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400 flex-1"
                  />
                  <Button onClick={searchCustomer} disabled={searchingCustomer} className="bg-cuephoria-purple hover:bg-cuephoria-purple/90">
                    {searchingCustomer ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Name/Email appear ONLY after Search */}
                {hasSearched && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-200">
                        Full Name * {isReturningCustomer && <CheckCircle className="inline h-4 w-4 text-green-400 ml-1" />}
                      </Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400"
                        disabled={isReturningCustomer}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-200">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email address"
                        className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400"
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
            <Card className={cn(
              "bg-black/20 backdrop-blur-md border-gray-800/50 animate-scale-in transition-all duration-300",
              !isStationSelectionAvailable() && "opacity-50 pointer-events-none"
            )} style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-blue/20 flex items-center justify-center">
                    {!isStationSelectionAvailable() ? <Lock className="h-4 w-4 text-gray-500" /> : <MapPin className="h-4 w-4 text-cuephoria-blue" />}
                  </div>
                  Step 2: Select Gaming Stations
                  {isStationSelectionAvailable() && selectedStations.length > 0 && <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isStationSelectionAvailable() ? (
                  <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
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
            <Card className={cn(
              "bg-black/20 backdrop-blur-md border-gray-800/50 animate-scale-in transition-all duration-300",
              !isTimeSelectionAvailable() && "opacity-50 pointer-events-none"
            )} style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-lightpurple/20 flex items-center justify-center">
                    {!isTimeSelectionAvailable() ? <Lock className="h-4 w-4 text-gray-500" /> : <CalendarIcon className="h-4 w-4 text-cuephoria-lightpurple" />}
                  </div>
                  Step 3: Choose Date & Time
                  {isTimeSelectionAvailable() && selectedSlot && <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isTimeSelectionAvailable() ? (
                  <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Select stations to unlock date and time selection</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-base font-medium text-gray-200">Choose Date</Label>
                      <div className="mt-2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          disabled={(date) => date < today}
                          className={cn("rounded-md border bg-black/30 border-gray-700 pointer-events-auto")}
                        />
                      </div>
                    </div>

                    {selectedStations.length > 0 && (
                      <div>
                        <Label className="text-base font-medium text-gray-200">Available Time Slots</Label>
                        <div className="mt-2">
                          <TimeSlotPicker
                            slots={availableSlots}
                            selectedSlot={selectedSlot}
                            onSlotSelect={handleSlotSelect}
                            loading={slotsLoading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-black/30 backdrop-blur-md border-gray-800/50 animate-scale-in" style={{ animationDelay: '300ms' }}>
              <CardHeader><CardTitle className="text-white">Booking Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selectedStations.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-200">Selected Stations</Label>
                    <div className="mt-1 space-y-1">
                      {selectedStations.map(stationId => {
                        const station = stations.find(s => s.id === stationId);
                        return station ? (
                          <div key={stationId} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-cuephoria-purple/20 flex items-center justify-center">
                              {station.type === 'ps5' ? <Gamepad2 className="h-3 w-3 text-cuephoria-purple" /> : <Timer className="h-3 w-3 text-green-400" />}
                            </div>
                            <Badge variant="secondary" className="bg-gray-700/50 text-gray-200 border-gray-600">{station.name}</Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {selectedDate && (
                  <div>
                    <Label className="text-sm font-medium text-gray-200">Date</Label>
                    <p className="text-sm text-gray-300">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <Label className="text-sm font-medium text-gray-200">Time</Label>
                    <p className="text-sm text-gray-300">
                      {new Date(2000-01-01T${selectedSlot.start_time}).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {' - '}
                      {new Date(2000-01-01T${selectedSlot.end_time}).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                )}

                {/* Coupon */}
                <div>
                  <Label className="text-sm font-medium text-gray-200">Coupon Code</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400 flex-1"
                    />
                    <Button onClick={handleCouponApply} size="sm" className="bg-green-600 hover:bg-green-700">Apply</Button>
                  </div>
                  {appliedCoupon && (
                    <div className="mt-2 space-y-2">
                      <div className="p-2 bg-green-900/30 border border-green-500/30 rounded">
                        <p className="text-sm text-green-400 flex items-center gap-2">
                          <Percent className="h-4 w-4" /> Coupon {appliedCoupon} applied!
                        </p>
                      </div>
                      {appliedCoupon === 'NIT50' && (
                        <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded">
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
                    <Separator className="bg-gray-700" />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-200">Subtotal</Label>
                        <span className="text-sm text-gray-300">₹{originalPrice}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between items-center">
                          <Label className="text-sm text-green-400">Discount ({appliedCoupon})</Label>
                          <span className="text-sm text-green-400">-₹{discount}</span>
                        </div>
                      )}
                      <Separator className="bg-gray-700" />
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-medium text-gray-200">Total Amount</Label>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">₹{finalPrice}</span>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={handleBookingSubmit}
                  disabled={!selectedSlot || selectedStations.length === 0 || !customerNumber || loading}
                  className="w-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90 text-white border-0"
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
      <footer className="py-8 px-4 sm:px-6 md:px-8 border-t border-gray-800/50 mt-6 backdrop-blur-md bg-black/30 relative z-10">
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
              <button onClick={() => handleLegalClick('terms')} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
                Terms & Conditions
              </button>
              <button onClick={() => handleLegalClick('privacy')} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
                Privacy Policy
              </button>
              <button onClick={() => handleLegalClick('contact')} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
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
