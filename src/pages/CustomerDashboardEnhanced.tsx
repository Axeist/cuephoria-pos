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
  BarChart3,
  Gem
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
      // Fetch ALL bookings (no status filter to get the true total)
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('booking_date, start_time, end_time, status, duration, final_price, original_price, created_at')
        .eq('customer_id', customer.id);

      // Fetch ALL bills (POS transactions) for this customer
      const { data: allBills } = await supabase
        .from('bills')
        .select('total, payment_method, created_at')
        .eq('customer_id', customer.id);

      if (!allBookings) return;

      const now = new Date();
      let upcomingCount = 0;
      let totalSessionsCount = 0;
      let totalMinutes = 0;
      let totalSpentFromBills = 0;
      let lastSessionDate: Date | null = null;
      let streak = 0;

      const sortedBookings = [...allBookings].sort((a, b) => 
        new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
      );

      // Count ALL non-cancelled bookings as games
      const totalGamesPlayed = allBookings.filter(b => b.status !== 'cancelled').length;

      // Calculate total spent from BILLS ONLY (excluding complimentary)
      // DO NOT include booking amounts - only actual POS purchases
      if (allBills) {
        allBills.forEach((bill) => {
          if (bill.payment_method === 'complimentary') return;
          totalSpentFromBills += bill.total || 0;
        });
      }

      // Total spent is ONLY from bills (POS transactions), NOT bookings
      const totalSpent = totalSpentFromBills;

      sortedBookings.forEach((booking, index) => {
        if (booking.status === 'cancelled') return;

        const bookingDate = new Date(booking.booking_date);
        const [startHour, startMinute] = booking.start_time.split(':').map(Number);
        const bookingStartTime = new Date(bookingDate);
        bookingStartTime.setHours(startHour, startMinute, 0);

        const [endHour, endMinute] = booking.end_time.split(':').map(Number);
        const bookingEndTime = new Date(bookingDate);
        bookingEndTime.setHours(endHour, endMinute, 0);

        // Check if booking is truly in the future
        if (now < bookingStartTime) {
          upcomingCount++;
        }

        // Calculate hours based on ALL sessions (completed or not)
        totalMinutes += booking.duration || 0;

        // Only count streak for completed sessions
        if (now > bookingEndTime) {
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

      totalSessionsCount = totalGamesPlayed;

      console.log('📊 Total Spent Calculation:', {
        totalBookings: allBookings.length,
        totalBills: allBills?.length || 0,
        nonCancelledBookings: allBookings.filter(b => b.status !== 'cancelled').length,
        totalSpentFromBills,
        totalSpent,
        note: 'Total spent = BILLS ONLY (excluding bookings)',
        billDetails: allBills?.map(b => ({ 
          total: b.total,
          payment_method: b.payment_method
        }))
      });

      const { data: customerData } = await supabase
        .from('customers')
        .select('loyalty_points, created_at')
        .eq('id', customer.id)
        .single();

      const membershipDays = customerData?.created_at 
        ? Math.floor((now.getTime() - new Date(customerData.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate rank based on total spending (BILLS ONLY)
      const { data: allCustomersBills } = await supabase
        .from('bills')
        .select('customer_id, total, payment_method');

      let customerSpendingMap: { [key: string]: number } = {};
      
      // Add bills spending (ONLY source of spending for ranking)
      if (allCustomersBills) {
        allCustomersBills.forEach((bill) => {
          if (bill.payment_method === 'complimentary') return;
          const customerId = bill.customer_id;
          if (!customerSpendingMap[customerId]) {
            customerSpendingMap[customerId] = 0;
          }
          customerSpendingMap[customerId] += bill.total || 0;
        });
      }

      // Sort customers by spending and find rank
      const sortedCustomers = Object.entries(customerSpendingMap)
        .sort((a, b) => b[1] - a[1]);
      
      const currentRank = sortedCustomers.findIndex(([id]) => id === customer.id) + 1;

      console.log('🏆 Rank Calculation:', {
        myTotalSpent: totalSpent,
        myRank: currentRank,
        topCustomers: sortedCustomers.slice(0, 10).map(([id, spent]) => ({ 
          id, 
          spent,
          isMe: id === customer.id 
        }))
      });

      setStats({
        upcomingBookings: upcomingCount,
        totalSessions: totalSessionsCount,
        totalHours: Math.floor(totalMinutes / 60),
        loyaltyPoints: customerData?.loyalty_points || 0,
        totalSpent,
        membershipDays,
        currentStreak: streak,
        rank: currentRank || 1
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
        .order('start_time', { ascending: true });

      if (bookings && bookings.length > 0) {
        // Filter to get only future bookings (not completed today)
        const futureBooking = bookings.find(booking => {
          const bookingDate = new Date(booking.booking_date);
          const [endHour, endMinute] = booking.end_time.split(':').map(Number);
          const bookingEndTime = new Date(bookingDate);
          bookingEndTime.setHours(endHour, endMinute, 0);
          
          // Only show if the booking end time is in the future
          return bookingEndTime > now;
        });

        if (futureBooking) {
          setNextBooking({
            ...futureBooking,
            station_name: (futureBooking.stations as any)?.name || 'Unknown Station'
          });
        } else {
          setNextBooking(null);
        }
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
        .select(`
          booking_date, 
          start_time, 
          duration,
          stations!inner (name, type)
        `)
        .eq('customer_id', customer.id)
        .in('status', ['completed', 'confirmed']);

      if (!bookings) return;

      const breakdown = {
        byDay: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 },
        byTimeSlot: { 
          morning: { count: 0, label: '11 AM - 2 PM' }, 
          afternoon: { count: 0, label: '2 PM - 6 PM' }, 
          evening: { count: 0, label: '6 PM - 10 PM' }, 
          night: { count: 0, label: '10 PM - 11 PM' } 
        },
        byGameType: {
          '8ball': 0,
          'ps5': 0,
          'vr': 0,
          'other': 0
        }
      };

      bookings.forEach(booking => {
        const date = new Date(booking.booking_date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        breakdown.byDay[dayName]++;

        const hour = parseInt(booking.start_time.split(':')[0]);
        if (hour >= 11 && hour < 14) breakdown.byTimeSlot.morning.count++;
        else if (hour >= 14 && hour < 18) breakdown.byTimeSlot.afternoon.count++;
        else if (hour >= 18 && hour < 22) breakdown.byTimeSlot.evening.count++;
        else breakdown.byTimeSlot.night.count++;

        // Categorize by game type
        const stationName = (booking.stations as any)?.name?.toLowerCase() || '';
        const stationType = (booking.stations as any)?.type?.toLowerCase() || '';
        
        if (stationName.includes('8-ball') || stationName.includes('pool') || stationType.includes('pool')) {
          breakdown.byGameType['8ball']++;
        } else if (stationName.includes('ps5') || stationName.includes('playstation') || stationType.includes('gaming')) {
          breakdown.byGameType['ps5']++;
        } else if (stationName.includes('vr') || stationType.includes('vr')) {
          breakdown.byGameType['vr']++;
        } else {
          breakdown.byGameType['other']++;
        }
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
    const spent = stats.totalSpent;
    if (spent >= 40000) return { 
      name: 'Platinum', 
      color: 'from-purple-500 to-pink-500', 
      icon: Crown, 
      next: null,
      tagline: 'ELITE PLAYER',
      message: "You're in the top 1% of our gaming community! 🌟",
      perks: ['Priority Booking', 'VIP Lounge Access', 'Exclusive Events', 'Personal Gaming Advisor']
    };
    if (spent >= 20000) return { 
      name: 'Diamond', 
      color: 'from-cyan-400 to-blue-500', 
      icon: Gem, 
      next: 40000 - spent,
      tagline: 'PREMIUM MEMBER',
      message: 'Your dedication shines bright! Diamond status achieved! 💎',
      perks: ['Extended Hours', 'Priority Support', 'Free Upgrades', 'Birthday Bonus']
    };
    if (spent >= 10000) return { 
      name: 'Gold', 
      color: 'from-yellow-400 to-orange-400', 
      icon: Trophy, 
      next: 20000 - spent,
      tagline: 'VALUED GAMER',
      message: 'Gold status unlocked! You\'re a true gaming enthusiast! 🏆',
      perks: ['Weekly Offers', 'Loyalty Bonuses', 'Group Discounts', 'Event Access']
    };
    if (spent >= 5000) return { 
      name: 'Silver', 
      color: 'from-gray-300 to-gray-400', 
      icon: Award, 
      next: 10000 - spent,
      tagline: 'RISING STAR',
      message: 'Keep gaming! You\'re on your way to greatness! ⚡',
      perks: ['Monthly Offers', 'Points Multiplier', 'Referral Bonus', 'Special Deals']
    };
    return { 
      name: 'Bronze', 
      color: 'from-orange-600 to-red-600', 
      icon: Star, 
      next: 5000 - spent,
      tagline: 'NEW ADVENTURER',
      message: 'Welcome to the gaming family! Your journey begins! 🎮',
      perks: ['Welcome Bonus', 'Birthday Offer', 'Basic Rewards', 'Community Access']
    };
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
      <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-900/95 to-purple-900/95 border-b border-purple-500/30 backdrop-blur-xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white tracking-wide">Dashboard</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="relative text-gray-300 hover:text-white hover:bg-purple-600/30"
              onClick={() => navigate('/customer/offers')}
            >
              <Bell size={20} />
              {offers.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {offers.length}
                </span>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-300 hover:text-white hover:bg-purple-600/30"
              onClick={() => navigate('/customer/profile')}
            >
              <Trophy size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-300 hover:text-white hover:bg-purple-600/30"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Personalized Greeting */}
        <Card className="bg-gray-900/95 border-2 border-purple-500/30 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-blue-900/20"></div>
          
          <CardContent className="p-6 relative z-10">
            {/* Tier Badge & Tagline */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className={`bg-gradient-to-r ${tier.color} text-white shadow-lg px-3 py-1.5 text-sm font-bold border border-white/30`}>
                {React.createElement(tier.icon, { size: 14, className: "mr-1 inline" })}
                {tier.name} Member
              </Badge>
              <Badge className="bg-white/20 backdrop-blur-xl text-white px-3 py-1.5 text-xs font-semibold border border-white/30">
                ⚡ {tier.tagline}
              </Badge>
              {stats.rank <= 10 && (
                <Badge className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-3 py-1.5 text-sm font-bold animate-pulse shadow-lg shadow-yellow-500/30 border border-yellow-300">
                  👑 TOP 10 PLAYER
                </Badge>
              )}
              {stats.rank > 10 && stats.rank <= 50 && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 text-xs font-bold animate-pulse">
                  🏆 TOP 50 PLAYER
                </Badge>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              {getGreeting()}, {customer.name}! {getGreetingEmoji()}
            </h2>
            
            {/* Special Top 10 Message */}
            {stats.rank <= 10 && (
              <div className="mb-3 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-400/60 rounded-lg p-3 animate-pulse">
                <p className="text-base text-yellow-300 font-bold mb-1 flex items-center gap-2">
                  <Crown className="animate-bounce" size={18} />
                  LEGENDARY STATUS UNLOCKED!
                </p>
                <p className="text-white/95 text-sm font-medium">
                  You're in the top 1% of our gaming community! 🌟 You have exclusive VIP access, priority booking, and personal gaming concierge service!
                </p>
              </div>
            )}
            
            {/* Ego Boost Message */}
            {stats.rank > 10 && (
              <p className="text-base text-white/95 mb-3 font-medium">
                {tier.message}
              </p>
            )}

            {stats.currentStreak >= 3 && (
              <p className="text-white mb-4 flex items-center gap-2 bg-orange-900/40 px-4 py-2 rounded-lg border border-orange-500/50">
                <Flame className="text-orange-400 animate-pulse" size={24} />
                <span className="font-bold">UNSTOPPABLE! {stats.currentStreak}-game streak this month! 🔥</span>
              </p>
            )}

            {/* Exclusive Perks */}
            <div className="bg-gray-800/80 backdrop-blur-xl rounded-lg p-4 mb-4 border border-purple-500/30">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Sparkles className="text-yellow-400" size={18} />
                Your Exclusive Perks:
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tier.perks.map((perk, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-white text-sm">
                    <CheckCircle2 className="text-green-400 flex-shrink-0" size={16} />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 border-t border-gray-700 pt-4">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-400" />
                Member since {formatDate(new Date(Date.now() - stats.membershipDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-green-400 text-base">
                <TrendingUp size={16} />
                ₹{stats.totalSpent.toLocaleString()} Total Spent (All Time)
              </span>
              {tier.next && (
                <span className="flex items-center gap-1.5 text-yellow-300 font-semibold">
                  <Target size={14} />
                  ₹{tier.next.toLocaleString()} more to {tier.name === 'Bronze' ? 'Silver' : tier.name === 'Silver' ? 'Gold' : tier.name === 'Gold' ? 'Diamond' : 'Platinum'}
                </span>
              )}
              {!tier.next && (
                <span className="flex items-center gap-1.5 text-pink-400 font-bold">
                  <Crown size={16} className="animate-bounce" />
                  MAXIMUM TIER!
                </span>
              )}
              <span className="text-gray-400">ID: {customer.phone}</span>
            </div>

            {/* Progress to Next Tier */}
            {tier.next && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span className="font-semibold">Progress to Next Tier</span>
                  <span className="font-bold text-white">{((stats.totalSpent / (stats.totalSpent + tier.next)) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                  <div 
                    className={`h-full bg-gradient-to-r ${tier.color} rounded-full transition-all duration-1000 shadow-lg`}
                    style={{ width: `${(stats.totalSpent / (stats.totalSpent + tier.next)) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active & Upcoming Sessions */}
        {(activeSession || nextBooking) && (
          <Card className="bg-gray-900/95 border border-orange-500/40 backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="text-yellow-400" />
                {activeSession ? 'LIVE NOW' : 'NEXT UP'}
              </h3>
              
              {activeSession && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4">
                  <h4 className="font-bold text-white text-lg mb-2">{activeSession.station_name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-3">
                    <span>Started: {formatTime(activeSession.start_time)}</span>
                    <span>Ends: {formatTime(activeSession.end_time)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                      <Pause size={16} className="mr-1" /> Pause
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-500">
                      <CheckCircle2 size={16} className="mr-1" /> Check Out
                    </Button>
                  </div>
                </div>
              )}

              {nextBooking && !activeSession && (
                <div className="bg-purple-900/30 border border-purple-500/40 rounded-lg p-4">
                  <h4 className="font-bold text-white text-lg mb-2">{nextBooking.station_name}</h4>
                  <div className="text-gray-300 text-sm mb-3">
                    <p>{formatDate(nextBooking.booking_date)} • {formatTime(nextBooking.start_time)} - {formatTime(nextBooking.end_time)}</p>
                    {nextBooking.original_price && nextBooking.original_price > nextBooking.final_price && (
                      <p className="mt-1">
                        <span className="line-through text-gray-500">₹{nextBooking.original_price}</span>
                        <span className="ml-2 text-green-400 font-bold">₹{nextBooking.final_price}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-cuephoria-purple hover:bg-purple-700" onClick={() => navigate('/customer/bookings')}>
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
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
          <Card className="bg-gray-900/95 border-purple-500/40 backdrop-blur-xl hover:shadow-xl hover:shadow-purple-500/20 transition-all">
            <CardContent className="p-4 text-center">
              <Star className="mx-auto mb-2 text-yellow-400" size={28} />
              <p className="text-3xl font-bold text-white">{stats.loyaltyPoints}</p>
              <p className="text-xs text-gray-300">Loyalty Points</p>
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.min((stats.loyaltyPoints / 1000) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/95 border-green-500/40 backdrop-blur-xl hover:shadow-xl hover:shadow-green-500/20 transition-all">
            <CardContent className="p-4 text-center">
              <Gamepad2 className="mx-auto mb-2 text-green-400" size={28} />
              <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
              <p className="text-xs text-gray-300">Total Bookings</p>
              <p className="text-xs text-gray-400 mt-1">All sessions</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/95 border-orange-500/40 backdrop-blur-xl hover:shadow-xl hover:shadow-orange-500/20 transition-all">
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto mb-2 text-orange-400" size={28} />
              <p className="text-3xl font-bold text-white">{stats.totalHours}</p>
              <p className="text-xs text-gray-300">Hours Played</p>
              <p className="text-xs text-gray-400 mt-1">From duration</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/95 border-pink-500/40 backdrop-blur-xl hover:shadow-xl hover:shadow-pink-500/20 transition-all">
            <CardContent className="p-4 text-center">
              <Trophy className="mx-auto mb-2 text-pink-400" size={28} />
              <p className="text-3xl font-bold text-white">#{stats.rank}</p>
              <p className="text-xs text-gray-300">Your Rank</p>
              <p className="text-xs text-gray-400 mt-1">Top 10%</p>
            </CardContent>
          </Card>
        </div>

        {/* Comprehensive Analytics Section */}
        {activityBreakdown.byDay && (
          <>
            {/* Favorite Game & Time Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Favorite Game Type */}
              <Card className="bg-gray-900/95 border-green-500/30 backdrop-blur-xl">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Gamepad2 className="text-green-400" />
                    Your Favorite Game
                  </h3>
                  
                  {activityBreakdown.byGameType && (
                    <div className="space-y-3">
                      {Object.entries(activityBreakdown.byGameType)
                        .sort((a: any, b: any) => b[1] - a[1])
                        .filter(([_, count]) => count > 0)
                        .map(([game, count]: [string, any], index) => {
                          const total = Object.values(activityBreakdown.byGameType).reduce((sum: number, c: any) => sum + c, 0);
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          const gameLabels: any = {
                            '8ball': { name: '🎱 8-Ball Pool', color: 'from-blue-500 to-cyan-500' },
                            'ps5': { name: '🎮 PS5 Gaming', color: 'from-purple-500 to-pink-500' },
                            'vr': { name: '🥽 VR Experience', color: 'from-orange-500 to-red-500' },
                            'other': { name: '🎯 Other Games', color: 'from-gray-500 to-gray-600' }
                          };
                          const gameInfo = gameLabels[game] || { name: game, color: 'from-gray-500 to-gray-600' };
                          
                          return (
                            <div key={game}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium flex items-center gap-2">
                                  {gameInfo.name}
                                  {index === 0 && <Trophy className="text-yellow-400" size={16} />}
                                </span>
                                <span className="text-gray-400 text-sm">{count} sessions ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="h-3 bg-gray-800/60 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${gameInfo.color} rounded-full transition-all duration-1000`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Favorite Time Slot */}
              <Card className="bg-gray-900/95 border-orange-500/30 backdrop-blur-xl">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="text-orange-400" />
                    Your Favorite Time
                  </h3>
                  
                  {activityBreakdown.byTimeSlot && (
                    <div className="space-y-3">
                      {Object.entries(activityBreakdown.byTimeSlot)
                        .sort((a: any, b: any) => b[1].count - a[1].count)
                        .filter(([_, data]: any) => data.count > 0)
                        .map(([slot, data]: [string, any], index) => {
                          const total = Object.values(activityBreakdown.byTimeSlot).reduce((sum: number, d: any) => sum + d.count, 0);
                          const percentage = total > 0 ? (data.count / total) * 100 : 0;
                          const slotIcons: any = {
                            morning: '🌅',
                            afternoon: '☀️',
                            evening: '🌆',
                            night: '🌙'
                          };
                          
                          return (
                            <div key={slot}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium flex items-center gap-2">
                                  {slotIcons[slot]} {data.label}
                                  {index === 0 && <Star className="text-yellow-400" size={16} />}
                                </span>
                                <span className="text-gray-400 text-sm">{data.count} sessions ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="h-3 bg-gray-800/60 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Weekly Activity Pattern */}
            <Card className="bg-gray-900/95 border-purple-500/30 backdrop-blur-xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="text-purple-400" />
                  Weekly Activity Pattern
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(activityBreakdown.byDay).map(([day, count]: [string, any]) => {
                    const maxCount = Math.max(...Object.values(activityBreakdown.byDay).map(c => Number(c)));
                    const heightPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={day} className="text-center">
                        <p className="text-xs text-gray-400 mb-1 font-medium">{day}</p>
                        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700 relative h-24 flex items-end justify-center">
                          <div 
                            className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded transition-all duration-1000"
                            style={{ height: `${Math.max(heightPercentage, 15)}%` }}
                          ></div>
                          <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white font-bold text-lg">
                            {count}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="mb-20 bg-gray-900/95 border-gray-700 backdrop-blur-xl shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="text-yellow-400" />
                Personalized Recommendations
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-800/60 p-4 rounded-lg border border-gray-700 hover:bg-gray-800 transition-all">
                    <Target className="text-green-400 flex-shrink-0 mt-1" size={18} />
                    <p className="text-gray-200 text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      <BottomNav />
    </div>
  );
}
