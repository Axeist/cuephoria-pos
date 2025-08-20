import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingEditDialog } from '@/components/booking/BookingEditDialog';
import { BookingDeleteDialog } from '@/components/booking/BookingDeleteDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Calendar, Search, Filter, Download, Phone, Mail, Clock, MapPin, Plus,
  Edit2, Trash2, ChevronDown, ChevronRight, Users, CalendarDays, TrendingUp,
  Percent, Ticket
} from 'lucide-react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';

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
  date: string;
  status: string;
  stationType: string;
  search: string;
  coupon: string; // 'all' | 'none' | <CODE>
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    date: '',
    status: 'all',
    stationType: 'all',
    search: '',
    coupon: 'all'
  });
  const [couponOptions, setCouponOptions] = useState<string[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBookings();
  }, [filters.date, filters.status]); // server-side filters only

  // Real-time updates for bookings
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
          customer_id
        `)
        // most recent first
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (filters.date) query = query.eq('booking_date', filters.date);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

      const { data: bookingsData, error } = await query;
      if (error) throw error;

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        setCouponOptions([]);
        return;
      }

      const stationIds = [...new Set(bookingsData.map(b => b.station_id))];
      const customerIds = [...new Set(bookingsData.map(b => b.customer_id))];

      const [{ data: stationsData, error: stationsError }, { data: customersData, error: customersError }] =
        await Promise.all([
          supabase.from('stations').select('id, name, type').in('id', stationIds),
          supabase.from('customers').select('id, name, phone, email').in('id', customerIds)
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
          station: { name: station?.name || 'Unknown', type: station?.type || 'unknown' },
          customer: { name: customer?.name || 'Unknown', phone: customer?.phone || '', email: customer?.email ?? null }
        } as Booking;
      });

      // Save coupon options (unique present codes)
      const presentCodes = Array.from(
        new Set(transformed.map(t => (t.coupon_code || '').trim()).filter(Boolean))
      ) as string[];
      setCouponOptions(presentCodes.sort());

      // Client-side filters (type / search / coupon)
      let filtered = transformed;

      if (filters.stationType && filters.stationType !== 'all') {
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

      if (filters.coupon && filters.coupon !== 'all') {
        if (filters.coupon === 'none') {
          filtered = filtered.filter(b => !b.coupon_code);
        } else {
          filtered = filtered.filter(b => (b.coupon_code || '').toUpperCase() === filters.coupon.toUpperCase());
        }
      }

      setBookings(filtered);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBooking = (booking: Booking) => { setSelectedBooking(booking); setEditDialogOpen(true); };
  const handleDeleteBooking = (booking: Booking) => { setSelectedBooking(booking); setDeleteDialogOpen(true); };

  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
        // collapse nested customers of this date
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
      ['Date', 'Start', 'End', 'Station', 'Customer', 'Phone', 'Status', 'Price', 'Coupon'].join(','),
      ...bookings.map(b => [
        b.booking_date,
        b.start_time,
        b.end_time,
        b.station.name.replace(/,/g, ' '),
        b.customer.name.replace(/,/g, ' '),
        b.customer.phone,
        b.status,
        b.final_price ?? 0,
        b.coupon_code || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTime = (timeString: string) =>
    new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getStationTypeLabel = (type: string) => type === 'ps5' ? 'PlayStation 5' : type === '8ball' ? '8-Ball Pool' : type;

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d, yyyy');
  };

  // Group by DATE (desc) → CUSTOMER
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

  // ===== Insights =====
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const todayBookings = bookings.filter(b => b.booking_date === format(new Date(), 'yyyy-MM-dd')).length;
  const uniqueCustomers = new Set(bookings.map(b => b.customer.name)).size;

  const grossRevenue = bookings.reduce((sum, b) => sum + (b.final_price ?? 0), 0);
  const discountedCount = bookings.filter(b => (b.coupon_code && b.coupon_code.trim()) || (b.discount_percentage ?? 0) > 0).length;
  const avgOrderValue = totalBookings ? Math.round(grossRevenue / totalBookings) : 0;

  const couponUsageMap = bookings.reduce((m, b) => {
    const k = (b.coupon_code || 'none').toUpperCase();
    m[k] = (m[k] || 0) + 1;
    return m;
  }, {} as Record<string, number>);

  // render sorted coupon usage (top 3)
  const topCoupons = Object.entries(couponUsageMap)
    .filter(([k]) => k !== 'NONE')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text font-heading">Bookings</h1>
          <p className="text-muted-foreground">Manage customer bookings and reservations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportBookings} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
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

      {/* Stats Cards (existing) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{confirmedBookings}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Bookings</p>
                <p className="text-2xl font-bold">{todayBookings}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Customers</p>
                <p className="text-2xl font-bold">{uniqueCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gross Revenue</p>
                <p className="text-2xl font-bold">₹{grossRevenue}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Discounted Bookings</p>
                <p className="text-2xl font-bold text-purple-600">{discountedCount}</p>
              </div>
              <Percent className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Order Value</p>
                <p className="text-2xl font-bold">₹{avgOrderValue}</p>
              </div>
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
            {topCoupons.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {topCoupons.map(([code, count]) => (
                  <Badge key={code} variant="secondary" className="text-xs">
                    {code} · {count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="date-filter">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="station-type-filter">Station Type</Label>
              <Select value={filters.stationType} onValueChange={(value) => setFilters(prev => ({ ...prev, stationType: value }))}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="ps5">PlayStation 5</SelectItem>
                  <SelectItem value="8ball">8-Ball Pool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="coupon-filter">Coupon</Label>
              <Select value={filters.coupon} onValueChange={(value) => setFilters(prev => ({ ...prev, coupon: value }))}>
                <SelectTrigger><SelectValue placeholder="All coupons" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All coupons</SelectItem>
                  <SelectItem value="none">No coupon</SelectItem>
                  {couponOptions.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search-filter">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  placeholder="Search by name, phone, station..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical Bookings Display */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings found with the current filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedBookings)
                // recent date at TOP
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
                                      {bookingsForCustomer.map(booking => (
                                        <div key={booking.id} className="p-3 border rounded-lg bg-card">
                                          <div className="flex items-center justify-between">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                                              <div>
                                                <div className="text-sm text-muted-foreground">Time</div>
                                                <div className="font-medium flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
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
                                                <div className="text-sm text-muted-foreground">Coupon</div>
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="secondary" className="text-xs">
                                                    {booking.coupon_code ? booking.coupon_code : '—'}
                                                  </Badge>
                                                  {!!booking.discount_percentage && (
                                                    <Badge variant="outline" className="text-xs">
                                                      {Math.round(booking.discount_percentage)}%
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>

                                              <div>
                                                <div className="text-sm text-muted-foreground">Status & Price</div>
                                                <div className="flex items-center gap-2">
                                                  <BookingStatusBadge status={booking.status} />
                                                  {typeof booking.final_price === 'number' && (
                                                    <span className="text-sm font-medium">₹{booking.final_price}</span>
                                                  )}
                                                </div>
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

      {/* Edit Dialog */}
      <BookingEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        booking={selectedBooking}
        onBookingUpdated={fetchBookings}
      />

      {/* Delete Dialog */}
      <BookingDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        booking={selectedBooking}
        onBookingDeleted={fetchBookings}
      />
    </div>
  );
}
