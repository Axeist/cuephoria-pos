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
  Calendar, Search, Filter, Download, Phone, Mail, Clock, MapPin, Plus,
  Edit2, Trash2, ChevronDown, ChevronRight, Users, CalendarDays, TrendingUp,
  Percent, Ticket, DollarSign, Target, AlertCircle, BarChart3, PieChart,
  Activity, Timer, UserCheck, RefreshCw, ArrowUpDown, TrendingDown,
  Gift, Tag, Megaphone, Zap, Trophy, Star, ArrowUp, ArrowDown
} from 'lucide-react';
import { 
  format, 
  isToday, 
  isYesterday, 
  isTomorrow, 
  subDays, 
  startOfDay, 
  endOfDay, 
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears
} from 'date-fns';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  final_price?: number | null;
  discount_percentage?: number | null;
  coupon_code?: string | null;
  station: {
    name: string;
    type: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
}

interface Filters {
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  stationType: string;
  search: string;
  coupon: string;
  priceRange: string;
  duration: string;
  customerType: string;
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

// Date preset options with their corresponding date ranges
const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        from: format(now, 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd')
      };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        from: format(yesterday, 'yyyy-MM-dd'),
        to: format(yesterday, 'yyyy-MM-dd')
      };
    case 'last7days':
      return {
        from: format(subDays(now, 6), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd')
      };
    case 'last30days':
      return {
        from: format(subDays(now, 29), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd')
      };
    case 'thismonth':
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd')
      };
    case 'lastmonth':
      const lastMonth = subMonths(now, 1);
      return {
        from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      };
    case 'last3months':
      return {
        from: format(subMonths(now, 2), 'yyyy-MM-dd'),
        to: format(now, 'yyyy-MM-dd')
      };
    case 'thisyear':
      return {
        from: format(startOfYear(now), 'yyyy-MM-dd'),
        to: format(endOfYear(now), 'yyyy-MM-dd')
      };
    case 'lastyear':
      const lastYear = subYears(now, 1);
      return {
        from: format(startOfYear(lastYear), 'yyyy-MM-dd'),
        to: format(endOfYear(lastYear), 'yyyy-MM-dd')
      };
    case 'alltime':
      return {
        from: '2020-01-01',
        to: format(now, 'yyyy-MM-dd')
      };
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
    coupon: 'all',
    priceRange: 'all',
    duration: 'all',
    customerType: 'all'
  });

  const [couponOptions, setCouponOptions] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

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

  // Handle date preset changes
  const handleDatePresetChange = (preset: string) => {
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

  // Handle manual date changes (sets preset to 'custom')
  const handleManualDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    setFilters(prev => ({
      ...prev,
      datePreset: 'custom',
      [field]: value
    }));
  };

  // Get the display label for the current date range
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
      
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          duration,
          status,
          notes,
          final_price,
          discount_percentage,
          coupon_code,
          station_id,
          customer_id,
          created_at
        `)
        .gte('booking_date', analyticsFromDate)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      const { data: bookingsData, error } = await query;
      if (error) throw error;

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
          final_price: b.final_price ?? null,
          discount_percentage: b.discount_percentage ?? null,
          coupon_code: b.coupon_code ?? null,
          created_at: b.created_at,
          station: { name: station?.name || 'Unknown', type: station?.type || 'unknown' },
          customer: { 
            name: customer?.name || 'Unknown', 
            phone: customer?.phone || '', 
            email: customer?.email ?? null,
            created_at: customer?.created_at
          }
        } as Booking & { created_at: string; customer: Booking['customer'] & { created_at?: string } };
      });

      setAllBookings(transformed);
      const filtered = applyFilters(transformed);
      setBookings(filtered);

      const presentCodes = Array.from(
        new Set(transformed.map(t => (t.coupon_code || '').trim()).filter(Boolean))
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
        b.station.name.toLowerCase().includes(q)
      );
    }

    if (filters.coupon !== 'all') {
      if (filters.coupon === 'none') {
        filtered = filtered.filter(b => !b.coupon_code);
      } else {
        filtered = filtered.filter(b => (b.coupon_code || '').toUpperCase() === filters.coupon.toUpperCase());
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

    return filtered;
  };

  useEffect(() => {
    const filtered = applyFilters(allBookings);
    setBookings(filtered);
  }, [filters, allBookings]);

  // Enhanced Analytics with detailed coupon tracking
  const analytics = useMemo((): Analytics => {
    const currentPeriodData = bookings;
    const previousPeriodStart = format(subDays(new Date(filters.dateFrom), 
      Math.max(1, Math.ceil((new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / (1000 * 60 * 60 * 24)))), 'yyyy-MM-dd');
    
    const previousPeriodData = allBookings.filter(b => 
      b.booking_date >= previousPeriodStart && b.booking_date < filters.dateFrom
    );

    // Revenue Analytics
    const currentRevenue = currentPeriodData.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const previousRevenue = previousPeriodData.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const revenueTrend = previousRevenue ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Booking Analytics
    const currentBookingCount = currentPeriodData.length;
    const previousBookingCount = previousPeriodData.length;
    const bookingTrend = previousBookingCount ? ((currentBookingCount - previousBookingCount) / previousBookingCount) * 100 : 0;

    const completedBookings = currentPeriodData.filter(b => b.status === 'completed').length;
    const noShowBookings = currentPeriodData.filter(b => b.status === 'no-show').length;
    const completionRate = currentBookingCount ? (completedBookings / currentBookingCount) * 100 : 0;
    const noShowRate = currentBookingCount ? (noShowBookings / currentBookingCount) * 100 : 0;

    // Customer Analytics
    const uniqueCustomers = new Set(currentPeriodData.map(b => b.customer.name)).size;
    const thirtyDaysAgo = subDays(new Date(), 30);
    const newCustomers = currentPeriodData.filter(b => {
      const customerCreated = new Date((b.customer as any).created_at || b.created_at);
      return customerCreated > thirtyDaysAgo;
    }).length;
    
    const returningCustomers = uniqueCustomers - newCustomers;
    const retentionRate = uniqueCustomers ? (returningCustomers / uniqueCustomers) * 100 : 0;

    // Station Analytics
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

    // ENHANCED COUPON ANALYTICS
    const bookingsWithCoupons = currentPeriodData.filter(b => b.coupon_code && b.coupon_code.trim());
    const bookingsWithoutCoupons = currentPeriodData.filter(b => !b.coupon_code || !b.coupon_code.trim());

    const totalCouponsUsed = bookingsWithCoupons.length;
    const uniqueCoupons = new Set(bookingsWithCoupons.map(b => b.coupon_code!.toUpperCase())).size;
    
    const revenueWithCoupons = bookingsWithCoupons.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const revenueWithoutCoupons = bookingsWithoutCoupons.reduce((sum, b) => sum + (b.final_price || 0), 0);
    
    const totalDiscountGiven = bookingsWithCoupons.reduce((sum, b) => {
      if (b.discount_percentage && b.final_price) {
        const discountAmount = (b.final_price * b.discount_percentage) / (100 - b.discount_percentage);
        return sum + discountAmount;
      }
      return sum;
    }, 0);

    const averageDiscountPercentage = bookingsWithCoupons.length > 0 
      ? bookingsWithCoupons.reduce((sum, b) => sum + (b.discount_percentage || 0), 0) / bookingsWithCoupons.length
      : 0;

    const couponConversionRate = currentBookingCount > 0 ? (totalCouponsUsed / currentBookingCount) * 100 : 0;

    // Detailed coupon performance analysis
    const couponPerformanceMap = new Map<string, {
      code: string;
      usageCount: number;
      totalRevenue: number;
      totalDiscount: number;
      avgDiscountPercent: number;
      uniqueCustomers: Set<string>;
      bookings: Booking[];
    }>();

    bookingsWithCoupons.forEach(b => {
      const code = b.coupon_code!.toUpperCase();
      if (!couponPerformanceMap.has(code)) {
        couponPerformanceMap.set(code, {
          code,
          usageCount: 0,
          totalRevenue: 0,
          totalDiscount: 0,
          avgDiscountPercent: 0,
          uniqueCustomers: new Set(),
          bookings: []
        });
      }

      const stats = couponPerformanceMap.get(code)!;
      stats.usageCount += 1;
      stats.totalRevenue += b.final_price || 0;
      stats.uniqueCustomers.add(b.customer.name);
      stats.bookings.push(b);
      
      if (b.discount_percentage && b.final_price) {
        const discountAmount = (b.final_price * b.discount_percentage) / (100 - b.discount_percentage);
        stats.totalDiscount += discountAmount;
      }
    });

    const topPerformingCoupons = Array.from(couponPerformanceMap.values())
      .map(stats => ({
        code: stats.code,
        usageCount: stats.usageCount,
        totalRevenue: stats.totalRevenue,
        totalDiscount: stats.totalDiscount,
        avgDiscountPercent: stats.usageCount > 0 
          ? stats.bookings.reduce((sum, b) => sum + (b.discount_percentage || 0), 0) / stats.usageCount
          : 0,
        uniqueCustomers: stats.uniqueCustomers.size,
        conversionRate: stats.uniqueCustomers.size > 0 
          ? (stats.usageCount / stats.uniqueCustomers.size) * 100 
          : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const couponTrends: Record<string, number> = {};
    bookingsWithCoupons.forEach(b => {
      const date = b.booking_date;
      couponTrends[date] = (couponTrends[date] || 0) + 1;
    });

    const newCustomersWithCoupons = bookingsWithCoupons.filter(b => {
      const customerCreated = new Date((b.customer as any).created_at || b.created_at);
      return customerCreated > thirtyDaysAgo;
    }).length;

    const returningCustomersWithCoupons = totalCouponsUsed - newCustomersWithCoupons;

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
        avgPerCustomer: uniqueCustomers ? Math.round(currentRevenue / uniqueCustomers) : 0,
      },
      bookings: {
        total: currentBookingCount,
        trend: bookingTrend,
        completionRate,
        noShowRate,
      },
      customers: {
        total: uniqueCustomers,
        new: newCustomers,
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
      ['Date', 'Start', 'End', 'Duration', 'Station', 'Station Type', 'Customer', 'Phone', 'Email', 'Status', 'Final Price', 'Original Price', 'Discount%', 'Discount Amount', 'Coupon', 'Notes'].join(','),
      ...bookings.map(b => {
        const discountAmount = (b.discount_percentage && b.final_price) 
          ? (b.final_price * b.discount_percentage) / (100 - b.discount_percentage)
          : 0;
        const originalPrice = (b.final_price || 0) + discountAmount;
        
        return [
          b.booking_date,
          b.start_time,
          b.end_time,
          b.duration,
          b.station.name.replace(/,/g, ' '),
          b.station.type,
          b.customer.name.replace(/,/g, ' '),
          b.customer.phone,
          b.customer.email || '',
          b.status,
          b.final_price ?? 0,
          Math.round(originalPrice),
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
      coupon: 'all',
      priceRange: 'all',
      duration: 'all',
      customerType: 'all'
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

  const peakHour = Object.entries(analytics.stations.peakHours)
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
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

      {/* Enhanced Filters with Date Presets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {/* Enhanced Date Range Section */}
            <div className="md:col-span-3">
              <Label htmlFor="date-preset">Date Range</Label>
              <div className="space-y-2">
                {/* Date Preset Dropdown */}
                <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Today
                      </div>
                    </SelectItem>
                    <SelectItem value="yesterday">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Yesterday
                      </div>
                    </SelectItem>
                    <SelectItem value="last7days">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last 7 Days
                      </div>
                    </SelectItem>
                    <SelectItem value="last30days">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last 30 Days
                      </div>
                    </SelectItem>
                    <SelectItem value="thismonth">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        This Month
                      </div>
                    </SelectItem>
                    <SelectItem value="lastmonth">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last Month
                      </div>
                    </SelectItem>
                    <SelectItem value="last3months">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last 3 Months
                      </div>
                    </SelectItem>
                    <SelectItem value="thisyear">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        This Year
                      </div>
                    </SelectItem>
                    <SelectItem value="lastyear">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last Year
                      </div>
                    </SelectItem>
                    <SelectItem value="alltime">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        All Time
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Custom Range
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Custom Date Inputs */}
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleManualDateChange('dateFrom', e.target.value)}
                    disabled={filters.datePreset !== 'custom'}
                    className={filters.datePreset !== 'custom' ? 'opacity-60' : ''}
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleManualDateChange('dateTo', e.target.value)}
                    disabled={filters.datePreset !== 'custom'}
                    className={filters.datePreset !== 'custom' ? 'opacity-60' : ''}
                  />
                </div>
                
                {/* Current Range Display */}
                <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                  {getDateRangeLabel()}
                </div>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Station Type</Label>
              <Select value={filters.stationType} onValueChange={(value) => setFilters(prev => ({ ...prev, stationType: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ps5">PlayStation 5</SelectItem>
                  <SelectItem value="8ball">8-Ball Pool</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Coupon Code</Label>
              <Select value={filters.coupon} onValueChange={(value) => setFilters(prev => ({ ...prev, coupon: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coupons</SelectItem>
                  <SelectItem value="none">No Coupon Used</SelectItem>
                  {couponOptions.map(code => (
                    <SelectItem key={code} value={code}>
                      <div className="flex items-center gap-2">
                        <Gift className="h-3 w-3" />
                        {code}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Price Range</Label>
              <Select value={filters.priceRange} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="0-100">₹0 - ₹100</SelectItem>
                  <SelectItem value="101-300">₹101 - ₹300</SelectItem>
                  <SelectItem value="301-500">₹301 - ₹500</SelectItem>
                  <SelectItem value="500">₹500+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Customer Type</Label>
              <Select value={filters.customerType} onValueChange={(value) => setFilters(prev => ({ ...prev, customerType: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="new">New Customers</SelectItem>
                  <SelectItem value="returning">Returning</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <Label htmlFor="search-filter">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
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
          {/* Key Metrics */}
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

          {/* Marketing Impact Overview */}
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
          {/* Coupon Performance Overview */}
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

          {/* Top Performing Coupons */}
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

          {/* Customer Segmentation with Coupons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Customer Acquisition via Coupons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">New Customers with Coupons</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {analytics.coupons.customerSegmentation.newCustomersWithCoupons}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.coupons.totalCouponsUsed > 0 
                          ? ((analytics.coupons.customerSegmentation.newCustomersWithCoupons / analytics.coupons.totalCouponsUsed) * 100).toFixed(1)
                          : 0
                        }% of coupon usage
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="font-medium">Returning Customers with Coupons</span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {analytics.coupons.customerSegmentation.returningCustomersWithCoupons}
                      </p>
                      <p className="text-xs text-muted-foreground">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Marketing Campaign Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Coupon Adoption Rate</span>
                      <span className="text-2xl font-bold text-purple-600">
                        {analytics.coupons.couponConversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Customers using coupons vs total bookings
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Average Discount Impact</span>
                      <span className="text-2xl font-bold text-orange-600">
                        {analytics.coupons.averageDiscountPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average discount percentage across all coupons
                    </p>
                  </div>

                  <div className="p-3 bg-teal-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Revenue Efficiency</span>
                      <span className="text-2xl font-bold text-teal-600">
                        ₹{analytics.coupons.totalCouponsUsed > 0 
                          ? Math.round(analytics.coupons.revenueWithCoupons / analytics.coupons.totalCouponsUsed)
                          : 0
                        }
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
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

          {/* Revenue Impact Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="font-medium">Revenue with Coupons</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        ₹{analytics.coupons.revenueWithCoupons.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.coupons.totalCouponsUsed} bookings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="font-medium">Revenue without Coupons</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        ₹{analytics.coupons.revenueWithoutCoupons.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.bookings.total - analytics.coupons.totalCouponsUsed} bookings
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="font-medium">Total Discounts Given</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">
                        -₹{Math.round(analytics.coupons.totalDiscountGiven).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Marketing investment
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Stations by Revenue */}
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
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                  <p className="text-3xl font-bold">{analytics.customers.total}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">New Customers</p>
                  <p className="text-3xl font-bold text-green-600">{analytics.customers.new}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {analytics.customers.retentionRate.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Station Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.stations.utilization).map(([station, stats]) => (
                    <div key={station} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{station}</span>
                        <Badge variant="outline">{stats.bookings} bookings</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-semibold">₹{stats.revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Duration</p>
                          <p className="font-semibold">{stats.avgDuration}min</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg/Booking</p>
                          <p className="font-semibold">₹{Math.round(stats.revenue / stats.bookings) || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hourly Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.stations.peakHours)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(([hour, count]) => (
                      <div key={hour} className="flex items-center justify-between">
                        <span className="text-sm">{hour}:00 - {hour}:59</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ 
                                width: `${(count / Math.max(...Object.values(analytics.stations.peakHours))) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Bookings List with Coupon Visibility */}
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
            <div className="space-y-2">
              {Object.entries(groupedBookings)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, customerBookings]) => (
                  <Collapsible key={date}>
                    <CollapsibleTrigger
                      onClick={() => toggleDateExpansion(date)}
                      className="flex items-center gap-2 w-full p-3 text-left bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      {expandedDates.has(date) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                      {expandedDates.has(date) && (
                        <div className="ml-6 mt-2 space-y-2">
                          {Object.entries(customerBookings).map(([customerName, bookingsForCustomer]) => {
                            const key = `${date}::${customerName}`;
                            const couponBookings = bookingsForCustomer.filter(b => b.coupon_code);
                            return (
                              <Collapsible key={key}>
                                <CollapsibleTrigger
                                  onClick={() => toggleCustomerExpansion(key)}
                                  className="flex items-center gap-2 w-full p-2 text-left bg-background rounded border hover:bg-muted/50 transition-colors"
                                >
                                  {expandedCustomers.has(key) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
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
                                  {expandedCustomers.has(key) && (
                                    <div className="ml-6 mt-2 space-y-2">
                                      {bookingsForCustomer
                                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                        .map(booking => (
                                        <div key={booking.id} className={`p-3 border rounded-lg bg-card ${booking.coupon_code ? 'ring-2 ring-purple-200' : ''}`}>
                                          <div className="flex items-center justify-between">
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 flex-1">
                                              <div>
                                                <div className="text-sm text-muted-foreground">Time</div>
                                                <div className="font-medium flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {booking.duration}min
                                                </div>
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
                                                <BookingStatusBadge status={booking.status} />
                                              </div>
                                              <div>
                                                <div className="text-sm text-muted-foreground">Price & Discount</div>
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
                                                {booking.discount_percentage && booking.final_price && (
                                                  <div className="text-xs text-muted-foreground mt-1">
                                                    Saved ₹{Math.round((booking.final_price * booking.discount_percentage) / (100 - booking.discount_percentage))}
                                                  </div>
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
                                          {booking.notes && (
                                            <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                                              <span className="text-muted-foreground">Notes: </span>
                                              {booking.notes}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            );
                          })}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
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
    </div>
  );
}
