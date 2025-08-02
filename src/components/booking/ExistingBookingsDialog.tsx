import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, MapPin, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  final_price: number;
  status: string;
  stations: {
    name: string;
    type: string;
  };
  customers: {
    name: string;
    phone: string;
  };
}

interface ExistingBookingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
}

export const ExistingBookingsDialog: React.FC<ExistingBookingsDialogProps> = ({
  isOpen,
  onClose,
  phoneNumber
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    if (isOpen && phoneNumber) {
      fetchTodaysBookings();
    }
  }, [isOpen, phoneNumber]);

  const fetchTodaysBookings = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // First, get customer by phone number
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phoneNumber)
        .single();

      if (customerError || !customer) {
        setBookings([]);
        setCustomerName('');
        return;
      }

      setCustomerName(customer.name);

      // Then get today's bookings for this customer
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          duration,
          final_price,
          status,
          stations (
            name,
            type
          ),
          customers (
            name,
            phone
          )
        `)
        .eq('customer_id', customer.id)
        .eq('booking_date', today)
        .order('start_time', { ascending: true });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        toast.error('Failed to fetch bookings');
        return;
      }

      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getStationTypeIcon = (type: string) => {
    return type === 'ps5' ? '🎮' : '🎱';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-400" />
            Today's Bookings
            {customerName && (
              <span className="text-purple-400 font-normal">
                - {customerName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              <span className="ml-2 text-gray-300">Loading bookings...</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No bookings found</p>
              <p className="text-gray-500 text-sm">
                {phoneNumber ? 
                  `No bookings found for ${phoneNumber} today` : 
                  'Enter a phone number to search for bookings'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <Card key={booking.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {getStationTypeIcon(booking.stations.type)}
                        </span>
                        <div>
                          <h3 className="text-white font-medium">
                            {booking.stations.name}
                          </h3>
                          <p className="text-gray-400 text-sm capitalize">
                            {booking.stations.type === 'ps5' ? 'PlayStation 5' : '8-Ball Pool'}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="h-4 w-4 text-purple-400" />
                        <span>{booking.start_time} - {booking.end_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <span>{booking.duration} hour{booking.duration > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-green-400 font-medium">
                          ₹{booking.final_price}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="h-4 w-4 text-purple-400" />
                        <span>{booking.customers.phone}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};