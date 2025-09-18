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
  Activity, Timer, UserCheck, RefreshCw, ArrowUpDown, TrendingDown
} from 'lucide-react';
import { format, isToday, isYesterday, isTomorrow, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

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
  dateFrom: string;
  dateTo: string;
  status: string;
  stationType: string;
  search: string;
  coupon: string;
  priceRange: string;
  duration: string;
  customerType: string; // 'all' | 'new' | 'returning'
}

interface Analytics {
  revenue: {
    total: number;
    trend: number; // % change from previous period
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
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]); // For analytics
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<Filters>({
    dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'), // Last 7 days default
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

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('booking-management-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // Fetch broader dataset for analytics (last 30 days)
      const analyticsFromDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
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

      // Apply filters for display
      const filtered = applyFilters(transformed);
      setBookings(filtered);

      // Update coupon options
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

    // Date range filter
    if (filters.dateFrom && filters.dateTo) {
      filtered = filtered.filter(b => 
        b.booking_date >= filters.dateFrom && b.booking_date <= filters.dateTo
      );
    }

    // Other filters
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

    // Price range filter
    if (filters.priceRange !== 'all') {
      const [min, max] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(b => {
        const price = b.final_price || 0;
        if (max) return price >= min && price <= max;
        return price >= min; // 500+ case
      });
    }

    // Duration filter
    if (filters.duration !== 'all') {
      const [minDur, maxDur] = filters.duration.split('-').map(Number);
      filtered = filtered.filter(b => {
        if (maxDur) return b.duration >= minDur && b.duration <= maxDur;
        return b.duration >= minDur; // 180+ case
      });
    }

    // Customer type filter
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

  // Apply filters when they change
  useEffect(() => {
    const filtered = applyFilters(allBookings);
    setBookings(filtered);
  }, [filters, allBookings]);

  // Enhanced Analytics
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

      // Peak hours analysis
      const hour = new Date(`2000-01-01T${b.start_time}`).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });

    // Calculate averages
    Object.keys(stationStats).forEach(key => {
      if (stationStats[key].bookings > 0) {
        stationStats[key].avgDuration = Math.round(stationStats[key].avgDuration / stationStats[key].bookings);
      }
    });

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
      }
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
      ['Date', 'Start', 'End', 'Duration', 'Station', 'Station Type', 'Customer', 'Phone', 'Email', 'Status', 'Price', 'Discount%', 'Coupon', 'Notes'].join(','),
      ...bookings.map(b => [
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
        b.discount_percentage ?? 0,
        b.coupon_code || '',
        (b.notes || '').replace(/,/g, ' ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuephoria-bookings-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
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

  // Group bookings by date and customer for display
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
            Comprehensive booking analytics and management dashboard
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

      {/* Enhanced Filters */}
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
            <div className="md:col-span-2">
              <Label htmlFor="date-from">Date Range</Label>
              <div className="flex gap-2">
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
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
              <Label>Duration</Label>
              <Select value={filters.duration} onValueChange={(value) => setFilters(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Duration</SelectItem>
                  <SelectItem value="0-60">0-60 min</SelectItem>
                  <SelectItem value="61-120">61-120 min</SelectItem>
                  <SelectItem value="121-180">121-180 min</SelectItem>
                  <SelectItem value="180">180+ min</SelectItem>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
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
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold">₹{analytics.revenue.avgPerBooking}</p>
                  </div>
                  <Ticket className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Customer Retention</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analytics.customers.retentionRate.toFixed(1)}%
                    </p>
                  </div>
                  <UserCheck className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                    <p className="text-2xl font-bold">
                      {peakHour ? `${peakHour[0]}:00` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {peakHour ? `${peakHour[1]} bookings` : 'No data'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
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
                  <p className="text-sm font-medium text-muted-foreground">Avg per Booking</p>
                  <p className="text-3xl font-bold">₹{analytics.revenue.avgPerBooking}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Avg per Customer</p>
                  <p className="text-3xl font-bold">₹{analytics.revenue.avgPerCustomer}</p>
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

          {/* Top Performing Stations by Revenue */}
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
            {/* Station Performance */}
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

            {/* Peak Hours */}
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

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bookings ({bookings.length})</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {filters.dateFrom} to {filters.dateTo}
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
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {expandedDates.has(date) && (
                        <div className="ml-6 mt-2 space-y-2">
                          {Object.entries(customerBookings).map(([customerName, bookingsForCustomer]) => {
                            const key = `${date}::${customerName}`;
                            return (
                              <Collapsible key={key}>
                                <CollapsibleTrigger
                                  onClick={() => toggleCustomerExpansion(key)}
                                  className="flex items-center gap-2 w-full p-2 text-left bg-background rounded border hover:bg-muted/50 transition-colors"
                                >
                                  {expandedCustomers.has(key) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  <Users className="h-3 w-3" />
                                  <span className="font-medium">{customerName}</span>
                                  <Badge variant="secondary" className="ml-auto text-xs">
                                    {bookingsForCustomer.length} booking{bookingsForCustomer.length !== 1 ? 's' : ''}
                                  </Badge>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  {expandedCustomers.has(key) && (
                                    <div className="ml-6 mt-2 space-y-2">
                                      {bookingsForCustomer
                                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                        .map(booking => (
                                        <div key={booking.id} className="p-3 border rounded-lg bg-card">
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
                                                    <Badge variant="outline" className="text-xs">
                                                      {Math.round(booking.discount_percentage)}% off
                                                    </Badge>
                                                  )}
                                                </div>
                                                {booking.coupon_code && (
                                                  <Badge variant="secondary" className="text-xs mt-1">
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
