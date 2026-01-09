import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Star,
  Trophy,
  LogOut,
  Clock,
  Gamepad2,
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
  Gift,
  Target,
  Users,
  Bell,
  MapPin,
  Play,
  Pause,
  ChevronRight,
  Flame,
  Crown,
  Sparkles,
  TrendingDown,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerSession, clearCustomerSession, formatDate, formatTime, getGreeting, getGreetingEmoji } from '@/utils/customerAuth';
import { toast } from 'sonner';
import BottomNav from '@/components/customer/BottomNav';
import '@/styles/customer-animations.css';

export default function CustomerDashboardEnhanced() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(getCustomerSession());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingBookings: 0,
    totalSessions: 0,
    totalHours: 0,
    loyaltyPoints: 0,
    totalSpent: 0,
    membershipDays: 0,
    currentStreak: 0,
    rank: 0
  });
  const [activeSession, setActiveSession] = useState<any>(null);
  const [nextBooking, setNextBooking] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [activityBreakdown, setActivityBreakdown] = useState<any>({});
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (!customer) {
      navigate('/customer/login');
      return;
    }
    loadAllData();
  }, [customer, navigate]);

  const loadAllData = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadActiveSession(),
        loadNextBooking(),
        loadRecentSessions(),
        loadOffers(),
        loadAchievements(),
        loadActivityBreakdown()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!customer) return;

    try {
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('booking_date, start_time, end_time, status, duration, final_price, created_at')
        .eq('customer_id', customer.id);

      if (!allBookings) return;

      const now = new Date();
      let upcomingCount = 0;
      let totalSessionsCount = 0;
      let totalMinutes = 0;
      let totalSpent = 0;
      let lastSessionDate: Date | null = null;
      let streak = 0;

      const sortedBookings = [...allBookings].sort((a, b) => 
        new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
      );

      sortedBookings.forEach((booking, index) => {
        if (booking.status === 'cancelled') return;

        const bookingDate = new Date(booking.booking_date);
        const [startHour, startMinute] = booking.start_time.split(':').map(Number);
        const bookingStartTime = new Date(bookingDate);
        bookingStartTime.setHours(startHour, startMinute, 0);

        const [endHour, endMinute] = booking.end_time.split(':').map(Number);
        const bookingEndTime = new Date(bookingDate);
        bookingEndTime.setHours(endHour, endMinute, 0);

        if (now < bookingStartTime) {
          upcomingCount++;
        }

        if (now > bookingEndTime) {
          totalSessionsCount++;
          totalMinutes += booking.duration || 0;
          totalSpent += booking.final_price || 0;

          // Calculate streak
          if (index === 0 || !lastSessionDate) {
            lastSessionDate = bookingDate;
            streak = 1;
          } else {
            const daysDiff = Math.floor((lastSessionDate.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 7) {
              streak++;
            }
            lastSessionDate = bookingDate;
          }
        }
      });

      const { data: customerData } = await supabase
        .from('customers')
        .select('loyalty_points, created_at')
        .eq('id', customer.id)
        .single();

      const membershipDays = customerData?.created_at 
        ? Math.floor((now.getTime() - new Date(customerData.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      setStats({
        upcomingBookings: upcomingCount,
        totalSessions: totalSessionsCount,
        totalHours: Math.floor(totalMinutes / 60),
        loyaltyPoints: customerData?.loyalty_points || 0,
        totalSpent,
        membershipDays,
        currentStreak: streak,
        rank: 47 // This would come from a leaderboard query
      });

      // Generate recommendations
      generateRecommendations(allBookings, totalSessionsCount);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadActiveSession = async () => {
    if (!customer) return;

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          duration,
          final_price,
          stations!inner (name)
        `)
        .eq('customer_id', customer.id)
        .eq('booking_date', today);

      if (!bookings) return;

      const active = bookings.find(booking => {
        const [startHour, startMinute] = booking.start_time.split(':').map(Number);
        const [endHour, endMinute] = booking.end_time.split(':').map(Number);
        
        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0);
        
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0);

        return now >= startTime && now <= endTime;
      });

      if (active) {
        setActiveSession({
          ...active,
          station_name: (active.stations as any)?.name || 'Unknown Station'
        });
      }
    } catch (error) {
      console.error('Error loading active session:', error);
    }
  };

  const loadNextBooking = async () => {
    if (!customer) return;

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          duration,
          final_price,
          original_price,
          stations!inner (name)
        `)
        .eq('customer_id', customer.id)
        .gte('booking_date', today)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1);

      if (bookings && bookings.length > 0) {
        setNextBooking({
          ...bookings[0],
          station_name: (bookings[0].stations as any)?.name || 'Unknown Station'
        });
      }
    } catch (error) {
      console.error('Error loading next booking:', error);
    }
  };

  const loadRecentSessions = async () => {
    if (!customer) return;

    try {
      const now = new Date();
      
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          duration,
          final_price,
          stations!inner (name)
        `)
        .eq('customer_id', customer.id)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false })
        .limit(5);

      if (bookings) {
        setRecentSessions(bookings.map(b => ({
          ...b,
          station_name: (b.stations as any)?.name || 'Unknown Station'
        })));
      }
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  };

  const loadOffers = async () => {
    if (!customer) return;

    try {
      const { data } = await supabase
        .from('customer_offer_assignments')
        .select(`
          id,
          customer_offers (
            id,
            title,
            description,
            offer_code,
            offer_type,
            discount_value,
            valid_until
          )
        `)
        .eq('customer_id', customer.id)
        .in('status', ['assigned', 'viewed'])
        .limit(3);

      if (data) {
        setOffers(data.filter(item => item.customer_offers).map(item => item.customer_offers));
      }
    } catch (error) {
      console.error('Error loading offers:', error);
    }
  };

  const loadAchievements = async () => {
    // Mock achievements based on stats
    const achievements = [];
    
    if (stats.currentStreak >= 5) {
      achievements.push({
        name: `${stats.currentStreak}-Game Streak`,
        earned: true,
        points: 100,
        icon: Flame
      });
    }
    
    if (stats.loyaltyPoints >= 1500) {
      achievements.push({
        name: 'Gold Member',
        earned: true,
        points: 200,
        icon: Crown
      });
    }

    if (stats.totalHours >= 50) {
      achievements.push({
        name: '50 Hours Milestone',
        earned: false,
        progress: stats.totalHours,
        total: 50,
        icon: Clock
      });
    }

    setAchievements(achievements);
  };

  const loadActivityBreakdown = async () => {
    if (!customer) return;

    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('booking_date, start_time, duration')
        .eq('customer_id', customer.id)
        .eq('status', 'completed');

      if (!bookings) return;

      const breakdown = {
        byDay: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
        byTimeSlot: { morning: 0, afternoon: 0, evening: 0, night: 0 }
      };

      bookings.forEach(booking => {
        const date = new Date(booking.booking_date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        breakdown.byDay[dayName]++;

        const hour = parseInt(booking.start_time.split(':')[0]);
        if (hour >= 11 && hour < 14) breakdown.byTimeSlot.morning++;
        else if (hour >= 14 && hour < 18) breakdown.byTimeSlot.afternoon++;
        else if (hour >= 18 && hour < 22) breakdown.byTimeSlot.evening++;
        else breakdown.byTimeSlot.night++;
      });

      setActivityBreakdown(breakdown);
    } catch (error) {
      console.error('Error loading activity breakdown:', error);
    }
  };

  const generateRecommendations = (bookings: any[], totalSessions: number) => {
    const recs = [];
    
    // Check for VR
    const hasVR = bookings.some(b => b.station_name && b.station_name.toLowerCase().includes('vr'));
    if (!hasVR) {
      recs.push("You haven't tried VR yet! First-time users get 30% OFF");
    }

    // Check for streak
    if (stats.currentStreak >= 3) {
      recs.push(`Keep your ${stats.currentStreak}-game streak going! Book again this week for bonus points`);
    }

    // Happy hours
    recs.push("Book during Happy Hours (Mon-Fri, 11AM-4PM) for 20% OFF");

    setRecommendations(recs);
  };

  const getMembershipTier = () => {
    const points = stats.loyaltyPoints;
    if (points >= 3000) return { name: 'Platinum', color: 'from-purple-400 to-pink-400', next: null };
    if (points >= 1500) return { name: 'Gold', color: 'from-yellow-400 to-orange-400', next: 3000 - points };
    if (points >= 500) return { name: 'Silver', color: 'from-gray-300 to-gray-400', next: 1500 - points };
    return { name: 'Bronze', color: 'from-orange-600 to-red-600', next: 500 - points };
  };

  const handleLogout = () => {
    clearCustomerSession();
    navigate('/customer/login');
    toast.success('Logged out successfully');
  };

  if (!customer) return null;

  const tier = getMembershipTier();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 pb-20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 backdrop-blur-xl bg-gray-900/50 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Customer Dashboard</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => navigate('/customer/offers')}
            >
              <Bell size={20} />
              {offers.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {offers.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/customer/profile')}>
              <Trophy size={20} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Personalized Greeting */}
        <Card className="bg-gradient-to-r from-purple-600/40 via-pink-600/40 to-blue-600/40 border border-purple-400/50 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold text-white mb-2">
              {getGreeting()}, {customer.name}! {getGreetingEmoji()}
            </h2>
            {stats.currentStreak >= 3 && (
              <p className="text-white/90 mb-3 flex items-center gap-2">
                <Flame className="text-orange-400 animate-pulse" size={20} />
                You're on a {stats.currentStreak}-game streak this month!
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
              <Badge className={`bg-gradient-to-r ${tier.color}`}>
                <Crown size={14} className="mr-1" />
                {tier.name} Member
              </Badge>
              <span>Member since {formatDate(new Date(Date.now() - stats.membershipDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}</span>
              {tier.next && <span>Next tier in {tier.next} points</span>}
              <span>Customer ID: {customer.phone}</span>
            </div>
          </CardContent>
        </Card>

        {/* Active & Upcoming Sessions */}
        {(activeSession || nextBooking) && (
          <Card className="bg-gradient-to-br from-orange-600/30 to-red-600/30 border border-orange-500/50 backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="text-yellow-400" />
                {activeSession ? 'LIVE NOW' : 'NEXT UP'}
              </h3>
              
              {activeSession && (
                <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-4">
                  <h4 className="font-bold text-white text-lg mb-2">{activeSession.station_name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-white/90 mb-3">
                    <span>Started: {formatTime(activeSession.start_time)}</span>
                    <span>Ends: {formatTime(activeSession.end_time)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-white/30 text-white">
                      <Pause size={16} className="mr-1" /> Pause
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-500">
                      <CheckCircle2 size={16} className="mr-1" /> Check Out
                    </Button>
                  </div>
                </div>
              )}

              {nextBooking && !activeSession && (
                <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-4">
                  <h4 className="font-bold text-white text-lg mb-2">{nextBooking.station_name}</h4>
                  <div className="text-white/90 text-sm mb-3">
                    <p>{formatDate(nextBooking.booking_date)} • {formatTime(nextBooking.start_time)} - {formatTime(nextBooking.end_time)}</p>
                    {nextBooking.original_price && nextBooking.original_price > nextBooking.final_price && (
                      <p className="mt-1">
                        <span className="line-through text-gray-400">₹{nextBooking.original_price}</span>
                        <span className="ml-2 text-green-400 font-bold">₹{nextBooking.final_price}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => navigate('/customer/bookings')}>
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="border-purple-400">
                      <MapPin size={16} className="mr-1" /> Directions
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-600/90 to-purple-600/90 border-0 shadow-xl backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <Star className="mx-auto mb-2 text-white" size={28} />
              <p className="text-3xl font-bold text-white">{stats.loyaltyPoints}</p>
              <p className="text-xs text-white/90">Loyalty Points</p>
              <Progress value={(stats.loyaltyPoints / (tier.next ? tier.next + stats.loyaltyPoints : 3000)) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/90 to-teal-600/90 border-0 shadow-xl backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <Gamepad2 className="mx-auto mb-2 text-white" size={28} />
              <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
              <p className="text-xs text-white/90">Games Played</p>
              <p className="text-xs text-white/70 mt-1">Rank #{stats.rank}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600/90 to-red-600/90 border-0 shadow-xl backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-2 text-white" size={28} />
              <p className="text-3xl font-bold text-white">{stats.totalHours}</p>
              <p className="text-xs text-white/90">Total Hours</p>
              <p className="text-xs text-white/70 mt-1">Avg: {stats.totalSessions > 0 ? (stats.totalHours / stats.totalSessions).toFixed(1) : 0}h/session</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/90 to-pink-600/90 border-0 shadow-xl backdrop-blur-xl">
            <CardContent className="p-4 text-center">
              <Trophy className="mx-auto mb-2 text-white" size={28} />
              <p className="text-3xl font-bold text-white">#{stats.rank}</p>
              <p className="text-xs text-white/90">Your Rank</p>
              <p className="text-xs text-white/70 mt-1">Top 10%</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Breakdown */}
        {activityBreakdown.byDay && (
          <Card className="bg-gray-800/50 border-purple-500/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="text-purple-400" />
                This Month's Activity
              </h3>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {Object.entries(activityBreakdown.byDay).map(([day, count]: [string, any]) => (
                  <div key={day} className="text-center">
                    <p className="text-xs text-gray-400 mb-1">{day}</p>
                    <div className="bg-purple-600/20 rounded p-2">
                      <p className="text-white font-bold">{count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 backdrop-blur-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="text-yellow-400" />
                Personalized Recommendations
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
                    <Target className="text-green-400 flex-shrink-0 mt-1" size={18} />
                    <p className="text-white/90 text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            className="h-auto py-6 flex flex-col items-center gap-3 bg-gradient-to-br from-purple-600 to-pink-600"
            onClick={() => navigate('/public/booking')}
          >
            <Calendar size={24} />
            <span className="font-semibold">BOOK NOW</span>
          </Button>
          
          <Button
            className="h-auto py-6 flex flex-col items-center gap-3 bg-gradient-to-br from-blue-600 to-cyan-600"
            onClick={() => navigate('/customer/bookings')}
          >
            <Clock size={24} />
            <span className="font-semibold">MY BOOKINGS</span>
          </Button>
          
          <Button
            className="h-auto py-6 flex flex-col items-center gap-3 bg-gradient-to-br from-orange-600 to-red-600"
            onClick={() => navigate('/customer/offers')}
          >
            <Gift size={24} />
            <span className="font-semibold">OFFERS ({offers.length})</span>
          </Button>
          
          <Button
            className="h-auto py-6 flex flex-col items-center gap-3 bg-gradient-to-br from-green-600 to-teal-600"
            onClick={() => navigate('/customer/profile')}
          >
            <Trophy size={24} />
            <span className="font-semibold">PROFILE</span>
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
