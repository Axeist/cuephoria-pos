import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingEditDialog } from '@/components/booking/BookingEditDialog';
import { BookingDeleteDialog } from '@/components/booking/BookingDeleteDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Calendar, Search, Filter, Download, Phone, Mail, Plus, Clock, MapPin, ChevronDown, ChevronRight, Users,
  Trophy, Gift, Tag, Zap, Megaphone, DollarSign, Percent, Ticket, RefreshCw, TrendingUp, TrendingDown, Activity,
  CalendarDays, Target, UserCheck, Edit2, Trash2, Hash, BarChart3, Building2, Eye, Timer, Star, 
  GamepadIcon, TrendingUp as TrendingUpIcon, CalendarIcon, Expand, Minimize2
} from 'lucide-react';
import {
  format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears, isToday, isYesterday, isTomorrow
} from 'date-fns';

interface BookingView {
  id: string;
  booking_id: string;
  access_code: string;
  created_at: string;
  last_accessed_at?: string;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  original_price?: number | null;
  final_price?: number | null;
  discount_percentage?: number | null;
  coupon_code?: string | null;
  booking_group_id?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
  payment_mode?: string | null;
  payment_txn_id?: string | null;
  station: {
    name: string;
    type: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    created_at?: string;
  };
  booking_views?: BookingView[];
  created_at?: string;
}

interface CustomerInsight {
  name: string;
  phone: string;
  email?: string | null;
  totalBookings: number;
  totalDuration: number;
  totalSpent: number;
  averageBookingDuration: number;
  preferredTime: string;
  preferredStation: string;
  mostUsedCoupon: string | null;
  lastBookingDate: string;
  completionRate: number;
  favoriteStationType: string;
  bookingFrequency: 'High' | 'Medium' | 'Low';
}

interface Filters {
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  stationType: string;
  search: string;
  accessCode: string;
  coupon: string;
  priceRange: string;
  duration: string;
  customerType: string;
  paymentStatus: string;
}

interface CouponAnalytics {
  totalCouponsUsed: number;
  uniqueCoupons: number;
  totalDiscountGiven: number;
  revenueWithCoupons: number;
  revenueWithoutCoupons: number;
  averageDiscountPercentage: number;
  couponConversionRate: number;
  topPerformingCoupons: Array<{
    code: string;
    usageCount: number;
    totalRevenue: number;
    totalDiscount: number;
    avgDiscountPercent: number;
    uniqueCustomers: number;
    conversionRate: number;
  }>;
  couponTrends: Record<string, number>;
  customerSegmentation: {
    newCustomersWithCoupons: number;
    returningCustomersWithCoupons: number;
  };
}

interface Analytics {
  revenue: {
    total: number;
    trend: number;
    avgPerBooking: number;
    avgPerCustomer: number;
  };
  bookings: {
    total: number;
    trend: number;
    completionRate: number;
    noShowRate: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    retentionRate: number;
  };
  stations: {
    utilization: Record<string, { bookings: number; revenue: number; avgDuration: number }>;
    peakHours: Record<string, number>;
  };
  coupons: CouponAnalytics;
}

// Add new interface for calendar booking
interface CalendarBooking extends Booking {
  startHour: number;
  endHour: number;
  startMinute: number;
  endMinute: number;
  heightPercentage: number;
  topPercentage: number;
}

