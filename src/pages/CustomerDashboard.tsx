import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Star,
  Trophy,
  User,
  Gift,
  LogOut,
  Clock,
  Gamepad2,
  TrendingUp,
  Award,
  Zap,
  ArrowRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  getCustomerSession,
  clearCustomerSession,
  formatDate,
  formatTime,
  getCountdown,
  getGreeting,
  getGreetingEmoji,
  timeAgo
} from '@/utils/customerAuth';
import { toast } from 'sonner';
import BottomNav from '@/components/customer/BottomNav';
import '@/styles/customer-animations.css';

interface CustomerStats {
  upcomingBookings: number;
  totalSessions: number;
  totalHours: number;
  loyaltyPoints: number;
  rank: number;
  totalCustomers: number;
}

interface UpcomingBooking {
  id: string;
  station_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
}

interface RecentSession {
  id: string;
  station_name: string;
  start_time: string;
  end_time: string;
  duration: number;
}

interface CustomerOffer {
  id: string;
  title: string;
  description: string;
  offer_code: string;
  discount_value: number;
  offer_type: string;
  valid_until: string;
  status: string;
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(getCustomerSession());
  const [stats, setStats] = useState<CustomerStats>({
    upcomingBookings: 0,
    totalSessions: 0,
    totalHours: 0,
    loyaltyPoints: 0,
    rank: 0,
    totalCustomers: 0
  });
  const [upcomingBooking, setUpcomingBooking] = useState<UpcomingBooking | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if logged in
    if (!customer) {
      navigate('/customer/login');
      return;
    }

