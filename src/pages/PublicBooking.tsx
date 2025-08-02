import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StationSelector } from '@/components/booking/StationSelector';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { CalendarIcon, Clock, MapPin, Phone, Mail, User, Gamepad2, Timer, Sparkles, Star, Zap } from 'lucide-react';
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
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export default function PublicBooking() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Fetch stations on component mount
  useEffect(() => {
    fetchStations();
  }, []);

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
      // For simplicity, get slots for the first selected station
      // In a real app, you might want to show common available slots across all selected stations
      const stationId = selectedStations[0];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .rpc('get_available_slots', {
          p_date: dateStr,
          p_station_id: stationId,
          p_slot_duration: 60
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

  const handleStationToggle = (stationId: string) => {
    setSelectedStations(prev => 
      prev.includes(stationId)
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
    setSelectedSlot(null); // Reset slot when stations change
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const calculateTotalPrice = () => {
    if (selectedStations.length === 0 || !selectedSlot) return 0;
    
    const selectedStationObjects = stations.filter(s => selectedStations.includes(s.id));
    const totalHourlyRate = selectedStationObjects.reduce((sum, station) => sum + station.hourly_rate, 0);
    
    return totalHourlyRate; // For 1-hour slots
  };

  const handleBookingSubmit = async () => {
    // Validation
    if (selectedStations.length === 0) {
      toast.error('Please select at least one station');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }
    if (!customerInfo.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      // First, create or find customer
      let customerId;
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerInfo.phone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
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

      // Create bookings for each selected station
      const bookings = selectedStations.map(stationId => ({
        station_id: stationId,
        customer_id: customerId,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        duration: 60, // 1 hour slots
        status: 'confirmed',
        notes: customerInfo.notes || null,
        final_price: calculateTotalPrice()
      }));

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert(bookings);

      if (bookingError) throw bookingError;

      toast.success('Booking confirmed successfully!');
      
      // Reset form
      setSelectedStations([]);
      setSelectedSlot(null);
      setCustomerInfo({ name: '', phone: '', email: '', notes: '' });
      setAvailableSlots([]);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const totalPrice = calculateTotalPrice();

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 to-black overflow-hidden">
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cuephoria-purple rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-cuephoria-lightpurple rounded-full animate-pulse opacity-40" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-cuephoria-blue rounded-full animate-pulse opacity-50" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-cuephoria-purple/30 rounded-full animate-pulse opacity-30" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-1/3 right-1/2 w-2 h-2 bg-cuephoria-lightpurple/40 rounded-full animate-pulse opacity-40" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Header with logo */}
      <header className="py-8 px-4 sm:px-6 md:px-8 animate-fade-in relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6 animate-float">
              <img 
                src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" 
                alt="Cuephoria Logo" 
                className="h-24 shadow-lg shadow-cuephoria-purple/30"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white font-heading bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple via-cuephoria-lightpurple to-cuephoria-blue animate-text-gradient">
              Book Your Gaming Session
            </h1>
            <p className="mt-2 text-xl text-gray-300 max-w-2xl text-center">
              Reserve PlayStation 5 or Pool Table sessions at Cuephoria
            </p>
            
            {/* Feature highlights */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <div className="flex items-center bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-cuephoria-purple/20">
                <Sparkles className="h-4 w-4 text-cuephoria-purple mr-2" />
                <span className="text-sm text-gray-300">Premium Equipment</span>
              </div>
              <div className="flex items-center bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-cuephoria-blue/20">
                <Star className="h-4 w-4 text-cuephoria-blue mr-2" />
                <span className="text-sm text-gray-300">Best Gaming Experience</span>
              </div>
              <div className="flex items-center bg-black/20 backdrop-blur-md rounded-full px-4 py-2 border border-cuephoria-lightpurple/20">
                <Zap className="h-4 w-4 text-cuephoria-lightpurple mr-2" />
                <span className="text-sm text-gray-300">Instant Booking</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-12 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Station Selection */}
            <Card className="bg-black/20 backdrop-blur-md border-gray-800/50 animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-purple/20 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-cuephoria-purple" />
                  </div>
                  Select Gaming Stations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StationSelector
                  stations={stations}
                  selectedStations={selectedStations}
                  onStationToggle={handleStationToggle}
                />
              </CardContent>
            </Card>

            {/* Date & Time Selection */}
            <Card className="bg-black/20 backdrop-blur-md border-gray-800/50 animate-scale-in" style={{animationDelay: '100ms'}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-blue/20 flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4 text-cuephoria-blue" />
                  </div>
                  Select Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="bg-black/20 backdrop-blur-md border-gray-800/50 animate-scale-in" style={{animationDelay: '200ms'}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-lightpurple/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-cuephoria-lightpurple" />
                  </div>
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-200">Full Name *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-gray-200">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400"
                    />
                  </div>
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
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="text-gray-200">Special Requests (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={customerInfo.notes}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special requests or notes..."
                    rows={3}
                    className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-black/30 backdrop-blur-md border-gray-800/50 animate-scale-in" style={{animationDelay: '300ms'}}>
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
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
                              {station.type === 'ps5' ? 
                                <Gamepad2 className="h-3 w-3 text-cuephoria-purple" /> : 
                                <Timer className="h-3 w-3 text-green-400" />
                              }
                            </div>
                            <Badge variant="secondary" className="bg-gray-700/50 text-gray-200 border-gray-600">
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
                    <Label className="text-sm font-medium text-gray-200">Date</Label>
                    <p className="text-sm text-gray-300">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <Label className="text-sm font-medium text-gray-200">Time</Label>
                    <p className="text-sm text-gray-300">
                      {new Date(`2000-01-01T${selectedSlot.start_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })} - {new Date(`2000-01-01T${selectedSlot.end_time}`).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                )}

                {totalPrice > 0 && (
                  <>
                    <Separator className="bg-gray-700" />
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-medium text-gray-200">Total Amount</Label>
                      <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">₹{totalPrice}</span>
                    </div>
                  </>
                )}

                <Button 
                  onClick={handleBookingSubmit}
                  disabled={!selectedSlot || selectedStations.length === 0 || loading}
                  className="w-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90 text-white border-0"
                  size="lg"
                >
                  {loading ? 'Creating Booking...' : 'Confirm Booking'}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Payment will be collected at the venue
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 md:px-8 border-t border-gray-800/50 mt-6 backdrop-blur-md bg-black/30 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria Logo" 
              className="h-8 mr-3" 
            />
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Cuephoria. All rights reserved.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-400 text-sm">
              <Clock className="h-4 w-4 text-gray-400 mr-1.5" />
              <span>Book anytime, anywhere</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}