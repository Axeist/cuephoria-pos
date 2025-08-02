import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Timer, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TodaysBooking {
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

export const TodaysBookings: React.FC = () => {
  const [bookings, setBookings] = useState<TodaysBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysBookings();

    // Set up real-time subscription
    const channel = supabase
      .channel('todays-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchTodaysBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTodaysBookings = async () => {
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
        .eq('booking_date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching today\'s bookings:', error);
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

  const getBookingStats = () => {
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const inProgress = bookings.filter(b => b.status === 'in-progress').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    
    return { confirmed, inProgress, completed, total: bookings.length };
  };

  const stats = getBookingStats();

  if (loading) {
    return (
      <Card className="bg-black/20 backdrop-blur-md border-gray-800/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/3"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/20 backdrop-blur-md border-gray-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Calendar className="h-5 w-5 text-cuephoria-blue" />
          Today's Gaming Sessions
        </CardTitle>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Confirmed: {stats.confirmed}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-400">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>In Progress: {stats.inProgress}</span>
          </div>
          <div className="flex items-center gap-1 text-purple-400">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>Completed: {stats.completed}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Users className="h-4 w-4" />
            <span>Total: {stats.total}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No bookings for today yet</p>
            <p className="text-sm text-gray-500 mt-1">New bookings will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-purple/20 flex items-center justify-center">
                    {booking.stations.type === 'ps5' ? 
                      <Gamepad2 className="h-4 w-4 text-cuephoria-purple" /> : 
                      <Timer className="h-4 w-4 text-green-400" />
                    }
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white truncate">{booking.customers.name}</p>
                      <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="truncate">{booking.stations.name}</span>
                      <span className="whitespace-nowrap">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-cuephoria-purple">₹{booking.final_price}</p>
                  <p className="text-xs text-gray-500">#{booking.id.slice(0, 6)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};