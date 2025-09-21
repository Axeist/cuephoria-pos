import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  GamepadIcon, TrendingUp as TrendingUpIcon
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
  const lastNotifyIdRef = useRef<string | null>(null);
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
    customerType: 'all'
  });

  const [couponOptions, setCouponOptions] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const extractCouponCodes = (coupon_code: string) =>
    coupon_code.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  useEffect(() => {
    fetchBookings();
  }, []);

  // Enhanced realtime subscription with detailed INSERT notifications
  useEffect(() => {
    const channel = supabase
      .channel('booking-management-changes')
      // Keep data integrity by refetching on any change
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      // New: detailed toast on INSERT (new booking) with customer and station info
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, async (payload: any) => {
        const row = payload?.new;
        if (!row) return;

        // Avoid duplicate notifications if multiple listeners fire
        if (lastNotifyIdRef.current === row.id) return;
        lastNotifyIdRef.current = row.id;

        try {
          // Fetch customer and station details for the notification
          const { data: customerData } = await supabase
            .from('customers')
            .select('name')
            .eq('id', row.customer_id)
            .single();

          const { data: stationData } = await supabase
            .from('stations')
            .select('name')
            .eq('id', row.station_id)
            .single();

          const customerName = customerData?.name || 'Unknown Customer';
          const stationName = stationData?.name || 'Unknown Station';
          
          // Rich toast notification with customer, time, and station
          toast.success(
            `New booking: ${customerName} • ${row.start_time}-${row.end_time} • ${stationName}`,
            { 
              duration: 5000,
              description: `Date: ${row.booking_date} • ID: #${String(row.id).slice(0, 8)}`
            }
          );

          // Optional: native system notification if already permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('New Booking', {
                body: `${customerName} booked ${stationName} at ${row.start_time}-${row.end_time}`,
                icon: '/favicon.ico'
              });
            } catch {}
          }
        } catch (error) {
          // Fallback notification if customer/station fetch fails
          toast.success(
            `New booking • ${row.booking_date} ${row.start_time} • #${String(row.id).slice(0, 8)}`,
            { duration: 4000 }
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          station:stations!bookings_station_id_fkey (name, type),
          customer:customers!bookings_customer_id_fkey (name, phone, email, created_at),
          booking_views (*)
        `)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      const processedBookings = (data || []).map((booking: any) => ({
        ...booking,
        station: booking.station || { name: 'Unknown Station', type: 'Unknown' },
        customer: booking.customer || { name: 'Unknown Customer', phone: 'Unknown', email: null, created_at: null }
      }));

      setAllBookings(processedBookings);

      // Extract unique coupon codes
      const coupons = new Set<string>();
      processedBookings.forEach((booking: Booking) => {
        if (booking.coupon_code) {
          extractCouponCodes(booking.coupon_code).forEach(code => coupons.add(code));
        }
      });
      setCouponOptions(Array.from(coupons).sort());

    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast.error(`Failed to fetch bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
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
      customerType: 'all'
    });
  };

  const filteredBookings = useMemo(() => {
    let filtered = allBookings;

    // Date filtering
    const fromDate = new Date(filters.dateFrom);
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999); // Include the entire end date

    filtered = filtered.filter((booking: Booking) => {
      const bookingDate = new Date(booking.booking_date);
      return bookingDate >= fromDate && bookingDate <= toDate;
    });

    // Status filtering
    if (filters.status !== 'all') {
      filtered = filtered.filter((booking: Booking) => booking.status === filters.status);
    }

    // Station type filtering
    if (filters.stationType !== 'all') {
      filtered = filtered.filter((booking: Booking) => booking.station.type === filters.stationType);
    }

    // Search filtering (customer name, phone, email, or booking ID)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter((booking: Booking) =>
        booking.customer.name.toLowerCase().includes(searchLower) ||
        booking.customer.phone.toLowerCase().includes(searchLower) ||
        booking.customer.email?.toLowerCase().includes(searchLower) ||
        booking.id.toLowerCase().includes(searchLower) ||
        booking.station.name.toLowerCase().includes(searchLower)
      );
    }

    // Access code filtering
    if (filters.accessCode) {
      const accessCodeLower = filters.accessCode.toLowerCase();
      filtered = filtered.filter((booking: Booking) =>
        booking.booking_views?.some(view => view.access_code.toLowerCase().includes(accessCodeLower))
      );
    }

    // Coupon filtering
    if (filters.coupon !== 'all') {
      if (filters.coupon === 'none') {
        filtered = filtered.filter((booking: Booking) => !booking.coupon_code);
      } else {
        filtered = filtered.filter((booking: Booking) =>
          booking.coupon_code && extractCouponCodes(booking.coupon_code).includes(filters.coupon)
        );
      }
    }

    // Price range filtering
    if (filters.priceRange !== 'all') {
      filtered = filtered.filter((booking: Booking) => {
        const price = booking.final_price || 0;
        switch (filters.priceRange) {
          case '0-500': return price >= 0 && price <= 500;
          case '501-1000': return price >= 501 && price <= 1000;
          case '1001-2000': return price >= 1001 && price <= 2000;
          case '2001+': return price >= 2001;
          default: return true;
        }
      });
    }

    // Duration filtering
    if (filters.duration !== 'all') {
      filtered = filtered.filter((booking: Booking) => {
        switch (filters.duration) {
          case '30': return booking.duration <= 30;
          case '60': return booking.duration > 30 && booking.duration <= 60;
          case '120': return booking.duration > 60 && booking.duration <= 120;
          case '120+': return booking.duration > 120;
          default: return true;
        }
      });
    }

    // Customer type filtering
    if (filters.customerType !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);

      filtered = filtered.filter((booking: Booking) => {
        const customerCreationDate = booking.customer.created_at ? new Date(booking.customer.created_at) : null;
        const isNewCustomer = customerCreationDate && customerCreationDate >= thirtyDaysAgo;
        
        switch (filters.customerType) {
          case 'new': return isNewCustomer;
          case 'returning': return !isNewCustomer;
          default: return true;
        }
      });
    }

    return filtered;
  }, [allBookings, filters]);

  const analytics = useMemo((): Analytics => {
    const bookings = filteredBookings;
    
    // Revenue calculations
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.final_price || 0), 0);
    const avgPerBooking = bookings.length > 0 ? totalRevenue / bookings.length : 0;
    const uniqueCustomers = new Set(bookings.map(b => b.customer.phone)).size;
    const avgPerCustomer = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;

    // Booking statistics
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const noShowBookings = bookings.filter(b => b.status === 'no-show').length;
    const completionRate = bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0;
    const noShowRate = bookings.length > 0 ? (noShowBookings / bookings.length) * 100 : 0;

    // Customer analytics
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const newCustomers = bookings.filter(b => 
      b.customer.created_at && new Date(b.customer.created_at) >= thirtyDaysAgo
    ).length;
    const returningCustomers = bookings.filter(b => 
      !b.customer.created_at || new Date(b.customer.created_at) < thirtyDaysAgo
    ).length;
    const retentionRate = bookings.length > 0 ? (returningCustomers / (newCustomers + returningCustomers)) * 100 : 0;

    // Station utilization
    const stationUtilization: Record<string, { bookings: number; revenue: number; avgDuration: number }> = {};
    bookings.forEach(booking => {
      const stationName = booking.station.name;
      if (!stationUtilization[stationName]) {
        stationUtilization[stationName] = { bookings: 0, revenue: 0, avgDuration: 0 };
      }
      stationUtilization[stationName].bookings++;
      stationUtilization[stationName].revenue += booking.final_price || 0;
    });
    
    // Calculate average durations
    Object.keys(stationUtilization).forEach(stationName => {
      const stationBookings = bookings.filter(b => b.station.name === stationName);
      const totalDuration = stationBookings.reduce((sum, b) => sum + b.duration, 0);
      stationUtilization[stationName].avgDuration = stationBookings.length > 0 ? totalDuration / stationBookings.length : 0;
    });

    // Peak hours analysis
    const peakHours: Record<string, number> = {};
    bookings.forEach(booking => {
      const hour = parseInt(booking.start_time.split(':')[0]);
      peakHours[hour] = (peakHours[hour] || 0) + 1;
    });

    // Coupon analytics
    const couponBookings = bookings.filter(b => b.coupon_code);
    const totalCouponsUsed = couponBookings.length;
    const uniqueCoupons = new Set();
    couponBookings.forEach(b => {
      if (b.coupon_code) {
        extractCouponCodes(b.coupon_code).forEach(code => uniqueCoupons.add(code));
      }
    });

    const totalDiscountGiven = couponBookings.reduce((sum, b) => {
      const original = b.original_price || 0;
      const final = b.final_price || 0;
      return sum + (original - final);
    }, 0);

    const revenueWithCoupons = couponBookings.reduce((sum, b) => sum + (b.final_price || 0), 0);
    const revenueWithoutCoupons = totalRevenue - revenueWithCoupons;
    
    const averageDiscountPercentage = couponBookings.length > 0 
      ? couponBookings.reduce((sum, b) => sum + (b.discount_percentage || 0), 0) / couponBookings.length 
      : 0;

    const couponConversionRate = bookings.length > 0 ? (couponBookings.length / bookings.length) * 100 : 0;

    // Top performing coupons
    const couponPerformance: Record<string, {
      usageCount: number;
      totalRevenue: number;
      totalDiscount: number;
      customers: Set<string>;
    }> = {};

    couponBookings.forEach(booking => {
      if (booking.coupon_code) {
        extractCouponCodes(booking.coupon_code).forEach(code => {
          if (!couponPerformance[code]) {
            couponPerformance[code] = {
              usageCount: 0,
              totalRevenue: 0,
              totalDiscount: 0,
              customers: new Set()
            };
          }
          couponPerformance[code].usageCount++;
          couponPerformance[code].totalRevenue += booking.final_price || 0;
          couponPerformance[code].totalDiscount += (booking.original_price || 0) - (booking.final_price || 0);
          couponPerformance[code].customers.add(booking.customer.phone);
        });
      }
    });

    const topPerformingCoupons = Object.entries(couponPerformance)
      .map(([code, data]) => ({
        code,
        usageCount: data.usageCount,
        totalRevenue: data.totalRevenue,
        totalDiscount: data.totalDiscount,
        avgDiscountPercent: data.usageCount > 0 ? data.totalDiscount / data.usageCount : 0,
        uniqueCustomers: data.customers.size,
        conversionRate: data.customers.size > 0 ? (data.usageCount / data.customers.size) * 100 : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Coupon trends (simplified)
    const couponTrends: Record<string, number> = {};
    topPerformingCoupons.forEach((coupon, index) => {
      couponTrends[coupon.code] = coupon.usageCount;
    });

    // Customer segmentation with coupons
    const newCustomersWithCoupons = couponBookings.filter(b => 
      b.customer.created_at && new Date(b.customer.created_at) >= thirtyDaysAgo
    ).length;
    const returningCustomersWithCoupons = couponBookings.length - newCustomersWithCoupons;

    const coupons: CouponAnalytics = {
      totalCouponsUsed,
      uniqueCoupons: uniqueCoupons.size,
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
        total: totalRevenue,
        trend: 0, // Could be calculated with historical data
        avgPerBooking,
        avgPerCustomer
      },
      bookings: {
        total: bookings.length,
        trend: 0, // Could be calculated with historical data
        completionRate,
        noShowRate
      },
      customers: {
        total: uniqueCustomers,
        new: newCustomers,
        returning: returningCustomers,
        retentionRate
      },
      stations: {
        utilization: stationUtilization,
        peakHours
      },
      coupons
    };
  }, [filteredBookings]);

  const customerInsights = useMemo((): CustomerInsight[] => {
    const customerMap = new Map<string, CustomerInsight>();
    const now = new Date();

    filteredBookings.forEach(booking => {
      const customerKey = booking.customer.phone;
      
      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
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

      const customer = customerMap.get(customerKey)!;
      customer.totalBookings++;
      customer.totalDuration += booking.duration;
      customer.totalSpent += booking.final_price || 0;
      
      // Update last booking date
      if (!customer.lastBookingDate || booking.booking_date > customer.lastBookingDate) {
        customer.lastBookingDate = booking.booking_date;
      }
    });

    // Calculate derived metrics for each customer
    customerMap.forEach((customer, phone) => {
      const customerBookings = filteredBookings.filter(b => b.customer.phone === phone);
      
      customer.averageBookingDuration = customer.totalBookings > 0 ? customer.totalDuration / customer.totalBookings : 0;
      
      // Preferred time (most common hour)
      const timeFrequency: Record<string, number> = {};
      customerBookings.forEach(b => {
        const hour = b.start_time.split(':')[0];
        timeFrequency[hour] = (timeFrequency[hour] || 0) + 1;
      });
      customer.preferredTime = Object.entries(timeFrequency)
        .sort(([,a], [,b]) => b - a)[0]?.[0] + ':00' || '';

      // Preferred station
      const stationFrequency: Record<string, number> = {};
      customerBookings.forEach(b => {
        stationFrequency[b.station.name] = (stationFrequency[b.station.name] || 0) + 1;
      });
      customer.preferredStation = Object.entries(stationFrequency)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      // Most used coupon
      const couponFrequency: Record<string, number> = {};
      customerBookings.forEach(b => {
        if (b.coupon_code) {
          extractCouponCodes(b.coupon_code).forEach(code => {
            couponFrequency[code] = (couponFrequency[code] || 0) + 1;
          });
        }
      });
      customer.mostUsedCoupon = Object.entries(couponFrequency)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

      // Completion rate
      const completedBookings = customerBookings.filter(b => b.status === 'completed').length;
      customer.completionRate = customer.totalBookings > 0 ? (completedBookings / customer.totalBookings) * 100 : 0;

      // Favorite station type
      const stationTypeFrequency: Record<string, number> = {};
      customerBookings.forEach(b => {
        stationTypeFrequency[b.station.type] = (stationTypeFrequency[b.station.type] || 0) + 1;
      });
      customer.favoriteStationType = Object.entries(stationTypeFrequency)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      // Booking frequency
      const daysSinceFirst = customerBookings.length > 0 ? 
        Math.ceil((now.getTime() - new Date(customerBookings[customerBookings.length - 1].booking_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const bookingsPerMonth = daysSinceFirst > 0 ? (customer.totalBookings / daysSinceFirst) * 30 : 0;
      
      if (bookingsPerMonth >= 4) customer.bookingFrequency = 'High';
      else if (bookingsPerMonth >= 2) customer.bookingFrequency = 'Medium';
      else customer.bookingFrequency = 'Low';
    });

    return Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredBookings]);

  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    
    filteredBookings.forEach(booking => {
      const date = booking.booking_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(booking);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, bookings]) => ({
        date,
        bookings: bookings.sort((a, b) => a.start_time.localeCompare(b.start_time))
      }));
  }, [filteredBookings]);

  const exportData = async () => {
    try {
      const csvData = filteredBookings.map(booking => ({
        'Booking ID': booking.id,
        'Date': booking.booking_date,
        'Start Time': booking.start_time,
        'End Time': booking.end_time,
        'Duration (min)': booking.duration,
        'Status': booking.status,
        'Customer Name': booking.customer.name,
        'Customer Phone': booking.customer.phone,
        'Customer Email': booking.customer.email || '',
        'Station': booking.station.name,
        'Station Type': booking.station.type,
        'Original Price': booking.original_price || 0,
        'Final Price': booking.final_price || 0,
        'Discount %': booking.discount_percentage || 0,
        'Coupon Code': booking.coupon_code || '',
        'Notes': booking.notes || '',
        'Access Codes': booking.booking_views?.map(v => v.access_code).join(', ') || ''
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => `"${String(row[header as keyof typeof row]).replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `bookings_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${csvData.length} bookings successfully`);
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

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
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const toggleCustomerExpansion = (customerPhone: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerPhone)) {
        next.delete(customerPhone);
      } else {
        next.add(customerPhone);
      }
      return next;
    });
  };

  const getDateDisplayName = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
              <p className="mt-1 text-gray-600">
                Manage and analyze your {analytics.bookings.total} bookings
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={exportData}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
              <Button
                onClick={() => window.open('/admin', '_blank')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Booking</span>
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500">Total Bookings</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{analytics.bookings.total}</dd>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500">Total Revenue</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.revenue.total)}</dd>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500">Customers</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{analytics.customers.total}</dd>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Target className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500">Completion Rate</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{analytics.bookings.completionRate.toFixed(1)}%</dd>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </span>
              <Button onClick={clearAllFilters} variant="outline" size="sm">
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Date Preset */}
              <div>
                <Label>Date Range</Label>
                <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 days</SelectItem>
                    <SelectItem value="last30days">Last 30 days</SelectItem>
                    <SelectItem value="thismonth">This month</SelectItem>
                    <SelectItem value="lastmonth">Last month</SelectItem>
                    <SelectItem value="last3months">Last 3 months</SelectItem>
                    <SelectItem value="thisyear">This year</SelectItem>
                    <SelectItem value="lastyear">Last year</SelectItem>
                    <SelectItem value="alltime">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {filters.datePreset === 'custom' && (
                <>
                  <div>
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Status Filter */}
              <div>
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Station Type Filter */}
              <div>
                <Label>Station Type</Label>
                <Select value={filters.stationType} onValueChange={(value) => handleFilterChange('stationType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="snooker">Snooker</SelectItem>
                    <SelectItem value="pool">Pool</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Coupon Filter */}
              <div>
                <Label>Coupon</Label>
                <Select value={filters.coupon} onValueChange={(value) => handleFilterChange('coupon', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Coupons</SelectItem>
                    <SelectItem value="none">No Coupon</SelectItem>
                    {couponOptions.map(coupon => (
                      <SelectItem key={coupon} value={coupon}>{coupon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range Filter */}
              <div>
                <Label>Price Range</Label>
                <Select value={filters.priceRange} onValueChange={(value) => handleFilterChange('priceRange', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="0-500">₹0 - ₹500</SelectItem>
                    <SelectItem value="501-1000">₹501 - ₹1000</SelectItem>
                    <SelectItem value="1001-2000">₹1001 - ₹2000</SelectItem>
                    <SelectItem value="2001+">₹2001+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration Filter */}
              <div>
                <Label>Duration</Label>
                <Select value={filters.duration} onValueChange={(value) => handleFilterChange('duration', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Durations</SelectItem>
                    <SelectItem value="30">≤ 30 min</SelectItem>
                    <SelectItem value="60">31-60 min</SelectItem>
                    <SelectItem value="120">61-120 min</SelectItem>
                    <SelectItem value="120+">120+ min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Type Filter */}
              <div>
                <Label>Customer Type</Label>
                <Select value={filters.customerType} onValueChange={(value) => handleFilterChange('customerType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="new">New Customers</SelectItem>
                    <SelectItem value="returning">Returning Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search and Access Code */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by customer name, phone, email, booking ID, or station..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Access Code</Label>
                <Input
                  placeholder="Search by access code..."
                  value={filters.accessCode}
                  onChange={(e) => handleFilterChange('accessCode', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="coupons">Coupons & Marketing</TabsTrigger>
            <TabsTrigger value="stations">Stations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {groupedBookings.map(({ date, bookings }) => (
                <Card key={date}>
                  <Collapsible
                    open={expandedDates.has(date)}
                    onOpenChange={() => toggleDateExpansion(date)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="hover:bg-gray-50 cursor-pointer">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {expandedDates.has(date) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <CalendarDays className="h-5 w-5" />
                            <span>{getDateDisplayName(date)}</span>
                            <Badge variant="outline">{bookings.length} bookings</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              Revenue: {formatCurrency(bookings.reduce((sum, b) => sum + (b.final_price || 0), 0))}
                            </p>
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-4">
                          {bookings.map((booking) => (
                            <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-4">
                                  <Badge className={getStatusColor(booking.status)}>
                                    {booking.status}
                                  </Badge>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium">{booking.start_time} - {booking.end_time}</span>
                                    <span className="text-gray-500">({booking.duration} min)</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditBooking(booking)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteBooking(booking)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Customer Info */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                                    <Users className="h-4 w-4" />
                                    <span>Customer</span>
                                  </h4>
                                  <div className="space-y-1">
                                    <p className="font-medium">{booking.customer.name}</p>
                                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                                      <Phone className="h-3 w-3" />
                                      <span>{booking.customer.phone}</span>
                                    </div>
                                    {booking.customer.email && (
                                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                                        <Mail className="h-3 w-3" />
                                        <span>{booking.customer.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Station Info */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>Station</span>
                                  </h4>
                                  <div className="space-y-1">
                                    <p className="font-medium">{booking.station.name}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {booking.station.type}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Pricing Info */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                                    <DollarSign className="h-4 w-4" />
                                    <span>Pricing</span>
                                  </h4>
                                  <div className="space-y-1">
                                    <p className="font-medium text-green-600">
                                      {formatCurrency(booking.final_price || 0)}
                                    </p>
                                    {booking.original_price && booking.original_price !== booking.final_price && (
                                      <p className="text-sm text-gray-500 line-through">
                                        {formatCurrency(booking.original_price)}
                                      </p>
                                    )}
                                    {booking.coupon_code && (
                                      <div className="flex items-center space-x-1">
                                        <Tag className="h-3 w-3 text-orange-600" />
                                        <span className="text-sm text-orange-600">{booking.coupon_code}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Additional Info */}
                              {(booking.notes || booking.booking_views?.length) && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  {booking.notes && (
                                    <div className="mb-2">
                                      <p className="text-sm text-gray-600">{booking.notes}</p>
                                    </div>
                                  )}
                                  {booking.booking_views && booking.booking_views.length > 0 && (
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-900 mb-1 flex items-center space-x-1">
                                        <Eye className="h-3 w-3" />
                                        <span>Access Codes ({booking.booking_views.length})</span>
                                      </h5>
                                      <div className="flex flex-wrap gap-2">
                                        {booking.booking_views.map((view) => (
                                          <Badge key={view.id} variant="outline" className="text-xs">
                                            {view.access_code}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Booking ID */}
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Hash className="h-3 w-3" />
                                    <span>ID: {booking.id}</span>
                                  </div>
                                  {booking.created_at && (
                                    <span>Created: {format(new Date(booking.created_at), 'MMM d, HH:mm')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}

              {groupedBookings.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No bookings found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your filters to see more results.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Total Revenue</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.revenue.total)}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Target className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Avg per Booking</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.revenue.avgPerBooking)}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Avg per Customer</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.revenue.avgPerCustomer)}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Tag className="h-8 w-8 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">With Coupons</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.coupons.revenueWithCoupons)}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Station Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Revenue by Station</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Station
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bookings
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg per Booking
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(analytics.stations.utilization)
                          .sort(([,a], [,b]) => b.revenue - a.revenue)
                          .map(([stationName, data]) => (
                          <tr key={stationName}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {stationName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {data.bookings}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(data.revenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {data.avgDuration.toFixed(0)} min
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(data.bookings > 0 ? data.revenue / data.bookings : 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Total Customers</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{analytics.customers.total}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCheck className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">New Customers</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{analytics.customers.new}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <RefreshCw className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Returning</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{analytics.customers.returning}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-8 w-8 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Retention Rate</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{analytics.customers.retentionRate.toFixed(1)}%</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Customer Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customerInsights.slice(0, 10).map((customer) => (
                      <Card key={customer.phone} className="border border-gray-200">
                        <Collapsible
                          open={expandedCustomers.has(customer.phone)}
                          onOpenChange={() => toggleCustomerExpansion(customer.phone)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="hover:bg-gray-50 cursor-pointer pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  {expandedCustomers.has(customer.phone) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                                    <p className="text-sm text-gray-500">{customer.phone}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">{formatCurrency(customer.totalSpent)}</p>
                                  <p className="text-sm text-gray-500">{customer.totalBookings} bookings</p>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Frequency</p>
                                  <Badge variant="outline" className={`mt-1 ${
                                    customer.bookingFrequency === 'High' ? 'border-green-500 text-green-700' :
                                    customer.bookingFrequency === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                    'border-gray-500 text-gray-700'
                                  }`}>
                                    {customer.bookingFrequency}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Preferred Time</p>
                                  <p className="text-sm text-gray-900">{customer.preferredTime}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Preferred Station</p>
                                  <p className="text-sm text-gray-900">{customer.preferredStation}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                                  <p className="text-sm text-gray-900">{customer.completionRate.toFixed(1)}%</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                                  <p className="text-sm text-gray-900">{customer.averageBookingDuration.toFixed(0)} min</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Last Booking</p>
                                  <p className="text-sm text-gray-900">{format(new Date(customer.lastBookingDate), 'MMM d, yyyy')}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Favorite Type</p>
                                  <p className="text-sm text-gray-900">{customer.favoriteStationType}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-500">Top Coupon</p>
                                  <p className="text-sm text-gray-900">{customer.mostUsedCoupon || 'None'}</p>
                                </div>
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Coupons & Marketing Tab */}
          <TabsContent value="coupons">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Ticket className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Coupons Used</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{analytics.coupons.totalCouponsUsed}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Tag className="h-8 w-8 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Unique Coupons</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{analytics.coupons.uniqueCoupons}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Total Discount</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.coupons.totalDiscountGiven)}</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Percent className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <dt className="text-sm font-medium text-gray-500">Conversion Rate</dt>
                        <dd className="text-2xl font-semibold text-gray-900">{analytics.coupons.couponConversionRate.toFixed(1)}%</dd>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performing Coupons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Top Performing Coupons</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Coupon Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usage Count
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Discount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unique Customers
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ROI
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analytics.coupons.topPerformingCoupons.slice(0, 10).map((coupon) => (
                          <tr key={coupon.code}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {coupon.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {coupon.usageCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(coupon.totalRevenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                              -{formatCurrency(coupon.totalDiscount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {coupon.uniqueCustomers}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {coupon.totalDiscount > 0 ? (coupon.totalRevenue / coupon.totalDiscount).toFixed(1) + 'x' : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Acquisition via Coupons */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Megaphone className="h-5 w-5" />
                    <span>Customer Acquisition via Coupons</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segmentation</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-green-900">New Customers</p>
                            <p className="text-sm text-green-700">Used coupons in first 30 days</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-900">{analytics.coupons.customerSegmentation.newCustomersWithCoupons}</p>
                            <p className="text-sm text-green-700">customers</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium text-blue-900">Returning Customers</p>
                            <p className="text-sm text-blue-700">Existing customers using coupons</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-900">{analytics.coupons.customerSegmentation.returningCustomersWithCoupons}</p>
                            <p className="text-sm text-blue-700">customers</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Split</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                          <div>
                            <p className="font-medium text-purple-900">With Coupons</p>
                            <p className="text-sm text-purple-700">Revenue from discounted bookings</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-purple-900">{formatCurrency(analytics.coupons.revenueWithCoupons)}</p>
                            <p className="text-sm text-purple-700">{analytics.revenue.total > 0 ? ((analytics.coupons.revenueWithCoupons / analytics.revenue.total) * 100).toFixed(1) : 0}%</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Without Coupons</p>
                            <p className="text-sm text-gray-700">Revenue from full-price bookings</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(analytics.coupons.revenueWithoutCoupons)}</p>
                            <p className="text-sm text-gray-700">{analytics.revenue.total > 0 ? ((analytics.coupons.revenueWithoutCoupons / analytics.revenue.total) * 100).toFixed(1) : 0}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Stations Tab */}
          <TabsContent value="stations">
            <div className="space-y-6">
              {/* Station Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Station Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(analytics.stations.utilization)
                      .sort(([,a], [,b]) => b.bookings - a.bookings)
                      .map(([stationName, data]) => (
                      <Card key={stationName} className="border border-gray-200">
                        <CardContent className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-4">{stationName}</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Bookings</span>
                              <span className="font-medium">{data.bookings}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Revenue</span>
                              <span className="font-medium">{formatCurrency(data.revenue)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Avg Duration</span>
                              <span className="font-medium">{data.avgDuration.toFixed(0)} min</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Revenue/Booking</span>
                              <span className="font-medium">{formatCurrency(data.bookings > 0 ? data.revenue / data.bookings : 0)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Peak Hours Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Peak Hours Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const bookingCount = analytics.stations.peakHours[hour] || 0;
                      const maxBookings = Math.max(...Object.values(analytics.stations.peakHours));
                      const intensity = maxBookings > 0 ? bookingCount / maxBookings : 0;
                      
                      return (
                        <div key={hour} className="text-center">
                          <div 
                            className={`h-16 w-full rounded-md border-2 border-gray-200 flex items-end justify-center text-xs font-medium ${
                              intensity > 0.7 ? 'bg-red-500 text-white' :
                              intensity > 0.4 ? 'bg-yellow-500 text-white' :
                              intensity > 0.1 ? 'bg-blue-500 text-white' :
                              'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {bookingCount > 0 && (
                              <span className="mb-1">{bookingCount}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {String(hour).padStart(2, '0')}:00
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span>Peak (70%+)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <span>High (40-70%)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span>Medium (10-40%)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                      <span>Low (0-10%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <BookingEditDialog
        booking={selectedBooking}
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedBooking(null);
        }}
        onSuccess={() => {
          fetchBookings();
          setEditDialogOpen(false);
          setSelectedBooking(null);
        }}
      />

      {/* Delete Dialog */}
      <BookingDeleteDialog
        booking={selectedBooking}
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedBooking(null);
        }}
        onSuccess={() => {
          fetchBookings();
          setDeleteDialogOpen(false);
          setSelectedBooking(null);
        }}
      />
    </div>
  );
}
