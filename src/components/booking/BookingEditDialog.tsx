import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CalendarIcon, Clock, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball';
  hourly_rate: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Booking {
  id?: string;
  station_id: string;
  customer_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  notes?: string;
  final_price: number;
}

interface BookingEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  onSave: () => void;
}

export const BookingEditDialog: React.FC<BookingEditDialogProps> = ({
  open,
  onOpenChange,
  booking,
  onSave
}) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    station_id: '',
    customer_id: '',
    start_time: '',
    end_time: '',
    duration: 60,
    status: 'confirmed',
    notes: '',
    final_price: 0
  });
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);

  const isEdit = !!booking;

  useEffect(() => {
    if (open) {
      fetchStations();
      fetchCustomers();
    }
  }, [open]);

  useEffect(() => {
    if (booking) {
      setFormData({
        station_id: booking.station_id,
        customer_id: booking.customer_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        duration: booking.duration,
        status: booking.status,
        notes: booking.notes || '',
        final_price: booking.final_price
      });
      setSelectedDate(new Date(booking.booking_date));
    } else {
      setFormData({
        station_id: '',
        customer_id: '',
        start_time: '',
        end_time: '',
        duration: 60,
        status: 'confirmed',
        notes: '',
        final_price: 0
      });
      setSelectedDate(new Date());
    }
  }, [booking]);

  const fetchStations = async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('id, name, type, hourly_rate')
        .order('name');

      if (error) throw error;
      setStations((data || []).map(station => ({
        ...station,
        type: station.type as 'ps5' | '8ball'
      })));
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setCustomersLoading(false);
    }
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const calculatePrice = (stationId: string, duration: number) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return 0;
    
    return (station.hourly_rate * duration) / 60;
  };

  useEffect(() => {
    if (formData.start_time && formData.duration) {
      const endTime = calculateEndTime(formData.start_time, formData.duration);
      setFormData(prev => ({ ...prev, end_time: endTime }));
    }
  }, [formData.start_time, formData.duration]);

  useEffect(() => {
    if (formData.station_id && formData.duration) {
      const price = calculatePrice(formData.station_id, formData.duration);
      setFormData(prev => ({ ...prev, final_price: price }));
    }
  }, [formData.station_id, formData.duration, stations]);

  const handleSave = async () => {
    if (!formData.station_id || !formData.customer_id || !formData.start_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        station_id: formData.station_id,
        customer_id: formData.customer_id,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration: formData.duration,
        status: formData.status,
        notes: formData.notes || null,
        final_price: formData.final_price
      };

      if (isEdit && booking) {
        const { error } = await supabase
          .from('bookings')
          .update(bookingData)
          .eq('id', booking.id);

        if (error) throw error;
        toast.success('Booking updated successfully');
      } else {
        const { error } = await supabase
          .from('bookings')
          .insert(bookingData);

        if (error) throw error;
        toast.success('Booking created successfully');
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving booking:', error);
      toast.error('Failed to save booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <CalendarIcon className="h-5 w-5 text-cuephoria-purple" />
            {isEdit ? 'Edit Booking' : 'Create New Booking'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="text-white">Booking Date</Label>
            <div className="border rounded-lg p-3 bg-black/20">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date < new Date()}
                className={cn("w-full pointer-events-auto")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Station Selection */}
            <div className="space-y-2">
              <Label className="text-white">Station</Label>
              <Select value={formData.station_id} onValueChange={(value) => setFormData(prev => ({ ...prev, station_id: value }))}>
                <SelectTrigger className="bg-black/30 border-gray-700 text-white">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {station.name} (₹{station.hourly_rate}/hr)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label className="text-white">Customer</Label>
              <Select value={formData.customer_id} onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}>
                <SelectTrigger className="bg-black/30 border-gray-700 text-white">
                  <SelectValue placeholder={customersLoading ? "Loading..." : "Select customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {customer.name} - {customer.phone}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start Time */}
            <div className="space-y-2">
              <Label className="text-white">Start Time</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="bg-black/30 border-gray-700 text-white"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-white">Duration (minutes)</Label>
              <Select value={formData.duration.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}>
                <SelectTrigger className="bg-black/30 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* End Time (calculated) */}
            <div className="space-y-2">
              <Label className="text-white">End Time</Label>
              <Input
                type="time"
                value={formData.end_time}
                readOnly
                className="bg-gray-800 border-gray-700 text-gray-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-white">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="bg-black/30 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label className="text-white">Final Price</Label>
              <Input
                type="number"
                value={formData.final_price}
                onChange={(e) => setFormData(prev => ({ ...prev, final_price: parseFloat(e.target.value) || 0 }))}
                className="bg-black/30 border-gray-700 text-white"
                step="0.01"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-white">Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
              className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Booking' : 'Create Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};