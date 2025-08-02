import React, { useState, useEffect } from 'react';
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
import { Calendar, Search, Filter, Download, Phone, Mail, Clock, MapPin, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Users, CalendarDays, TrendingUp } from 'lucide-react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  final_price?: number;
  station: {
    name: string;
    type: string;
  };
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
}

interface Filters {
  date: string;
  status: string;
  stationType: string;
  search: string;
}

export default function BookingManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    date: '',
    status: '',
    stationType: '',
    search: ''
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  // Real-time updates for bookings
  useEffect(() => {
    const channel = supabase
      .channel('booking-management-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          // Refresh bookings when any booking changes
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          station_id,
          customer_id
        `)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

      // Apply filters
      if (filters.date) {
        query = query.eq('booking_date', filters.date);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data: bookingsData, error } = await query;

      if (error) throw error;

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        // Clear expanded states when no bookings
        setExpandedDates(new Set());
        setExpandedCustomers(new Set());
        return;
      }

      // Get unique station and customer IDs
      const stationIds = [...new Set(bookingsData.map(b => b.station_id))];
      const customerIds = [...new Set(bookingsData.map(b => b.customer_id))];

      // Fetch stations data
      const { data: stationsData, error: stationsError } = await supabase
        .from('stations')
        .select('id, name, type')
        .in('id', stationIds);

      if (stationsError) throw stationsError;

      // Fetch customers data
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .in('id', customerIds);

      if (customersError) throw customersError;

      // Transform the data to match our interface
      const transformedData = bookingsData.map(booking => {
        const station = stationsData?.find(s => s.id === booking.station_id);
        const customer = customersData?.find(c => c.id === booking.customer_id);

        return {
          id: booking.id,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration: booking.duration,
          status: booking.status,
          notes: booking.notes,
          final_price: booking.final_price,
          station: {
            name: station?.name || 'Unknown',
            type: station?.type || 'unknown'
          },
          customer: {
            name: customer?.name || 'Unknown',
            phone: customer?.phone || '',
            email: customer?.email
          }
        };
      });

      // Apply additional filters on the client side
      let filteredData = transformedData;
      
      if (filters.stationType && filters.stationType !== 'all') {
        filteredData = transformedData.filter(booking => booking.station.type === filters.stationType);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(booking =>
          booking.customer.name.toLowerCase().includes(searchLower) ||
          booking.customer.phone.includes(filters.search) ||
          (booking.customer.email && booking.customer.email.toLowerCase().includes(searchLower))
        );
      }

      setBookings(filteredData as Booking[]);
      
      // Auto-expand sections when data is refreshed to show available bookings
      if (filteredData.length > 0) {
        const dates = new Set(filteredData.map(b => b.booking_date));
        const customerKeys = new Set<string>();
        
        filteredData.forEach(booking => {
          const dateCustomerKey = `${booking.booking_date}-${booking.customer.name}`;
          customerKeys.add(dateCustomerKey);
        });
        
        setExpandedDates(dates);
        setExpandedCustomers(customerKeys);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
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
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
        // Also collapse all customers for this date
        const customersToRemove = Array.from(expandedCustomers).filter(key => key.startsWith(date));
        customersToRemove.forEach(key => newSet.delete(key));
        setExpandedCustomers(new Set(Array.from(expandedCustomers).filter(key => !key.startsWith(date))));
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const toggleCustomerExpansion = (dateCustomerKey: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateCustomerKey)) {
        newSet.delete(dateCustomerKey);
      } else {
        newSet.add(dateCustomerKey);
      }
      return newSet;
    });
  };

  const exportBookings = () => {
    // Simple CSV export
    const csvContent = [
      ['Date', 'Time', 'Station', 'Customer', 'Phone', 'Status', 'Price'].join(','),
      ...bookings.map(booking => [
        booking.booking_date,
        `${booking.start_time}-${booking.end_time}`,
        booking.station.name,
        booking.customer.name,
        booking.customer.phone,
        booking.status,
        booking.final_price || 0
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

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStationTypeLabel = (type: string) => {
    return type === 'ps5' ? 'PlayStation 5' : type === '8ball' ? '8-Ball Pool' : type;
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d, yyyy');
  };

  // Group bookings by date and then by customer
  const groupedBookings = bookings.reduce((acc, booking) => {
    const dateKey = booking.booking_date;
    const customerKey = booking.customer.name;
    
    if (!acc[dateKey]) {
      acc[dateKey] = {};
    }
    if (!acc[dateKey][customerKey]) {
      acc[dateKey][customerKey] = [];
    }
    
    acc[dateKey][customerKey].push(booking);
    return acc;
  }, {} as Record<string, Record<string, Booking[]>>);

  // Calculate stats
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const todayBookings = bookings.filter(b => b.booking_date === format(new Date(), 'yyyy-MM-dd')).length;
  const uniqueCustomers = new Set(bookings.map(b => b.customer.name)).size;

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text font-heading">Bookings</h1>
          <p className="text-muted-foreground">
            Manage customer bookings and reservations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportBookings} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="ps5">PlayStation 5</SelectItem>
                  <SelectItem value="8ball">8-Ball Pool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search-filter">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  placeholder="Search by name or phone..."
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
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([date, customerBookings]) => (
                  <Collapsible key={date}>
                    <CollapsibleTrigger
                      onClick={() => toggleDateExpansion(date)}
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
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {expandedDates.has(date) && (
                        <div className="ml-6 mt-2 space-y-2">
                          {Object.entries(customerBookings).map(([customerName, bookings]) => {
                            const dateCustomerKey = `${date}-${customerName}`;
                            return (
                              <Collapsible key={dateCustomerKey}>
                                <CollapsibleTrigger
                                  onClick={() => toggleCustomerExpansion(dateCustomerKey)}
                                  className="flex items-center gap-2 w-full p-2 text-left bg-background rounded border hover:bg-muted/50 transition-colors"
                                >
                                  {expandedCustomers.has(dateCustomerKey) ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  <Users className="h-3 w-3" />
                                  <span className="font-medium">{customerName}</span>
                                  <Badge variant="secondary" className="ml-auto text-xs">
                                    {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
                                  </Badge>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  {expandedCustomers.has(dateCustomerKey) && (
                                    <div className="ml-6 mt-2 space-y-2">
                                      {bookings.map((booking) => (
                                        <div key={booking.id} className="p-3 border rounded-lg bg-card">
                                          <div className="flex items-center justify-between">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
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
                                                <div className="text-sm text-muted-foreground">Status & Price</div>
                                                <div className="flex items-center gap-2">
                                                  <BookingStatusBadge status={booking.status} />
                                                  {booking.final_price && (
                                                    <span className="text-sm font-medium">₹{booking.final_price}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex gap-1 ml-4">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditBooking(booking)}
                                              >
                                                <Edit2 className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteBooking(booking)}
                                              >
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