const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { from: format(yesterday, 'yyyy-MM-dd'), to: format(yesterday, 'yyyy-MM-dd') };
    case 'last7days':
      return { from: format(subDays(now, 6), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'last30days':
      return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'thismonth':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'lastmonth':
      const lastMonth = subMonths(now, 1);
      return { from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), to: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
    case 'last3months':
      return { from: format(subMonths(now, 2), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'thisyear':
      return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
    case 'lastyear':
      const lastYear = subYears(now, 1);
      return { from: format(startOfYear(lastYear), 'yyyy-MM-dd'), to: format(endOfYear(lastYear), 'yyyy-MM-dd') };
    case 'alltime':
      return { from: '2020-01-01', to: format(now, 'yyyy-MM-dd') };
    default:
      return null;
  }
};

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<Filters>({
    datePreset: 'last7days',
    dateFrom: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    status: 'all',
    stationType: 'all',
    search: '',
    accessCode: '',
    coupon: 'all',
    priceRange: 'all',
    duration: 'all',
    customerType: 'all',
    paymentStatus: 'all'
  });

  const [couponOptions, setCouponOptions] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  // NEW: Calendar view state
  const [calendarView, setCalendarView] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedCalendarBookings, setExpandedCalendarBookings] = useState<Set<string>>(new Set());

  const extractCouponCodes = (coupon_code: string) =>
    coupon_code.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('booking-management-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDatePresetChange = (preset: string) => {
    if (preset === 'custom') {
      setFilters(prev => ({ ...prev, datePreset: 'custom' }));
      return;
    }
    
    const dateRange = getDateRangeFromPreset(preset);
    if (dateRange) {
      setFilters(prev => ({
        ...prev,
        datePreset: preset,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      }));
    }
  };

  const handleManualDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    setFilters(prev => ({
      ...prev,
      datePreset: 'custom',
      [field]: value
    }));
  };

  const getDateRangeLabel = () => {
    if (filters.datePreset === 'custom') {
      return `${filters.dateFrom} to ${filters.dateTo}`;
    }
    
    const presetLabels: Record<string, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      last7days: 'Last 7 Days',
      last30days: 'Last 30 Days',
      thismonth: 'This Month',
      lastmonth: 'Last Month',
      last3months: 'Last 3 Months',
      thisyear: 'This Year',
      lastyear: 'Last Year',
      alltime: 'All Time'
    };
    
    return presetLabels[filters.datePreset] || `${filters.dateFrom} to ${filters.dateTo}`;
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const analyticsFromDate = filters.datePreset === 'alltime' 
        ? '2020-01-01' 
        : format(subDays(new Date(), 60), 'yyyy-MM-dd');
      
      // Fetch all bookings using pagination to bypass 1000 record limit
      let page = 0;
      const pageSize = 1000;
      let allBookingsData: any[] = [];
      let finished = false;

      while (!finished) {
        const { data: bookingsData, error } = await supabase
          .from('bookings')
          .select(`
            id,
            booking_date,
            start_time,
            end_time,
            duration,
            status,
            notes,
            original_price,
            final_price,
            discount_percentage,
            coupon_code,
            booking_group_id,
            status_updated_at,
            status_updated_by,
            payment_mode,
            payment_txn_id,
            station_id,
            customer_id,
            created_at,
            booking_views!booking_id (
              id,
              booking_id,
              access_code,
              created_at,
              last_accessed_at
            )
          `)
          .gte('booking_date', analyticsFromDate)
          .order('booking_date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (bookingsData && bookingsData.length > 0) {
          allBookingsData = [...allBookingsData, ...bookingsData];
          // If we got less than pageSize, we've reached the end
          if (bookingsData.length < pageSize) {
            finished = true;
          } else {
            page++;
          }
        } else {
          finished = true;
        }
      }

      const bookingsData = allBookingsData;

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setAllBookings([]);
        setCouponOptions([]);
        return;
      }

      const stationIds = [...new Set(bookingsData.map(b => b.station_id))];
      const customerIds = [...new Set(bookingsData.map(b => b.customer_id))];

      const [{ data: stationsData, error: stationsError }, { data: customersData, error: customersError }] =
        await Promise.all([
          supabase.from('stations').select('id, name, type').in('id', stationIds),
          supabase.from('customers').select('id, name, phone, email, created_at').in('id', customerIds)
        ]);

      if (stationsError) throw stationsError;
      if (customersError) throw customersError;

      const transformed = (bookingsData || []).map(b => {
        const station = stationsData?.find(s => s.id === b.station_id);
        const customer = customersData?.find(c => c.id === b.customer_id);
        return {
          id: b.id,
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          duration: b.duration,
          status: b.status,
          notes: b.notes ?? undefined,
          original_price: b.original_price ?? null,
          final_price: b.final_price ?? null,
          discount_percentage: b.discount_percentage ?? null,
          coupon_code: b.coupon_code ?? null,
          booking_group_id: b.booking_group_id ?? null,
          status_updated_at: b.status_updated_at ?? null,
          status_updated_by: b.status_updated_by ?? null,
          payment_mode: b.payment_mode ?? null,
          payment_txn_id: b.payment_txn_id ?? null,
          created_at: b.created_at,
          booking_views: b.booking_views || [],
          station: { name: station?.name || 'Unknown', type: station?.type || 'unknown' },
          customer: { 
            name: customer?.name || 'Unknown', 
            phone: customer?.phone || '', 
            email: customer?.email ?? null,
            created_at: customer?.created_at
          }
        } as Booking;
      });

      setAllBookings(transformed);
      const filtered = applyFilters(transformed);
      setBookings(filtered);

      const presentCodes = Array.from(
        new Set(
          transformed.flatMap(t => 
            (t.coupon_code || '')
              .split(',')
              .map(c => c.trim().toUpperCase())
              .filter(Boolean)
          )
        )
      ) as string[];
      setCouponOptions(presentCodes.sort());

    } catch (err) {
      console.error('Error fetching bookings:', err);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data: Booking[]) => {
    let filtered = data;

    if (filters.dateFrom && filters.dateTo) {
      filtered = filtered.filter(b => 
        b.booking_date >= filters.dateFrom && b.booking_date <= filters.dateTo
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(b => b.status === filters.status);
    }

    if (filters.stationType !== 'all') {
      filtered = filtered.filter(b => b.station.type === filters.stationType);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(b =>
        b.customer.name.toLowerCase().includes(q) ||
        b.customer.phone.includes(filters.search) ||
        (b.customer.email && b.customer.email.toLowerCase().includes(q)) ||
        b.station.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
      );
    }

    if (filters.accessCode) {
      filtered = filtered.filter(b => 
        (b.booking_views && b.booking_views.some(bv => bv.access_code.toLowerCase().includes(filters.accessCode.toLowerCase())))
      );
    }

    if (filters.coupon !== 'all') {
      if (filters.coupon === 'none') {
        filtered = filtered.filter(b => !b.coupon_code);
      } else {
        filtered = filtered.filter(b => {
          const codes = (b.coupon_code || '').split(',').map(c => c.trim().toUpperCase());
          return codes.includes(filters.coupon.toUpperCase());
        });
      }
    }

    if (filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(b => {
        const price = b.final_price || 0;
        if (max) return price >= min && price <= max;
        return price >= min;
      });
    }

    if (filters.duration !== 'all') {
      const [minDur, maxDur] = filters.duration.split('-').map(Number);
      filtered = filtered.filter(b => {
        if (maxDur) return b.duration >= minDur && b.duration <= maxDur;
        return b.duration >= minDur;
      });
    }

    if (filters.customerType !== 'all') {
      const thirtyDaysAgo = subDays(new Date(), 30);
      filtered = filtered.filter(b => {
        const customerCreated = new Date((b.customer as any).created_at || b.created_at);
        const isNewCustomer = customerCreated > thirtyDaysAgo;
        
        if (filters.customerType === 'new') return isNewCustomer;
        if (filters.customerType === 'returning') return !isNewCustomer;
        return true;
      });
    }

    if (filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'paid') {
        filtered = filtered.filter(b => b.payment_mode && b.payment_mode !== 'venue');
      } else if (filters.paymentStatus === 'unpaid') {
        filtered = filtered.filter(b => !b.payment_mode || b.payment_mode === 'venue');
      } else if (filters.paymentStatus === 'razorpay') {
        filtered = filtered.filter(b => b.payment_mode === 'razorpay');
      }
    }

    return filtered;
  };

  useEffect(() => {
    const filtered = applyFilters(allBookings);
    setBookings(filtered);
  }, [filters, allBookings]);

  // NEW: Function to generate calendar time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 11; hour <= 23; hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const timeLabel = hour === 12 ? '12:00 PM' : `${displayHour}:00 ${ampm}`;
      slots.push({
        hour,
        label: timeLabel,
        fullLabel: `${hour.toString().padStart(2, '0')}:00:00`
      });
    }
    return slots;
  };

  // NEW: Process bookings for calendar view
  const calendarBookings = useMemo((): CalendarBooking[] => {
    const dayBookings = allBookings.filter(b => b.booking_date === selectedCalendarDate);
    
    return dayBookings.map(booking => {
      const startTime = new Date(`2000-01-01T${booking.start_time}`);
      let endTime = new Date(`2000-01-01T${booking.end_time}`);
      
      // Handle midnight crossover (00:00:00 means next day)
      if (booking.end_time === '00:00:00' || (endTime.getHours() === 0 && endTime.getMinutes() === 0)) {
        endTime = new Date(`2000-01-02T00:00:00`);
      }
      
      const startHour = startTime.getHours();
      let endHour = endTime.getHours();
      const startMinute = startTime.getMinutes();
      let endMinute = endTime.getMinutes();
      
      // If end time is midnight (next day), set to 24:00 (end of day)
      if (endTime.getDate() === 2) {
        endHour = 24;
        endMinute = 0;
      }
      
      // Calculate position and height as percentage of the calendar view (11 AM to 11 PM = 12 hours)
      // For bookings that extend past 11 PM, cap them at 11 PM
      const startMinutesFromEleven = Math.max(0, (startHour - 11) * 60 + startMinute);
      const endMinutesFromEleven = Math.min(12 * 60, (endHour - 11) * 60 + endMinute);
      const totalMinutesInView = 12 * 60; // 11 AM to 11 PM = 720 minutes
      
      const durationMinutes = Math.max(0, endMinutesFromEleven - startMinutesFromEleven);
      
      const topPercentage = (startMinutesFromEleven / totalMinutesInView) * 100;
      const heightPercentage = (durationMinutes / totalMinutesInView) * 100;
      
      return {
        ...booking,
        startHour,
        endHour: Math.min(endHour, 23), // Cap at 23 for display
        startMinute,
        endMinute,
        topPercentage: Math.max(0, Math.min(100, topPercentage)),
        heightPercentage: Math.max(0.5, Math.min(100 - topPercentage, heightPercentage)) // Minimum 0.5% for visibility
      };
    }).filter(booking => {
      // Only show bookings that start between 11 AM and 11 PM
      return booking.startHour >= 11 && booking.startHour <= 23;
    });
  }, [allBookings, selectedCalendarDate]);

  const toggleCalendarBookingExpansion = (bookingId: string) => {
    setExpandedCalendarBookings(prev => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  // NEW: Enhanced calendar day view component
  const CalendarDayView = () => {
    const timeSlots = generateTimeSlots();
    const totalBookings = calendarBookings.length;
    const completedBookings = calendarBookings.filter(b => b.status === 'completed').length;
    const couponBookings = calendarBookings.filter(b => b.coupon_code).length;
    const totalRevenue = calendarBookings.reduce((sum, b) => sum + (b.final_price || 0), 0);

    return (
      <Card className="bg-background border-border shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
              Calendar View - {getDateLabel(selectedCalendarDate)}
            </CardTitle>
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={selectedCalendarDate}
                onChange={(e) => setSelectedCalendarDate(e.target.value)}
                className="h-10 border-2 transition-colors border-border focus:border-blue-400"
              />
              <Button
                variant="outline"
                onClick={() => setCalendarView(false)}
                className="flex items-center gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                List View
              </Button>
            </div>
          </div>
          
          {/* Daily Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-background rounded-lg border border-border shadow-sm">
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-bold text-blue-600">{totalBookings}</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border border-border shadow-sm">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedBookings}</p>
              <p className="text-xs text-muted-foreground">{totalBookings ? Math.round((completedBookings/totalBookings)*100) : 0}%</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border border-border shadow-sm">
              <p className="text-sm text-muted-foreground">With Coupons</p>
              <p className="text-2xl font-bold text-purple-600">{couponBookings}</p>
              <p className="text-xs text-muted-foreground">{totalBookings ? Math.round((couponBookings/totalBookings)*100) : 0}%</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border border-border shadow-sm">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {totalBookings === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium">No bookings for this day</p>
              <p>Select a different date or check your filters</p>
            </div>
          ) : (
            <div className="flex overflow-x-auto">
              {/* Time Labels - Fixed width for better alignment */}
              <div className="w-24 flex-shrink-0 border-r border-border bg-muted/20 sticky left-0 z-10">
                <div className="h-12 border-b border-border bg-muted/30"></div> {/* Header spacer */}
                {timeSlots.map(slot => (
                  <div key={slot.hour} className="h-16 border-b border-border flex items-start justify-end pr-3 pt-1.5 bg-background/50">
                    <span className="text-sm font-semibold text-foreground">
                      {slot.label}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="flex-1 relative">
                {/* Hour Grid Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="h-12 border-b-2 border-border bg-muted/10"></div> {/* Header spacer */}
                  {timeSlots.map((slot, index) => (
                    <div 
                      key={slot.hour} 
                      className={`h-16 border-b ${index === timeSlots.length - 1 ? 'border-b-2' : 'border-b'} border-border/50`}
                    ></div>
                  ))}
                </div>
                
                {/* Current Time Indicator */}
                {selectedCalendarDate === format(new Date(), 'yyyy-MM-dd') && (() => {
                  const now = new Date();
                  const currentHour = now.getHours();
                  const currentMinute = now.getMinutes();
                  
                  if (currentHour >= 11 && currentHour <= 23) {
                    const minutesFromEleven = (currentHour - 11) * 60 + currentMinute;
                    // Calculate position: header (3rem) + percentage of grid area (48rem)
                    const headerHeightRem = 3; // h-12 = 3rem
                    const gridHeightRem = 48; // 12 * 4rem = 48rem
                    const topPositionRem = headerHeightRem + (minutesFromEleven / (12 * 60)) * gridHeightRem;
                    
                    return (
                      <div 
                        className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 shadow-sm"
                        style={{ top: `${topPositionRem}rem` }}
                      >
                        <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                        <div className="absolute left-2 -top-6 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                          {format(now, 'HH:mm')}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Bookings Container - Fixed height matching grid */}
                <div className="relative" style={{ paddingTop: '3rem', height: '48rem' }}>
                  {calendarBookings.map((booking) => {
                    const isExpanded = expandedCalendarBookings.has(booking.id);
                    
                    // Find all bookings that overlap with this one (including itself)
                    const overlappingBookings = calendarBookings.filter(b => {
                      if (b.id === booking.id) return true;
                      // Check if bookings overlap in time
                      const bStart = b.startHour * 60 + b.startMinute;
                      const bEnd = b.endHour * 60 + (b.endMinute || 0);
                      const bookingStart = booking.startHour * 60 + booking.startMinute;
                      const bookingEnd = booking.endHour * 60 + (booking.endMinute || 0);
                      
                      return (bStart < bookingEnd && bEnd > bookingStart);
                    }).sort((a, b) => {
                      // Sort by start time, then by booking ID for consistent ordering
                      const aStart = a.startHour * 60 + a.startMinute;
                      const bStart = b.startHour * 60 + b.startMinute;
                      if (aStart !== bStart) return aStart - bStart;
                      return a.id.localeCompare(b.id);
                    });
                    
                    const overlapIndex = overlappingBookings.findIndex(b => b.id === booking.id);
                    const overlapCount = overlappingBookings.length;
                    
                    // Calculate width and left position for overlapping bookings
                    const width = overlapCount > 1 ? `${95 / overlapCount}%` : '95%';
                    const left = overlapCount > 1 ? `${(overlapIndex * (95 / overlapCount)) + 2.5}%` : '2.5%';
                    
                    // Calculate top position: header (3rem) + percentage of grid (48rem)
                    const headerHeightRem = 3; // h-12 = 3rem
                    const gridHeightRem = 48; // 12 * 4rem = 48rem
                    const topPositionRem = headerHeightRem + (booking.topPercentage / 100) * gridHeightRem;
                    const heightPositionRem = (booking.heightPercentage / 100) * gridHeightRem;
                    
                    return (
                      <div
                        key={booking.id}
                        className={`absolute rounded-lg border-2 cursor-pointer transition-all duration-200 z-20 ${
                          booking.coupon_code 
                            ? 'bg-gradient-to-r from-purple-100 to-purple-50 border-purple-300 shadow-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 dark:border-purple-500' 
                            : 'bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300 shadow-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 dark:border-blue-500'
                        } ${isExpanded ? 'shadow-lg z-30' : 'shadow-sm hover:shadow-md'}`}
                        style={{
                          top: `${topPositionRem}rem`,
                          height: `${Math.max(heightPositionRem, 2)}rem`, // Minimum 2rem for visibility
                          left,
                          width
                        }}
                        onClick={() => toggleCalendarBookingExpansion(booking.id)}
                      >
                        <div className="p-2 h-full overflow-hidden">
                          {/* Compact View */}
                          {!isExpanded && (
                            <div className="h-full flex flex-col justify-between">
                              <div>
                                <div className={`text-sm font-semibold truncate ${
                                  booking.coupon_code ? 'text-purple-800' : 'text-blue-800'
                                }`}>
                                  {booking.customer.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {booking.station.name}
                                </div>
                                <div className="text-xs font-medium flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <BookingStatusBadge status={booking.status} />
                                <div className="flex items-center gap-1">
                                  {booking.payment_mode && booking.payment_mode !== 'venue' && (
                                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                      💳 {booking.payment_mode === 'razorpay' ? 'Razorpay' : booking.payment_mode}
                                    </Badge>
                                  )}
                                  {(!booking.payment_mode || booking.payment_mode === 'venue') && (
                                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                      💰 Venue
                                    </Badge>
                                  )}
                                  {booking.coupon_code && (
                                    <Gift className="h-3 w-3 text-purple-600" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Expanded View */}
                          {isExpanded && (
                            <div className="space-y-3 text-sm overflow-y-auto max-h-full">
                              <div className="flex items-center justify-between">
                                <div className={`font-bold text-lg ${
                                  booking.coupon_code ? 'text-purple-800' : 'text-blue-800'
                                }`}>
                                  {booking.customer.name}
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditBooking(booking);
                                  }}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Phone:</span>
                                  <div className="font-medium">{booking.customer.phone}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Station:</span>
                                  <div className="font-medium">{booking.station.name}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Duration:</span>
                                  <div className="font-medium">{booking.duration} min</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Price:</span>
                                  <div className="font-medium">₹{booking.final_price}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <BookingStatusBadge status={booking.status} />
                                {booking.payment_mode && booking.payment_mode !== 'venue' && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                    💳 {booking.payment_mode === 'razorpay' ? 'Razorpay' : booking.payment_mode}
                                  </Badge>
                                )}
                                {(!booking.payment_mode || booking.payment_mode === 'venue') && (
                                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                    💰 Venue
                                  </Badge>
                                )}
                                {booking.coupon_code && (
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <Gift className="h-2 w-2" />
                                    {booking.coupon_code}
                                  </Badge>
                                )}
                              </div>
                              
                              {booking.payment_txn_id && (
                                <div className="p-2 bg-blue-500/10 rounded text-xs border border-blue-500/20">
                                  <span className="text-blue-600 font-medium">Transaction ID: </span>
                                  <span className="text-blue-400 font-mono text-[10px]">{booking.payment_txn_id}</span>
                                </div>
                              )}
                              {booking.notes && (
                                <div className="p-2 bg-muted/50 rounded text-xs">
                                  <span className="text-muted-foreground">Notes: </span>
                                  {booking.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const customerInsights = useMemo((): CustomerInsight[] => {
    const customerMap = new Map<string, CustomerInsight>();

    bookings.forEach(booking => {
      const customerId = booking.customer.name;
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          name: booking.customer.name,
          phone: booking.customer.phone,
          email: booking.customer.email,
          totalBookings: 0,
          totalDuration: 0,
          totalSpent: 0,
          averageBookingDuration: 0,
          preferredTime: '',
          preferredStation: '',
          mostUsedCoupon: null,
          lastBookingDate: '',
          completionRate: 0,
          favoriteStationType: '',
          bookingFrequency: 'Low'
        });
      }

      const customer = customerMap.get(customerId)!;
      customer.totalBookings++;
      customer.totalDuration += booking.duration;
      customer.totalSpent += booking.final_price || 0;
      
      if (!customer.lastBookingDate || booking.booking_date > customer.lastBookingDate) {
        customer.lastBookingDate = booking.booking_date;
      }
    });

    customerMap.forEach((customer, customerId) => {
      customer.averageBookingDuration = Math.round(customer.totalDuration / customer.totalBookings);
      
      const customerBookings = bookings.filter(b => b.customer.name === customerId);
      const completedBookings = customerBookings.filter(b => b.status === 'completed').length;
      customer.completionRate = Math.round((completedBookings / customer.totalBookings) * 100);
      
      const timeMap = new Map<number, number>();
      customerBookings.forEach(b => {
        const hour = new Date(`2000-01-01T${b.start_time}`).getHours();
        timeMap.set(hour, (timeMap.get(hour) || 0) + 1);
      });
      const mostCommonHour = Array.from(timeMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (mostCommonHour) {
        const hour = mostCommonHour[0];
        customer.preferredTime = hour === 0 ? '12:00 AM' : 
                                hour < 12 ? `${hour}:00 AM` : 
                                hour === 12 ? '12:00 PM' : 
                                `${hour - 12}:00 PM`;
      }
      
      const stationMap = new Map<string, number>();
      customerBookings.forEach(b => {
        stationMap.set(b.station.name, (stationMap.get(b.station.name) || 0) + 1);
      });
      const mostCommonStation = Array.from(stationMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (mostCommonStation) {
        customer.preferredStation = mostCommonStation[0];
      }
      
      const typeMap = new Map<string, number>();
      customerBookings.forEach(b => {
        typeMap.set(b.station.type, (typeMap.get(b.station.type) || 0) + 1);
      });
      const mostCommonType = Array.from(typeMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (mostCommonType) {
        customer.favoriteStationType = mostCommonType[0];
      }
      
      const couponMap = new Map<string, number>();
      customerBookings.forEach(b => {
        if (b.coupon_code) {
          const codes = extractCouponCodes(b.coupon_code);
          codes.forEach(code => {
            couponMap.set(code, (couponMap.get(code) || 0) + 1);
          });
        }
      });
      const mostUsedCoupon = Array.from(couponMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (mostUsedCoupon) {
        customer.mostUsedCoupon = mostUsedCoupon[0];
      }
      
      const daysSinceFirst = Math.ceil((new Date().getTime() - new Date(customer.lastBookingDate).getTime()) / (1000 * 60 * 60 * 24));
      const bookingsPerWeek = (customer.totalBookings / daysSinceFirst) * 7;
      
      if (bookingsPerWeek >= 2) customer.bookingFrequency = 'High';
      else if (bookingsPerWeek >= 0.5) customer.bookingFrequency = 'Medium';
      else customer.bookingFrequency = 'Low';
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [bookings]);

  const analytics = useMemo((): Analytics => {
    const currentPeriodData = bookings;
    const previousPeriodStart = format(subDays(new Date(filters.dateFrom), 
      Math.max(1, Math.ceil((new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / (1000 * 60 * 60 * 24)))), 'yyyy-MM-dd');
    
    const previousPeriodData = allBookings.filter(b => 
      b.booking_date >= previousPeriodStart && b.booking_date < filters.dateFrom
    );

    const customerFirstBooking: Record<string, string> = {};
    allBookings.forEach(b => {
      if (!customerFirstBooking[b.customer.name] || b.booking_date < customerFirstBooking[b.customer.name]) {
        customerFirstBooking[b.customer.name] = b.booking_date;
      }
    });

    const uniqueCustomersSet = new Set(currentPeriodData.map(b => b.customer.name));
    const totalCustomers = uniqueCustomersSet.size;

    const newCustomersCount = Array.from(uniqueCustomersSet).filter(
      name => {
        const firstBookingDate = customerFirstBooking[name];
        return firstBookingDate >= filters.dateFrom && firstBookingDate <= filters.dateTo;
      }
    ).length;

    const returningCustomers = totalCustomers - newCustomersCount;
    const retentionRate = totalCustomers ? (returningCustomers / totalCustomers) * 100 : 0;

    const currentRevenue = currentPeriodData.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const previousRevenue = previousPeriodData.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const revenueTrend = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const currentBookingCount = currentPeriodData.length;
    const previousBookingCount = previousPeriodData.length;
    const bookingTrend = previousBookingCount ? ((currentBookingCount - previousBookingCount) / previousBookingCount) * 100 : 0;

    const completedBookings = currentPeriodData.filter(b => b.status === 'completed').length;
    const noShowBookings = currentPeriodData.filter(b => b.status === 'no-show').length;
    const completionRate = currentBookingCount ? (completedBookings / currentBookingCount) * 100 : 0;
    const noShowRate = currentBookingCount ? (noShowBookings / currentBookingCount) * 100 : 0;

    const stationStats: Record<string, { bookings: number; revenue: number; avgDuration: number }> = {};
    const hourlyStats: Record<string, number> = {};

    currentPeriodData.forEach(b => {
      const stationKey = `${b.station.name} (${b.station.type})`;
      if (!stationStats[stationKey]) {
        stationStats[stationKey] = { bookings: 0, revenue: 0, avgDuration: 0 };
      }
      
      stationStats[stationKey].bookings += 1;
      stationStats[stationKey].revenue += b.final_price || 0;
      stationStats[stationKey].avgDuration += b.duration;

      const hour = new Date(`2000-01-01T${b.start_time}`).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    Object.keys(stationStats).forEach(key => {
      if (stationStats[key].bookings > 0) {
        stationStats[key].avgDuration = Math.round(stationStats[key].avgDuration / stationStats[key].bookings);
      }
    });

    const couponStats: Record<string, {
      usageCount: number;
      totalRevenue: number;
      totalDiscount: number;
      uniqueCustomers: Set<string>;
      bookings: Booking[];
    }> = {};

    currentPeriodData.forEach(b => {
      if (!b.coupon_code) return;
      const codes = extractCouponCodes(b.coupon_code);
      codes.forEach(code => {
        if (!couponStats[code]) {
          couponStats[code] = {
            usageCount: 0,
            totalRevenue: 0,
            totalDiscount: 0,
            uniqueCustomers: new Set(),
            bookings: []
          };
        }
        couponStats[code].usageCount += 1;
        couponStats[code].totalRevenue += b.final_price || 0;
        couponStats[code].uniqueCustomers.add(b.customer.name);
        couponStats[code].bookings.push(b);
        if (b.discount_percentage && b.final_price) {
          const discountAmount = (b.final_price * b.discount_percentage) / (100 - b.discount_percentage);
          couponStats[code].totalDiscount += discountAmount;
        }
      });
    });

    const totalCouponsUsed = Object.values(couponStats).reduce((sum, stat) => sum + stat.usageCount, 0);
    const uniqueCoupons = Object.keys(couponStats).length;
    const revenueWithCoupons = Object.values(couponStats).reduce((sum, stat) => sum + stat.totalRevenue, 0);
    const revenueWithoutCoupons = currentRevenue - revenueWithCoupons;
    const totalDiscountGiven = Object.values(couponStats).reduce((sum, stat) => sum + stat.totalDiscount, 0);
    
    const averageDiscountPercentage = totalCouponsUsed > 0
      ? Object.values(couponStats).reduce((sum, stat) => {
        const avgForThisCoupon = stat.bookings.length > 0 
          ? stat.bookings.reduce((s, b) => s + (b.discount_percentage || 0), 0) / stat.bookings.length
          : 0;
        return sum + (avgForThisCoupon * stat.usageCount);
      }, 0) / totalCouponsUsed
      : 0;

    const couponConversionRate = currentBookingCount > 0 ? (totalCouponsUsed / currentBookingCount) * 100 : 0;

    const newCustomersWithCoupons = Object.values(couponStats)
      .reduce((set, stat) => {
        stat.uniqueCustomers.forEach(customer => {
          const firstBooking = customerFirstBooking[customer];
          if (firstBooking >= filters.dateFrom && firstBooking <= filters.dateTo) {
            set.add(customer);
          }
        });
        return set;
      }, new Set<string>()).size;

    const returningCustomersWithCoupons = Object.values(couponStats)
      .reduce((set, stat) => {
        stat.uniqueCustomers.forEach(customer => {
          const firstBooking = customerFirstBooking[customer];
          if (firstBooking < filters.dateFrom) {
            set.add(customer);
          }
        });
        return set;
      }, new Set<string>()).size;

    const topPerformingCoupons = Object.entries(couponStats)
      .map(([code, stat]) => ({
        code,
        usageCount: stat.usageCount,
        totalRevenue: stat.totalRevenue,
        totalDiscount: stat.totalDiscount,
        avgDiscountPercent: stat.bookings.length > 0 
          ? stat.bookings.reduce((sum, b) => sum + (b.discount_percentage || 0), 0) / stat.bookings.length
          : 0,
        uniqueCustomers: stat.uniqueCustomers.size,
        conversionRate: stat.uniqueCustomers.size > 0 ? (stat.usageCount / stat.uniqueCustomers.size) * 100 : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const couponTrends: Record<string, number> = {};
    currentPeriodData.forEach(b => {
      if (b.coupon_code) {
        couponTrends[b.booking_date] = (couponTrends[b.booking_date] || 0) + 1;
      }
    });

    const couponAnalytics: CouponAnalytics = {
      totalCouponsUsed,
      uniqueCoupons,
      totalDiscountGiven,
      revenueWithCoupons,
      revenueWithoutCoupons,
      averageDiscountPercentage,
      couponConversionRate,
      topPerformingCoupons,
      couponTrends,
      customerSegmentation: {
        newCustomersWithCoupons,
        returningCustomersWithCoupons
      }
    };

    return {
      revenue: {
        total: currentRevenue,
        trend: revenueTrend,
        avgPerBooking: currentBookingCount ? Math.round(currentRevenue / currentBookingCount) : 0,
        avgPerCustomer: totalCustomers ? Math.round(currentRevenue / totalCustomers) : 0,
      },
      bookings: {
        total: currentBookingCount,
        trend: bookingTrend,
        completionRate,
        noShowRate,
      },
      customers: {
        total: totalCustomers,
        new: newCustomersCount,
        returning: returningCustomers,
        retentionRate,
      },
      stations: {
        utilization: stationStats,
        peakHours: hourlyStats,
      },
      coupons: couponAnalytics
    };
  }, [bookings, allBookings, filters]);

  const handleEditBooking = (booking: Booking) => { 
    setSelectedBooking(booking); 
    setEditDialogOpen(true); 
  };

  const handleDeleteBooking = (booking: Booking) => { 
    setSelectedBooking(booking); 
    setDeleteDialogOpen(true); 
  };

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
        setExpandedCustomers(old => new Set(Array.from(old).filter(key => !key.startsWith(date + '::'))));
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleCustomerExpansion = (dateCustomerKey: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(dateCustomerKey)) next.delete(dateCustomerKey);
      else next.add(dateCustomerKey);
      return next;
    });
  };

  const exportBookings = () => {
    const csvContent = [
      ['Date', 'Booking ID', 'View Access Code', 'Start', 'End', 'Duration', 'Station', 'Station Type', 'Customer', 'Phone', 'Email', 'Status', 'Original Price', 'Final Price', 'Discount%', 'Discount Amount', 'Coupon', 'Notes'].join(','),
      ...bookings.map(b => {
        const discountAmount = (b.discount_percentage && b.final_price) 
          ? (b.final_price * b.discount_percentage) / (100 - b.discount_percentage)
          : 0;
        const accessCode = b.booking_views?.[0]?.access_code || '';
        
        return [
          b.booking_date,
          b.id,
          accessCode,
          b.start_time,
          b.end_time,
          b.duration,
          b.station.name.replace(/,/g, ' '),
          b.station.type,
          b.customer.name.replace(/,/g, ' '),
          b.customer.phone,
          b.customer.email || '',
          b.status,
          b.original_price ?? 0,
          b.final_price ?? 0,
          b.discount_percentage ?? 0,
          Math.round(discountAmount),
          b.coupon_code || '',
          (b.notes || '').replace(/,/g, ' ')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuephoria-bookings-${getDateRangeLabel().replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    const defaultDateRange = getDateRangeFromPreset('last7days')!;
    setFilters({
      datePreset: 'last7days',
      dateFrom: defaultDateRange.from,
      dateTo: defaultDateRange.to,
      status: 'all',
      stationType: 'all',
      search: '',
      accessCode: '',
      coupon: 'all',
      priceRange: 'all',
      duration: 'all',
      customerType: 'all',
      paymentStatus: 'all'
    });
  };

  const formatTime = (timeString: string) =>
    new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });

  const getStationTypeLabel = (type: string) => 
    type === 'ps5' ? 'PlayStation 5' : type === '8ball' ? '8-Ball Pool' : type;

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d, yyyy');
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const groupedBookings = useMemo(() => {
    const byDate: Record<string, Record<string, Booking[]>> = {};
    bookings.forEach(b => {
      const d = b.booking_date;
      const cust = b.customer.name || 'Unknown';
      byDate[d] ||= {};
      byDate[d][cust] ||= [];
      byDate[d][cust].push(b);
    });
    return byDate;
  }, [bookings]);

  const topStations = Object.entries(analytics.stations.utilization)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header - Modified to include calendar toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text font-heading">
            Booking Management
          </h1>
          <p className="text-muted-foreground">
            Comprehensive booking analytics and marketing campaign insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setCalendarView(!calendarView)} 
            variant={calendarView ? "default" : "outline"} 
            className="flex items-center gap-2"
          >
            {calendarView ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            {calendarView ? 'List View' : 'Calendar View'}
          </Button>
          <Button onClick={exportBookings} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={fetchBookings} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={() => window.open('https://admin.cuephoria.in/public/booking', '_blank', 'noopener,noreferrer')}
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Calendar View Toggle */}
      {calendarView && <CalendarDayView />}

      {/* Show existing content only when not in calendar view */}
      {!calendarView && (
        <>
          {/* Advanced Filters */}
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Filter className="h-5 w-5 text-blue-600" />
                  Advanced Filters
                </CardTitle>
                <Button variant="outline" size="sm" onClick={resetFilters} className="hover:bg-red-50 hover:border-red-200 hover:text-red-600">
                  Reset All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range Section */}
              <div>
                <Label className="text-sm font-semibold text-foreground mb-3 block">Date Range</Label>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
                      <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">🌅 Today</SelectItem>
                        <SelectItem value="yesterday">🌄 Yesterday</SelectItem>
                        <SelectItem value="last7days">📅 Last 7 Days</SelectItem>
                        <SelectItem value="last30days">📊 Last 30 Days</SelectItem>
                        <SelectItem value="thismonth">🗓️ This Month</SelectItem>
                        <SelectItem value="lastmonth">📋 Last Month</SelectItem>
                        <SelectItem value="last3months">📈 Last 3 Months</SelectItem>
                        <SelectItem value="thisyear">🎯 This Year</SelectItem>
                        <SelectItem value="lastyear">📜 Last Year</SelectItem>
                        <SelectItem value="alltime">🌍 All Time</SelectItem>
                        <SelectItem value="custom">🎛️ Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleManualDateChange('dateFrom', e.target.value)}
                      className="h-11 border-2 transition-colors border-border focus:border-blue-400"
                    />
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleManualDateChange('dateTo', e.target.value)}
                      className="h-11 border-2 transition-colors border-border focus:border-blue-400"
                    />
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex items-center">
                    <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {getDateRangeLabel()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                      <SelectItem value="in-progress">⏳ In Progress</SelectItem>
                      <SelectItem value="completed">✅ Completed</SelectItem>
                      <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                      <SelectItem value="no-show">⚠️ No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Station Type</Label>
                  <Select value={filters.stationType} onValueChange={(value) => setFilters(prev => ({ ...prev, stationType: value }))}>
                    <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="ps5">🎮 PlayStation 5</SelectItem>
                      <SelectItem value="8ball">🎱 8-Ball Pool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Coupon Code</Label>
                  <Select value={filters.coupon} onValueChange={(value) => setFilters(prev => ({ ...prev, coupon: value }))}>
                    <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Coupons</SelectItem>
                      <SelectItem value="none">🚫 No Coupon Used</SelectItem>
                      {couponOptions.map(code => (
                        <SelectItem key={code} value={code}>
                          <div className="flex items-center gap-2">
                            <Gift className="h-3 w-3 text-purple-500" />
                            {code}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Price Range</Label>
                  <Select value={filters.priceRange} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}>
                    <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="0-100">💰 ₹0 - ₹100</SelectItem>
                      <SelectItem value="101-300">💰 ₹101 - ₹300</SelectItem>
                      <SelectItem value="301-500">💰 ₹301 - ₹500</SelectItem>
                      <SelectItem value="500">💰 ₹500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Customer Type</Label>
                  <Select value={filters.customerType} onValueChange={(value) => setFilters(prev => ({ ...prev, customerType: value }))}>
                    <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="new">🆕 New Customers</SelectItem>
                      <SelectItem value="returning">🔄 Returning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Payment Status</Label>
                  <Select value={filters.paymentStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, paymentStatus: value }))}>
                    <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payments</SelectItem>
                      <SelectItem value="paid">💳 Paid Online</SelectItem>
                      <SelectItem value="unpaid">💰 Pay at Venue</SelectItem>
                      <SelectItem value="razorpay">🔷 Razorpay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Duration</Label>
                  <Select value={filters.duration} onValueChange={(value) => setFilters(prev => ({ ...prev, duration: value }))}>
                    <SelectTrigger className="h-11 border-2 border-border focus:border-blue-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Duration</SelectItem>
                      <SelectItem value="0-60">⏱️ 0-60 mins</SelectItem>
                      <SelectItem value="61-120">⏱️ 61-120 mins</SelectItem>
                      <SelectItem value="121-180">⏱️ 121-180 mins</SelectItem>
                      <SelectItem value="180">⏱️ 180+ mins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">General Search</Label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Search by Customer Name, Phone, Email, Station, or Booking ID..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="h-12 pl-12 border-2 border-border focus:border-blue-400 transition-colors text-base"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Access Code Search</Label>
                    <div className="relative">
                      <Eye className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="Enter Access Code from booking views..."
                        value={filters.accessCode}
                        onChange={(e) => setFilters(prev => ({ ...prev, accessCode: e.target.value }))}
                        className="h-12 pl-12 border-2 border-border focus:border-blue-400 transition-colors text-base"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Dashboard */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="coupons">Coupons & Marketing</TabsTrigger>
              <TabsTrigger value="stations">Stations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                        <p className="text-2xl font-bold">{analytics.bookings.total}</p>
                        <div className={`flex items-center gap-1 text-xs ${getTrendColor(analytics.bookings.trend)}`}>
                          {getTrendIcon(analytics.bookings.trend)}
                          {Math.abs(analytics.bookings.trend).toFixed(1)}% vs prev period
                        </div>
                      </div>
                      <CalendarDays className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">₹{analytics.revenue.total.toLocaleString()}</p>
                        <div className={`flex items-center gap-1 text-xs ${getTrendColor(analytics.revenue.trend)}`}>
                          {getTrendIcon(analytics.revenue.trend)}
                          {Math.abs(analytics.revenue.trend).toFixed(1)}% vs prev period
                        </div>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Coupon Usage</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {analytics.coupons.couponConversionRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {analytics.coupons.totalCouponsUsed} of {analytics.bookings.total} bookings
                        </p>
                      </div>
                      <Gift className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-bold text-green-600">
                          {analytics.bookings.completionRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          No-show: {analytics.bookings.noShowRate.toFixed(1)}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Revenue with Coupons</p>
                        <p className="text-2xl font-bold text-purple-600">₹{analytics.coupons.revenueWithCoupons.toLocaleString()}</p>
                      </div>
                      <Megaphone className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Discount Given</p>
                        <p className="text-2xl font-bold text-orange-600">₹{Math.round(analytics.coupons.totalDiscountGiven).toLocaleString()}</p>
                      </div>
                      <Percent className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Unique Customers</p>
                        <p className="text-2xl font-bold">{analytics.customers.total}</p>
                        <p className="text-xs text-muted-foreground">
                          {analytics.customers.new} new, {analytics.customers.returning} returning
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Coupons</p>
                        <p className="text-2xl font-bold text-blue-600">{analytics.coupons.uniqueCoupons}</p>
                      </div>
                      <Tag className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="coupons" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Total Coupons Used</p>
                      <p className="text-3xl font-bold text-purple-600">{analytics.coupons.totalCouponsUsed}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analytics.coupons.couponConversionRate.toFixed(1)}% of all bookings
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Total Discount Given</p>
                      <p className="text-3xl font-bold text-orange-600">₹{Math.round(analytics.coupons.totalDiscountGiven).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Avg {analytics.coupons.averageDiscountPercentage.toFixed(1)}% per coupon
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Revenue with Coupons</p>
                      <p className="text-3xl font-bold text-green-600">₹{analytics.coupons.revenueWithCoupons.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {((analytics.coupons.revenueWithCoupons / analytics.revenue.total) * 100).toFixed(1)}% of total revenue
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Campaign ROI Impact</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {analytics.coupons.totalDiscountGiven > 0 
                          ? ((analytics.coupons.revenueWithCoupons / analytics.coupons.totalDiscountGiven)).toFixed(1)
                          : '0'
                        }x
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Revenue per ₹1 discount
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Top Performing Coupon Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.coupons.topPerformingCoupons.slice(0, 10).map((coupon, index) => (
                      <div key={coupon.code} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                            ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-600'}`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-lg">{coupon.code}</p>
                              <Badge variant="secondary" className="text-xs">
                                {coupon.usageCount} uses
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {coupon.uniqueCustomers} customers
                              </span>
                              <span className="flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                {coupon.avgDiscountPercent.toFixed(1)}% avg discount
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">₹{coupon.totalRevenue.toLocaleString()}</p>
                          <p className="text-sm text-red-600">-₹{Math.round(coupon.totalDiscount).toLocaleString()} discount</p>
                          <p className="text-xs text-muted-foreground">
                            {coupon.conversionRate.toFixed(1)}% repeat usage
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#1A1F2C] border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <UserCheck className="h-5 w-5" />
                      Customer Acquisition via Coupons
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="font-medium text-white">New Customers with Coupons</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">
                            {analytics.coupons.customerSegmentation.newCustomersWithCoupons}
                          </p>
                          <p className="text-xs text-gray-400">
                            {analytics.coupons.totalCouponsUsed > 0 
                              ? ((analytics.coupons.customerSegmentation.newCustomersWithCoupons / analytics.coupons.totalCouponsUsed) * 100).toFixed(1)
                              : 0
                            }% of coupon usage
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="font-medium text-white">Returning Customers with Coupons</span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-400">
                            {analytics.coupons.customerSegmentation.returningCustomersWithCoupons}
                          </p>
                          <p className="text-xs text-gray-400">
                            {analytics.coupons.totalCouponsUsed > 0 
                              ? ((analytics.coupons.customerSegmentation.returningCustomersWithCoupons / analytics.coupons.totalCouponsUsed) * 100).toFixed(1)
                              : 0
                            }% of coupon usage
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1F2C] border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Zap className="h-5 w-5" />
                      Marketing Campaign Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-purple-900/30 border border-purple-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">Coupon Adoption Rate</span>
                          <span className="text-2xl font-bold text-purple-400">
                            {analytics.coupons.couponConversionRate.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Customers using coupons vs total bookings
                        </p>
                      </div>

                      <div className="p-3 bg-orange-900/30 border border-orange-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">Average Discount Impact</span>
                          <span className="text-2xl font-bold text-orange-400">
                            {analytics.coupons.averageDiscountPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Average discount percentage across all coupons
                        </p>
                      </div>

                      <div className="p-3 bg-teal-900/30 border border-teal-700/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">Revenue Efficiency</span>
                          <span className="text-2xl font-bold text-teal-400">
                            ₹{analytics.coupons.totalCouponsUsed > 0 
                              ? Math.round(analytics.coupons.revenueWithCoupons / analytics.coupons.totalCouponsUsed)
                              : 0
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Average revenue per coupon redemption
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-3xl font-bold">₹{analytics.revenue.total.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Revenue with Coupons</p>
                      <p className="text-3xl font-bold text-purple-600">₹{analytics.coupons.revenueWithCoupons.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {((analytics.coupons.revenueWithCoupons / analytics.revenue.total) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Avg per Booking</p>
                      <p className="text-3xl font-bold">₹{analytics.revenue.avgPerBooking}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Revenue Growth</p>
                      <p className={`text-3xl font-bold ${getTrendColor(analytics.revenue.trend)}`}>
                        {analytics.revenue.trend > 0 ? '+' : ''}{analytics.revenue.trend.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Stations by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topStations.map(([station, stats], index) => (
                      <div key={station} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                            ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-600'}`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{station}</p>
                            <p className="text-sm text-muted-foreground">{stats.bookings} bookings</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{stats.revenue.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{stats.avgDuration}min avg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                        <p className="text-3xl font-bold">{analytics.customers.total}</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">New Customers</p>
                        <p className="text-3xl font-bold text-green-600">{analytics.customers.new}</p>
                        <p className="text-xs text-muted-foreground">
                          {((analytics.customers.new / analytics.customers.total) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                      <UserCheck className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Spend/Customer</p>
                        <p className="text-3xl font-bold text-blue-600">₹{analytics.revenue.avgPerCustomer}</p>
                        <p className="text-xs text-muted-foreground">Per customer lifetime</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                        <p className="text-3xl font-bold text-purple-600">
                          {analytics.customers.retentionRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Returning customers</p>
                      </div>
                      <TrendingUpIcon className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">High Frequency</p>
                      <p className="text-2xl font-bold text-green-600">
                        {customerInsights.filter(c => c.bookingFrequency === 'High').length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">2+ bookings/week</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Medium Frequency</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {customerInsights.filter(c => c.bookingFrequency === 'Medium').length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">0.5-2 bookings/week</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">Low Frequency</p>
                      <p className="text-2xl font-bold text-red-600">
                        {customerInsights.filter(c => c.bookingFrequency === 'Low').length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">&lt;0.5 bookings/week</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Insights & Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customerInsights.slice(0, 20).map((customer, index) => (
                      <div key={customer.name} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                          <div className="lg:col-span-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
                                ${index < 3 ? 'bg-yellow-500' : index < 10 ? 'bg-blue-500' : 'bg-gray-500'}`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg">{customer.name}</h4>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </div>
                                {customer.email && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {customer.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bookings</p>
                            <p className="text-2xl font-bold text-blue-600">{customer.totalBookings}</p>
                            <Badge variant={customer.bookingFrequency === 'High' ? 'default' : customer.bookingFrequency === 'Medium' ? 'secondary' : 'destructive'} className="text-xs">
                              {customer.bookingFrequency} Frequency
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Revenue</p>
                            <p className="text-xl font-bold text-green-600">₹{customer.totalSpent.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">₹{Math.round(customer.totalSpent / customer.totalBookings)}/booking</p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Preferences</p>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {customer.preferredTime || 'Various'}
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <GamepadIcon className="h-3 w-3" />
                              {getStationTypeLabel(customer.favoriteStationType)}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Usage</p>
                            <div className="flex items-center gap-1 text-sm">
                              <Timer className="h-3 w-3" />
                              {Math.round(customer.totalDuration / 60)}h total
                            </div>
                            <p className="text-xs text-muted-foreground">{customer.averageBookingDuration}min avg</p>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className="text-sm">{customer.completionRate}% completion</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Marketing</p>
                            {customer.mostUsedCoupon ? (
                              <Badge variant="outline" className="text-xs">
                                <Gift className="h-2 w-2 mr-1" />
                                {customer.mostUsedCoupon}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">No coupons used</span>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Last visit: {format(new Date(customer.lastBookingDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stations" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#1A1F2C] border-gray-700">
                  <CardHeader className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-b border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <Building2 className="h-5 w-5 text-blue-400" />
                      Station Performance Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {Object.entries(analytics.stations.utilization).map(([station, stats], index) => (
                        <div key={station} className="space-y-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
                                ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-600'}`}>
                                {index + 1}
                              </div>
                              <div>
                                <span className="font-semibold text-lg text-white">{station}</span>
                                <Badge variant="outline" className="ml-2 text-xs bg-gray-700 border-gray-600 text-gray-200">{stats.bookings} bookings</Badge>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-center p-3 bg-gray-900/50 rounded-lg border border-gray-700 shadow-sm">
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Revenue</p>
                              <p className="text-xl font-bold text-green-400">₹{stats.revenue.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-900/50 rounded-lg border border-gray-700 shadow-sm">
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Avg Duration</p>
                              <p className="text-xl font-bold text-blue-400">{stats.avgDuration}min</p>
                            </div>
                            <div className="text-center p-3 bg-gray-900/50 rounded-lg border border-gray-700 shadow-sm">
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Avg/Booking</p>
                              <p className="text-xl font-bold text-purple-400">₹{Math.round((stats.revenue / stats.bookings) || 0)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1F2C] border-gray-700">
                  <CardHeader className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 border-b border-gray-700">
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <BarChart3 className="h-5 w-5 text-orange-400" />
                      Hourly Distribution Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {Object.entries(analytics.stations.peakHours)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 12)
                        .map(([hour, count], index) => {
                          const maxCount = Math.max(...Object.values(analytics.stations.peakHours));
                          const percentage = (count / maxCount) * 100;
                          const isPeak = index < 3;

                          return (
                            <div key={hour} className="group hover:bg-gray-800/50 rounded-lg p-3 transition-colors border border-gray-700 hover:border-gray-600">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                    isPeak ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                                  }`}>
                                    {hour}
                                  </div>
                                  <span className="text-sm font-medium text-white">
                                    {parseInt(hour) === 0 ? '12:00 AM' : parseInt(hour) < 12 ? `${hour}:00 AM` : parseInt(hour) === 12 ? '12:00 PM' : `${parseInt(hour) - 12}:00 PM`}
                                  </span>
                                  {isPeak && <Badge variant="destructive" className="text-xs px-2 py-1">Peak Hour</Badge>}
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-bold text-white">{count}</span>
                                  <span className="text-xs text-gray-400 ml-1">bookings</span>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ease-in-out ${
                                      isPeak ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-medium text-white drop-shadow">{percentage.toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bookings List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Bookings ({bookings.length})</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Gift className="h-4 w-4" />
                    {analytics.coupons.totalCouponsUsed} with coupons
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {getDateRangeLabel()}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No bookings found</p>
                  <p>Try adjusting your filters or date range</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background space-y-2 pr-2">
                  {Object.entries(groupedBookings)
                    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                    .map(([date, customerBookings]) => {
                      const bookingIds = Object.values(customerBookings).flat().map(b => b.id).join('-');
                      const isDateExpanded = expandedDates.has(date);
                      return (
                      <Collapsible 
                        key={date}
                        open={isDateExpanded}
                        onOpenChange={(open) => {
                          if (open) {
                            setExpandedDates(prev => new Set(prev).add(date));
                          } else {
                            setExpandedDates(prev => {
                              const next = new Set(prev);
                              next.delete(date);
                              return next;
                            });
                          }
                        }}
                      >
                        <CollapsibleTrigger 
                          className="flex items-center gap-2 w-full p-3 text-left bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          {expandedDates.has(date) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Calendar className="h-4 w-4" />
                          <span className="font-semibold">{getDateLabel(date)}</span>
                          <Badge variant="outline" className="ml-auto">
                            {Object.values(customerBookings).flat().length} bookings
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {Object.values(customerBookings).flat().filter(b => b.coupon_code).length} with coupons
                          </Badge>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div key={`${date}-content-${bookingIds}`} className="ml-6 mt-2 space-y-2">
                              {Object.entries(customerBookings).map(([customerName, bookingsForCustomer]) => {
                                const key = `${date}::${customerName}`;
                                const couponBookings = bookingsForCustomer.filter(b => b.coupon_code);
                                
                                const isCustomerExpanded = expandedCustomers.has(key);
                                return (
                                  <Collapsible 
                                    key={key}
                                    open={isCustomerExpanded}
                                    onOpenChange={(open) => {
                                      if (open) {
                                        setExpandedCustomers(prev => new Set(prev).add(key));
                                      } else {
                                        setExpandedCustomers(prev => {
                                          const next = new Set(prev);
                                          next.delete(key);
                                          return next;
                                        });
                                      }
                                    }}
                                  >
                                    <CollapsibleTrigger 
                                      className="flex items-center gap-2 w-full p-2 text-left bg-background rounded border hover:bg-muted/50 transition-colors"
                                    >
                                      {isCustomerExpanded ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                      <Users className="h-3 w-3" />
                                      <span className="font-medium">{customerName}</span>
                                      <div className="ml-auto flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                          {bookingsForCustomer.length} booking{bookingsForCustomer.length !== 1 ? 's' : ''}
                                        </Badge>
                                        {couponBookings.length > 0 && (
                                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                                            <Gift className="h-2 w-2" />
                                            {couponBookings.length} coupon{couponBookings.length !== 1 ? 's' : ''}
                                          </Badge>
                                        )}
                                      </div>
                                    </CollapsibleTrigger>
                                    
                                    <CollapsibleContent>
                                      <div key={`${key}-bookings-${bookingsForCustomer.map(b => b.id).join('-')}`} className="ml-6 mt-2 space-y-2">
                                          {bookingsForCustomer
                                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                            .map(booking => (
                                              <div 
                                                key={booking.id} 
                                                className={`p-4 border rounded-lg bg-card shadow-sm ${
                                                  booking.coupon_code 
                                                    ? 'ring-2 ring-purple-200 bg-purple-50/30 dark:bg-purple-950/30' 
                                                    : ''
                                                }`}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 flex-1">
                                                    <div>
                                                      <div className="text-sm text-muted-foreground">Booking Details</div>
                                                      <div className="space-y-1">
                                                        <div className="font-medium flex items-center gap-1 text-blue-600">
                                                          <Hash className="h-3 w-3" />
                                                          ID: {booking.id.substring(0, 8)}...
                                                        </div>
                                                        {booking.booking_views && booking.booking_views.length > 0 && (
                                                          <div className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Eye className="h-2 w-2" />
                                                            Access: {booking.booking_views[0].access_code}
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                    
                                                    <div>
                                                      <div className="text-sm text-muted-foreground">Time</div>
                                                      <div className="font-medium flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                      </div>
                                                      <div className="text-xs text-muted-foreground">{booking.duration}min</div>
                                                    </div>
                                                    
                                                    <div>
                                                      <div className="text-sm text-muted-foreground">Station</div>
                                                      <div className="font-medium flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {booking.station.name}
                                                      </div>
                                                      <Badge variant="outline" className="text-xs mt-1">
                                                        {getStationTypeLabel(booking.station.type)}
                                                      </Badge>
                                                    </div>
                                                    
                                                    <div>
                                                      <div className="text-sm text-muted-foreground">Contact</div>
                                                      <div className="text-sm flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {booking.customer.phone}
                                                      </div>
                                                      {booking.customer.email && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                          <Mail className="h-3 w-3" />
                                                          {booking.customer.email}
                                                        </div>
                                                      )}
                                                    </div>
                                                    
                                                    <div>
                                                      <div className="text-sm text-muted-foreground">Status</div>
                                                      <div className="flex flex-col gap-1.5 mt-1">
                                                        <BookingStatusBadge status={booking.status} />
                                                        {booking.payment_mode && booking.payment_mode !== 'venue' ? (
                                                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20 w-fit">
                                                            💳 Paid
                                                          </Badge>
                                                        ) : (
                                                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20 w-fit">
                                                            💰 Unpaid
                                                          </Badge>
                                                        )}
                                                      </div>
                                                    </div>
                                                    
                                                    <div>
                                                      <div className="text-sm text-muted-foreground">Pricing</div>
                                                      <div className="space-y-1">
                                                        {booking.original_price && booking.original_price !== booking.final_price && (
                                                          <div className="text-xs text-gray-500 line-through">
                                                            ₹{booking.original_price}
                                                          </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                          {typeof booking.final_price === 'number' && (
                                                            <span className="text-sm font-medium">₹{booking.final_price}</span>
                                                          )}
                                                          {!!booking.discount_percentage && (
                                                            <Badge variant="destructive" className="text-xs">
                                                              {Math.round(booking.discount_percentage)}% OFF
                                                            </Badge>
                                                          )}
                                                        </div>
                                                        {booking.coupon_code && (
                                                          <Badge variant="secondary" className="text-xs mt-1 flex items-center gap-1 w-fit">
                                                            <Gift className="h-2 w-2" />
                                                            {booking.coupon_code}
                                                          </Badge>
                                                        )}
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-1 ml-4">
                                                      <Button size="sm" variant="outline" onClick={() => handleEditBooking(booking)}>
                                                        <Edit2 className="h-3 w-3" />
                                                      </Button>
                                                      <Button size="sm" variant="outline" onClick={() => handleDeleteBooking(booking)}>
                                                        <Trash2 className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </div>
                                                
                                                {booking.notes && (
                                                  <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                                                    <span className="text-muted-foreground">Notes: </span>
                                                    {booking.notes}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}
                            </div>
                        </CollapsibleContent>
                      </Collapsible>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialogs */}
          <BookingEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            booking={selectedBooking}
            onBookingUpdated={fetchBookings}
          />

          <BookingDeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            booking={selectedBooking}
            onBookingDeleted={fetchBookings}
          />
        </>
      )}
    </div>
  );
}