    loadDashboardData();
  }, [customer, navigate]);

  const loadDashboardData = async () => {
    if (!customer) return;

    setLoading(true);

    try {
      // Load all data in parallel
      await Promise.all([
        loadStats(),
        loadUpcomingBooking(),
        loadRecentSessions(),
        loadOffers()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!customer) return;

    // Get upcoming bookings count
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .eq('customer_id', customer.id)
      .gte('booking_date', new Date().toISOString().split('T')[0])
      .eq('status', 'confirmed');

    // Get total sessions
    const { data: sessions } = await supabase
      .from('sessions')
      .select('duration')
      .eq('customer_id', customer.id)
      .eq('status', 'completed');

    // Calculate total hours
    const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;
    const totalHours = Math.floor(totalMinutes / 60);

    // Get customer data for loyalty points
    const { data: customerData } = await supabase
      .from('customers')
      .select('loyalty_points, total_play_time')
      .eq('id', customer.id)
      .single();

    // Get customer rank (based on total_play_time)
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('total_play_time')
      .order('total_play_time', { ascending: false });

    const rank = allCustomers?.findIndex(c => c.total_play_time <= (customerData?.total_play_time || 0)) + 1 || 0;

    setStats({
      upcomingBookings: bookings?.length || 0,
      totalSessions: sessions?.length || 0,
      totalHours,
      loyaltyPoints: customerData?.loyalty_points || 0,
      rank,
      totalCustomers: allCustomers?.length || 0
    });
  };

  const loadUpcomingBooking = async () => {
    if (!customer) return;

    const { data } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        duration,
        status,
        stations (
          name
        )
      `)
      .eq('customer_id', customer.id)
      .gte('booking_date', new Date().toISOString().split('T')[0])
      .eq('status', 'confirmed')
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (data && data.stations) {
      setUpcomingBooking({
        id: data.id,
        station_name: (data.stations as any).name,
        booking_date: data.booking_date,
        start_time: data.start_time,
        end_time: data.end_time,
        duration: data.duration,
        status: data.status
      });
    }
  };

  const loadRecentSessions = async () => {
    if (!customer) return;

    const { data } = await supabase
      .from('sessions')
      .select(`
        id,
        start_time,
        end_time,
        duration,
        stations (
          name
        )
      `)
      .eq('customer_id', customer.id)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(3);

    if (data) {
      setRecentSessions(
        data.map(s => ({
          id: s.id,
          station_name: (s.stations as any)?.name || 'Unknown Station',
          start_time: s.start_time,
          end_time: s.end_time || '',
          duration: s.duration || 0
        }))
      );
    }
  };

  const loadOffers = async () => {
    if (!customer) return;

    const { data } = await supabase
      .from('customer_offer_assignments')
      .select(`
        id,
        status,
        customer_offers (
          id,
          title,
          description,
          offer_code,
          discount_value,
          offer_type,
          valid_until
        )
      `)
      .eq('customer_id', customer.id)
      .in('status', ['assigned', 'viewed'])
      .order('assigned_at', { ascending: false })
      .limit(3);

    if (data) {
      setOffers(
        data
          .filter(item => item.customer_offers)
          .map(item => {
            const offer = item.customer_offers as any;
            return {
              id: item.id,
              title: offer.title,
              description: offer.description,
              offer_code: offer.offer_code,
              discount_value: offer.discount_value,
              offer_type: offer.offer_type,
              valid_until: offer.valid_until,
              status: item.status
            };
          })
      );
    }
  };

  const handleLogout = () => {
    clearCustomerSession();
    toast.success('Logged out successfully');
    navigate('/customer/login');
  };

  if (!customer) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cuephoria-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-cuephoria-purple animate-spin" />
          <p className="text-gray-400 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cuephoria-dark p-4 pb-20">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              {getGreeting()}, {customer.name}! {getGreetingEmoji()}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {customer.isMember && <Badge className="bg-cuephoria-orange mr-2">Gold Member</Badge>}
              Customer ID: {customer.phone}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
            <LogOut size={18} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="bg-cuephoria-darker border-cuephoria-purple/30 hover:border-cuephoria-purple/50 transition-all">
          <CardContent className="p-4 text-center">
            <Calendar className="mx-auto mb-2 text-cuephoria-blue" size={28} />
            <p className="text-2xl font-bold text-white">{stats.upcomingBookings}</p>
            <p className="text-xs text-gray-400">Upcoming</p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-darker border-cuephoria-orange/30 hover:border-cuephoria-orange/50 transition-all">
          <CardContent className="p-4 text-center">
            <Gamepad2 className="mx-auto mb-2 text-cuephoria-orange" size={28} />
            <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
            <p className="text-xs text-gray-400">Games</p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-darker border-cuephoria-lightpurple/30 hover:border-cuephoria-lightpurple/50 transition-all">
          <CardContent className="p-4 text-center">
            <Clock className="mx-auto mb-2 text-cuephoria-lightpurple" size={28} />
            <p className="text-2xl font-bold text-white">{stats.totalHours}</p>
            <p className="text-xs text-gray-400">Hours</p>
          </CardContent>
        </Card>

        <Card className="bg-cuephoria-darker border-cuephoria-green/30 hover:border-cuephoria-green/50 transition-all">
          <CardContent className="p-4 text-center">
            <Star className="mx-auto mb-2 text-cuephoria-green" size={28} />
            <p className="text-2xl font-bold text-white">{stats.loyaltyPoints}</p>
            <p className="text-xs text-gray-400">Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Booking */}
      {upcomingBooking && (
        <div className="max-w-5xl mx-auto mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="text-cuephoria-orange" size={20} />
            Next Session
          </h2>
          <Card className="bg-gradient-to-br from-cuephoria-purple/20 to-cuephoria-orange/20 border-cuephoria-lightpurple/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white">{upcomingBooking.station_name}</h3>
                  <p className="text-gray-300 text-sm mt-1">
                    {formatDate(upcomingBooking.booking_date)} • {formatTime(upcomingBooking.start_time)} - {formatTime(upcomingBooking.end_time)}
                  </p>
                  <Badge className="mt-2 bg-cuephoria-green">
                    <Clock size={12} className="mr-1" />
                    Starts in {getCountdown(new Date(`${upcomingBooking.booking_date}T${upcomingBooking.start_time}`))}
                  </Badge>
                </div>
                <CheckCircle2 className="text-cuephoria-green" size={24} />
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="flex-1 bg-cuephoria-purple hover:bg-cuephoria-purple/80"
                  onClick={() => navigate(`/customer/bookings`)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cuephoria-lightpurple/30"
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                >
                  Get Directions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="max-w-5xl mx-auto mb-6">
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="text-cuephoria-lightpurple" size={20} />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            className="bg-cuephoria-darker border-cuephoria-purple/30 hover:border-cuephoria-purple/50 transition-all cursor-pointer group"
            onClick={() => navigate('/public/booking')}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white group-hover:text-cuephoria-lightpurple transition-colors">
                  Book a Session
                </h3>
                <p className="text-xs text-gray-400 mt-1">Reserve your favorite station</p>
              </div>
              <Calendar className="text-cuephoria-purple group-hover:scale-110 transition-transform" size={28} />
            </CardContent>
          </Card>

          <Card
            className="bg-cuephoria-darker border-cuephoria-orange/30 hover:border-cuephoria-orange/50 transition-all cursor-pointer group"
            onClick={() => navigate('/customer/offers')}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white group-hover:text-cuephoria-orange transition-colors flex items-center gap-2">
                  My Offers
                  {offers.length > 0 && (
                    <Badge className="bg-cuephoria-orange text-xs">{offers.length} New</Badge>
                  )}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Exclusive deals for you</p>
              </div>
              <Gift className="text-cuephoria-orange group-hover:scale-110 transition-transform" size={28} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Offers Preview */}
      {offers.length > 0 && (
        <div className="max-w-5xl mx-auto mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Gift className="text-cuephoria-orange" size={20} />
            Your Offers
          </h2>
          <div className="grid gap-3">
            {offers.slice(0, 2).map((offer) => (
              <Card key={offer.id} className="bg-cuephoria-darker border-cuephoria-orange/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{offer.title}</h3>
                        {offer.status === 'assigned' && (
                          <Badge className="bg-cuephoria-red text-xs">NEW!</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{offer.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge className="bg-cuephoria-orange">
                          {offer.offer_type === 'percentage_discount'
                            ? `${offer.discount_value}% OFF`
                            : `₹${offer.discount_value} OFF`}
                        </Badge>
                        <span className="text-gray-400">
                          Code: <span className="font-mono text-cuephoria-lightpurple">{offer.offer_code}</span>
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="text-gray-400 flex-shrink-0 ml-2" size={20} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {offers.length > 2 && (
            <Button
              variant="link"
              className="w-full mt-2 text-cuephoria-lightpurple"
              onClick={() => navigate('/customer/offers')}
            >
              View all {offers.length} offers →
            </Button>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {recentSessions.length > 0 && (
        <div className="max-w-5xl mx-auto mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Trophy className="text-cuephoria-lightpurple" size={20} />
            Recent Sessions
          </h2>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Card key={session.id} className="bg-cuephoria-darker border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cuephoria-purple/20 flex items-center justify-center">
                        <Gamepad2 className="text-cuephoria-purple" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{session.station_name}</p>
                        <p className="text-xs text-gray-400">{timeAgo(session.start_time)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-cuephoria-lightpurple">
                        {Math.floor(session.duration / 60)}h {session.duration % 60}m
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
