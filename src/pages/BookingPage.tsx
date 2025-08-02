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
import { CalendarIcon, Clock, MapPin, Phone, Mail, User } from 'lucide-react';
import { format } from 'date-fns';

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

export default function BookingPage() {
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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Book Your Gaming Session</h1>
        <p className="text-muted-foreground">
          Reserve PlayStation 5 or Pool Table sessions at Cuephoria
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Station Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Select Stations
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base font-medium">Choose Date</Label>
                <div className="mt-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date < today}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {selectedStations.length > 0 && (
                <div>
                  <Label className="text-base font-medium">Available Time Slots</Label>
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
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                />
              </div>
              <div>
                <Label htmlFor="notes">Special Requests (Optional)</Label>
                <Textarea
                  id="notes"
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special requests or notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedStations.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Selected Stations</Label>
                  <div className="mt-1 space-y-1">
                    {selectedStations.map(stationId => {
                      const station = stations.find(s => s.id === stationId);
                      return station ? (
                        <Badge key={stationId} variant="secondary" className="mr-1">
                          {station.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {selectedDate && (
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {selectedSlot && (
                <div>
                  <Label className="text-sm font-medium">Time</Label>
                  <p className="text-sm text-muted-foreground">
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
                  <Separator />
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-medium">Total Amount</Label>
                    <span className="text-xl font-bold text-primary">₹{totalPrice}</span>
                  </div>
                </>
              )}

              <Button 
                onClick={handleBookingSubmit}
                disabled={!selectedSlot || selectedStations.length === 0 || loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Creating Booking...' : 'Confirm Booking'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Payment will be collected at the venue
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}