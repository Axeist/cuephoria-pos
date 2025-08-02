import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Clock, MapPin, User, Calendar, Gamepad2, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  final_price: number;
  stations: {
    name: string;
    type: string;
  };
  customers: {
    name: string;
    phone: string;
  };
}

export const ExistingBookingSearch: React.FC = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const searchBookings = async () => {
    if (!mobileNumber.trim()) {
      toast.error('Please enter a mobile number');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          final_price,
          stations!inner(name, type),
          customers!inner(name, phone)
        `)
        .eq('customers.phone', mobileNumber)
        .eq('booking_date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setBookings(data || []);
      setShowDialog(true);

      if (!data || data.length === 0) {
        toast.info('No bookings found for today with this mobile number');
      }
    } catch (error) {
      console.error('Error searching bookings:', error);
      toast.error('Failed to search bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'no-show':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <>
      <Card className="bg-black/20 backdrop-blur-md border-gray-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            <Search className="h-5 w-5 text-cuephoria-purple" />
            Find Your Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="Enter your mobile number"
              className="bg-black/30 border-gray-700 text-white placeholder:text-gray-400 flex-1"
            />
            <Button
              onClick={searchBookings}
              disabled={loading}
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/90 px-6"
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Search for your existing bookings for today
          </p>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-md border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Your Bookings for Today
            </DialogTitle>
          </DialogHeader>
          
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No bookings found for today</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {bookings.map((booking) => (
                <Card key={booking.id} className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cuephoria-purple/20 flex items-center justify-center">
                          {booking.stations.type === 'ps5' ? 
                            <Gamepad2 className="h-4 w-4 text-cuephoria-purple" /> : 
                            <Timer className="h-4 w-4 text-green-400" />
                          }
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{booking.stations.name}</h3>
                          <p className="text-sm text-gray-400">Booking #{booking.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status.replace('-', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{booking.customers.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{format(new Date(booking.booking_date), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                      </div>
                    </div>

                    <Separator className="my-3 bg-gray-700" />

                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Amount:</span>
                      <span className="text-lg font-semibold text-cuephoria-purple">₹{booking.final_price}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};