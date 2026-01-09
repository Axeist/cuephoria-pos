import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Navigation,
  Edit,
  Star,
  Gamepad2,
  Zap,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerSession, formatDate, formatTime, getCountdown, timeAgo } from '@/utils/customerAuth';
import { toast } from 'sonner';
import BottomNav from '@/components/customer/BottomNav';
import '@/styles/customer-animations.css';

interface Booking {
  id: string;
  station_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  final_price: number | null;
  original_price: number | null;
  created_at: string;
}

export default function CustomerBookings() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(getCustomerSession());
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();

  useEffect(() => {
    if (!customer) {
      navigate('/customer/login');
      return;
    }
    loadBookings();
  }, [customer, navigate, dateFilter, customDateFrom, customDateTo]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return {
          from: today.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          from: yesterday.toISOString().split('T')[0],
          to: yesterday.toISOString().split('T')[0]
        };
      }
      
      case 'this_week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          from: weekStart.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      }
      
      case 'last_week': {
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return {
          from: lastWeekStart.toISOString().split('T')[0],
          to: lastWeekEnd.toISOString().split('T')[0]
        };
      }
      
      case 'this_month':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      
      case 'last_month': {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          from: lastMonthStart.toISOString().split('T')[0],
          to: lastMonthEnd.toISOString().split('T')[0]
        };
      }
      
      case 'this_year':
        return {
          from: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      
      case 'last_year':
        return {
          from: new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
          to: new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
        };
      
      case 'custom':
        if (customDateFrom && customDateTo) {
          return {
            from: customDateFrom.toISOString().split('T')[0],
            to: customDateTo.toISOString().split('T')[0]
          };
        }
        return null;
      
      default: // 'all'
        return null;
    }
  };

  const loadBookings = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      const dateRange = getDateRange();
      
      // Build query
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          duration,
          status,
          final_price,
          original_price,
          created_at,
          stations!inner (name)
        `)
        .eq('customer_id', customer.id);

      // Apply date filter if not 'all'
      if (dateRange) {
        query = query
          .gte('booking_date', dateRange.from)
          .lte('booking_date', dateRange.to);
      }

      const { data: allBookings, error } = await query
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Bookings error:', error);
        throw error;
      }

      if (!allBookings) {
        setUpcomingBookings([]);
        setPastBookings([]);
        setCancelledBookings([]);
        return;
      }

      const now = new Date();
      const upcoming: Booking[] = [];
      const past: Booking[] = [];
      const cancelled: Booking[] = [];

      allBookings.forEach((booking) => {
        const bookingData = {
          ...booking,
          station_name: (booking.stations as any)?.name || 'Unknown Station'
        };

        // If cancelled, add to cancelled list
        if (booking.status === 'cancelled') {
          cancelled.push(bookingData);
          return;
        }

        // Parse booking date and time
        const bookingDate = new Date(booking.booking_date);
        const [startHour, startMinute] = booking.start_time.split(':').map(Number);
        const [endHour, endMinute] = booking.end_time.split(':').map(Number);
        
        const bookingStartTime = new Date(bookingDate);
        bookingStartTime.setHours(startHour, startMinute, 0);
        
        const bookingEndTime = new Date(bookingDate);
        bookingEndTime.setHours(endHour, endMinute, 0);

        // Determine if booking is upcoming, ongoing, or past
        if (now < bookingStartTime) {
          // Future booking - Upcoming
          upcoming.push(bookingData);
        } else if (now >= bookingStartTime && now <= bookingEndTime) {
          // Currently happening - Ongoing (show in upcoming with in-progress status)
          upcoming.push(bookingData);
        } else {
          // Past booking - Completed
          past.push(bookingData);
        }
      });

      // Sort upcoming by date/time (earliest first)
      upcoming.sort((a, b) => {
        const dateCompare = new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });

      setUpcomingBookings(upcoming);
      setPastBookings(past);
      setCancelledBookings(cancelled);

      console.log(`Loaded bookings: ${upcoming.length} upcoming, ${past.length} past, ${cancelled.length} cancelled`);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking cancelled successfully');
      loadBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const getBookingStatus = (booking: Booking) => {
    const now = new Date();
    const bookingDate = new Date(booking.booking_date);
    const [startHour, startMinute] = booking.start_time.split(':').map(Number);
    const [endHour, endMinute] = booking.end_time.split(':').map(Number);
    
    const bookingStartTime = new Date(bookingDate);
    bookingStartTime.setHours(startHour, startMinute, 0);
    
    const bookingEndTime = new Date(bookingDate);
    bookingEndTime.setHours(endHour, endMinute, 0);

    // Check if currently ongoing
    if (now >= bookingStartTime && now <= bookingEndTime) {
      return { label: 'Ongoing', color: 'bg-gradient-to-r from-orange-600 to-red-600 animate-pulse', icon: Zap };
    }

    // Check if completed
    if (now > bookingEndTime) {
      return { label: 'Completed', color: 'bg-gradient-to-r from-green-600 to-teal-600', icon: CheckCircle2 };
    }

    // Otherwise it's upcoming/confirmed
    return { label: 'Confirmed', color: 'bg-gradient-to-r from-blue-600 to-purple-600', icon: CheckCircle2 };
  };

  if (!customer) return null;

  // Calculate insights
  const totalBookings = upcomingBookings.length + pastBookings.length;
  const totalHours = [...upcomingBookings, ...pastBookings].reduce((sum, b) => sum + (b.duration || 0), 0) / 60;
  const totalSpent = [...upcomingBookings, ...pastBookings].reduce((sum, b) => sum + (b.final_price || 0), 0);
  
  // Calculate favorite game
  const gameCount: Record<string, number> = {};
  [...upcomingBookings, ...pastBookings].forEach(b => {
    const game = b.station_name.toLowerCase().includes('8-ball') || b.station_name.toLowerCase().includes('pool') 
      ? '8-Ball Pool' 
      : b.station_name.toLowerCase().includes('ps5') || b.station_name.toLowerCase().includes('playstation')
      ? 'PS5 Gaming'
      : 'Other';
    gameCount[game] = (gameCount[game] || 0) + 1;
  });
  const favoriteGame = Object.entries(gameCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  
  // Calculate favorite time
  const timeSlotCount: Record<string, number> = {};
  [...upcomingBookings, ...pastBookings].forEach(b => {
    const hour = parseInt(b.start_time.split(':')[0]);
    const slot = hour >= 11 && hour < 14 ? 'Morning' 
               : hour >= 14 && hour < 18 ? 'Afternoon'
               : hour >= 18 && hour < 22 ? 'Evening' 
               : 'Night';
    timeSlotCount[slot] = (timeSlotCount[slot] || 0) + 1;
  });
  const favoriteTime = Object.entries(timeSlotCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 pb-20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>
      <div className="relative z-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-900/95 to-purple-900/95 border-b border-purple-500/30 backdrop-blur-xl shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customer/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-wide">Bookings</h1>
              <p className="text-xs text-gray-400">
                {upcomingBookings.length} upcoming • {pastBookings.length} completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Insights */}
      {!loading && totalBookings > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="text-purple-400" />
            Your Booking Insights
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card className="bg-gradient-to-br from-purple-600/90 to-pink-600/90 border-0 shadow-xl backdrop-blur-xl">
              <CardContent className="p-4 text-center">
                <Calendar className="mx-auto mb-2 text-white" size={24} />
                <p className="text-2xl font-bold text-white">{totalBookings}</p>
                <p className="text-xs text-white/90">Total Bookings</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-600/90 to-red-600/90 border-0 shadow-xl backdrop-blur-xl">
              <CardContent className="p-4 text-center">
                <Clock className="mx-auto mb-2 text-white" size={24} />
                <p className="text-2xl font-bold text-white">{Math.floor(totalHours)}</p>
                <p className="text-xs text-white/90">Hours Played</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-600/90 to-teal-600/90 border-0 shadow-xl backdrop-blur-xl">
              <CardContent className="p-4 text-center">
                <Gamepad2 className="mx-auto mb-2 text-white" size={24} />
                <p className="text-sm font-bold text-white">{favoriteGame}</p>
                <p className="text-xs text-white/90">Favorite Game</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-600/90 to-cyan-600/90 border-0 shadow-xl backdrop-blur-xl">
              <CardContent className="p-4 text-center">
                <Zap className="mx-auto mb-2 text-white" size={24} />
                <p className="text-sm font-bold text-white">{favoriteTime}</p>
                <p className="text-xs text-white/90">Favorite Time</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-gray-800/50 border-purple-500/30 text-white">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-purple-500/30">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === 'custom' && (
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-gray-800/50 border-purple-500/30 text-white">
                    <Calendar size={16} className="mr-2" />
                    {customDateFrom ? formatDate(customDateFrom.toISOString().split('T')[0]) : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-purple-500/30">
                  <CalendarComponent
                    mode="single"
                    selected={customDateFrom}
                    onSelect={setCustomDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-gray-400">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-gray-800/50 border-purple-500/30 text-white">
                    <Calendar size={16} className="mr-2" />
                    {customDateTo ? formatDate(customDateTo.toISOString().split('T')[0]) : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800 border-purple-500/30">
                  <CalendarComponent
                    mode="single"
                    selected={customDateTo}
                    onSelect={setCustomDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {dateFilter !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFilter('all');
                setCustomDateFrom(undefined);
                setCustomDateTo(undefined);
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} className="mr-1" />
              Clear Filter
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cuephoria-purple" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-cuephoria-darker">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-cuephoria-purple">
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="data-[state=active]:bg-cuephoria-purple">
                Past ({pastBookings.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-cuephoria-purple">
                Cancelled ({cancelledBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {upcomingBookings.length === 0 ? (
                <Card className="bg-cuephoria-darker border-gray-800">
                  <CardContent className="p-8 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400">No upcoming bookings</p>
                    <Button
                      className="mt-4 bg-cuephoria-purple hover:bg-cuephoria-purple/80"
                      onClick={() => navigate('/public/booking')}
                    >
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                upcomingBookings.map((booking) => {
                  const status = getBookingStatus(booking);
                  const StatusIcon = status.icon;
                  const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);

                  return (
                    <Card key={booking.id} className="bg-gradient-to-br from-gray-800/90 to-purple-900/90 border border-purple-500/40 hover:border-purple-400 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40 transform hover:-translate-y-2 transition-all duration-300 backdrop-blur-xl">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-lg mb-1">{booking.station_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                              <Calendar size={14} className="text-cuephoria-blue" />
                              <span>{formatDate(booking.booking_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                              <Clock size={14} className="text-cuephoria-orange" />
                              <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                              <span className="text-gray-500">({booking.duration} min)</span>
                            </div>
                            {booking.final_price && (
                              <div className="flex items-center gap-2 mt-2">
                                {booking.original_price && booking.original_price > booking.final_price && (
                                  <span className="text-xs line-through text-gray-500">₹{booking.original_price}</span>
                                )}
                                <span className="text-sm font-semibold text-green-400">₹{booking.final_price}</span>
                              </div>
                            )}
                          </div>
                          <Badge className={`${status.color} flex items-center gap-1`}>
                            <StatusIcon size={14} />
                            {status.label}
                          </Badge>
                        </div>

                        {bookingDateTime > new Date() && (
                          <div className="mb-3 p-2 bg-cuephoria-green/10 rounded-lg border border-cuephoria-green/30">
                            <p className="text-sm text-cuephoria-green flex items-center gap-2">
                              <Clock size={14} />
                              Starts in {getCountdown(bookingDateTime)}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-cuephoria-lightpurple/30"
                            onClick={() => window.open('https://maps.google.com', '_blank')}
                          >
                            <Navigation size={14} className="mr-1" />
                            Directions
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-600 text-red-500 hover:bg-red-600 hover:text-white"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            <XCircle size={14} className="mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-4 space-y-3">
              {pastBookings.length === 0 ? (
                <Card className="bg-cuephoria-darker border-gray-800">
                  <CardContent className="p-8 text-center">
                    <Gamepad2 className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400">No past bookings yet</p>
                  </CardContent>
                </Card>
              ) : (
                pastBookings.map((booking) => (
                  <Card key={booking.id} className="bg-cuephoria-darker border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{booking.station_name}</h3>
                          <p className="text-sm text-gray-400">{formatDate(booking.booking_date)} • {formatTime(booking.start_time)}</p>
                          <p className="text-xs text-gray-500 mt-1">{timeAgo(booking.created_at)}</p>
                          {booking.final_price && (
                            <div className="flex items-center gap-2 mt-2">
                              {booking.original_price && booking.original_price > booking.final_price && (
                                <span className="text-xs line-through text-gray-500">₹{booking.original_price}</span>
                              )}
                              <span className="text-sm font-semibold text-green-400">₹{booking.final_price}</span>
                            </div>
                          )}
                        </div>
                        <Badge className="bg-cuephoria-green">
                          <CheckCircle2 size={14} className="mr-1" />
                          Completed
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-800">
                        <div className="flex-1">
                          <p className="text-xs text-gray-400">Duration</p>
                          <p className="text-sm font-medium text-white">{Math.floor(booking.duration / 60)}h {booking.duration % 60}m</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
                          onClick={() => navigate('/public/booking')}
                        >
                          Book Again
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="mt-4 space-y-3">
              {cancelledBookings.length === 0 ? (
                <Card className="bg-cuephoria-darker border-gray-800">
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400">No cancelled bookings</p>
                  </CardContent>
                </Card>
              ) : (
                cancelledBookings.map((booking) => (
                  <Card key={booking.id} className="bg-cuephoria-darker border-gray-800 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{booking.station_name}</h3>
                          <p className="text-sm text-gray-400">{formatDate(booking.booking_date)} • {formatTime(booking.start_time)}</p>
                        </div>
                        <Badge variant="outline" className="border-gray-600 text-gray-400">
                          <XCircle size={14} className="mr-1" />
                          Cancelled
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Quick Book Button */}
        {!loading && (
          <Button
            className="w-full mt-6 bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:shadow-xl h-12"
            onClick={() => navigate('/public/booking')}
          >
            <Calendar className="mr-2" size={20} />
            Book New Session
          </Button>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
      </div>
    </div>
  );
}
