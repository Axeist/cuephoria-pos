import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingEditDialog } from '@/components/booking/BookingEditDialog';
import { BookingDeleteDialog } from '@/components/booking/BookingDeleteDialog';
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Phone, 
  Mail, 
  Clock, 
  MapPin, 
  Plus, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  User,
  Users,
  CalendarDays,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface Station {
  id: string;
  name: string;
  type: 'ps5' | '8ball';
  hourly_rate: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  notes?: string;
  final_price: number;
  station_id: string;
  customer_id: string;
  station: Station;
  customer: Customer;
  created_at: string;
}

interface GroupedBookings {
  [date: string]: {
    [customerId: string]: {
      customer: Customer;
      bookings: Booking[];
    };
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
  const [groupedBookings, setGroupedBookings] = useState<GroupedBookings>({});
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({
    date: '',
    status: 'all',
    stationType: 'all',
    search: ''
  });
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    groupBookings();
  }, [bookings]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          station:stations!inner(id, name, type, hourly_rate),
          customer:customers!inner(id, name, phone, email)
        `)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: true });

      // Apply filters
      if (filters.date) {
        query = query.eq('booking_date', filters.date);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply station type filter on the client side
      if (filters.stationType && filters.stationType !== 'all') {
        filteredData = data.filter(booking => booking.station.type === filters.stationType);
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter(booking => 
          booking.customer.name.toLowerCase().includes(searchTerm) ||
          booking.customer.phone.includes(searchTerm) ||
          booking.station.name.toLowerCase().includes(searchTerm) ||
          (booking.customer.email && booking.customer.email.toLowerCase().includes(searchTerm))
        );
      }

      setBookings(filteredData.map(booking => ({
        ...booking,
        station: {
          ...booking.station,
          type: booking.station.type as 'ps5' | '8ball'
        }
      })));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const groupBookings = () => {
    const grouped: GroupedBookings = {};

    bookings.forEach(booking => {
      const date = booking.booking_date;
      const customerId = booking.customer_id;

      if (!grouped[date]) {
        grouped[date] = {};
      }

      if (!grouped[date][customerId]) {
        grouped[date][customerId] = {
          customer: booking.customer,
          bookings: []
        };
      }

      grouped[date][customerId].bookings.push(booking);
    });

    setGroupedBookings(grouped);
  };

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const toggleCustomerExpansion = (customerKey: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerKey)) {
      newExpanded.delete(customerKey);
    } else {
      newExpanded.add(customerKey);
    }
    setExpandedCustomers(newExpanded);
  };

  const handleEdit = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditDialogOpen(true);
  };

  const handleDelete = (booking: Booking) => {
    setSelectedBooking(booking);
    setDeleteDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedBooking(null);
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    fetchBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rescheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'completed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'no-show': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTotalBookingsForDate = (date: string) => {
    return Object.values(groupedBookings[date] || {}).reduce(
      (total, customerGroup) => total + customerGroup.bookings.length, 
      0
    );
  };

  const getTotalRevenueForDate = (date: string) => {
    return Object.values(groupedBookings[date] || {}).reduce(
      (total, customerGroup) => total + customerGroup.bookings.reduce(
        (bookingTotal, booking) => bookingTotal + booking.final_price, 
        0
      ), 
      0
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple flex items-center justify-center">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple via-cuephoria-lightpurple to-cuephoria-blue">
              Bookings
            </h1>
            <p className="text-gray-400 mt-1">Manage all gaming session reservations</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-cuephoria-purple/20 to-cuephoria-purple/5 border-cuephoria-purple/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cuephoria-purple/20 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-cuephoria-purple" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Bookings</p>
                  <p className="text-2xl font-bold text-white">{bookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-green-600/5 border-green-600/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Confirmed</p>
                  <p className="text-2xl font-bold text-white">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border-blue-600/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Unique Customers</p>
                  <p className="text-2xl font-bold text-white">
                    {new Set(bookings.map(b => b.customer_id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-600/5 border-yellow-600/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">
                    ₹{bookings.reduce((sum, b) => sum + b.final_price, 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6 bg-black/20 backdrop-blur-md border-gray-800/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="h-5 w-5 text-cuephoria-purple" />
              Filters & Actions
            </CardTitle>
            <Button 
              onClick={handleAdd}
              className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Booking
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date-filter" className="text-gray-200">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="bg-black/30 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="status-filter" className="text-gray-200">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="bg-black/30 border-gray-700 text-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="station-type-filter" className="text-gray-200">Station Type</Label>
              <Select value={filters.stationType} onValueChange={(value) => setFilters(prev => ({ ...prev, stationType: value }))}>
                <SelectTrigger className="bg-black/30 border-gray-700 text-white">
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
              <Label htmlFor="search-filter" className="text-gray-200">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-filter"
                  placeholder="Search customers, stations..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 bg-black/30 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={fetchBookings} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
            <Button variant="outline" onClick={() => setFilters({ date: '', status: 'all', stationType: 'all', search: '' })}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {Object.keys(groupedBookings).length === 0 ? (
          <Card className="bg-black/20 backdrop-blur-md border-gray-800/50">
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No bookings found</h3>
              <p className="text-gray-500">Try adjusting your filters or add a new booking</p>
            </CardContent>
          </Card>
        ) : (
          Object.keys(groupedBookings)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map(date => (
              <Card key={date} className="bg-black/20 backdrop-blur-md border-gray-800/50 overflow-hidden">
                <Collapsible>
                  <CollapsibleTrigger 
                    className="w-full p-6 hover:bg-gray-800/30 transition-colors"
                    onClick={() => toggleDateExpansion(date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {expandedDates.has(date) ? 
                          <ChevronDown className="h-5 w-5 text-cuephoria-purple" /> : 
                          <ChevronRight className="h-5 w-5 text-cuephoria-purple" />
                        }
                        <div className="text-left">
                          <h3 className="text-xl font-semibold text-white">
                            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                          </h3>
                          <p className="text-gray-400">
                            {getTotalBookingsForDate(date)} bookings • ₹{getTotalRevenueForDate(date).toFixed(0)} revenue
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-cuephoria-purple/20 text-cuephoria-purple border-cuephoria-purple/30">
                          {Object.keys(groupedBookings[date]).length} customers
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-6 pb-6 space-y-3">
                      {Object.entries(groupedBookings[date]).map(([customerId, customerGroup]) => {
                        const customerKey = `${date}-${customerId}`;
                        return (
                          <Card key={customerKey} className="bg-gray-800/50 border-gray-700/50">
                            <Collapsible>
                              <CollapsibleTrigger 
                                className="w-full p-4 hover:bg-gray-700/30 transition-colors"
                                onClick={() => toggleCustomerExpansion(customerKey)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {expandedCustomers.has(customerKey) ? 
                                      <ChevronDown className="h-4 w-4 text-cuephoria-lightpurple" /> : 
                                      <ChevronRight className="h-4 w-4 text-cuephoria-lightpurple" />
                                    }
                                    <div className="w-8 h-8 rounded-full bg-cuephoria-lightpurple/20 flex items-center justify-center">
                                      <User className="h-4 w-4 text-cuephoria-lightpurple" />
                                    </div>
                                    <div className="text-left">
                                      <p className="font-medium text-white">{customerGroup.customer.name}</p>
                                      <p className="text-sm text-gray-400">{customerGroup.customer.phone}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                                      {customerGroup.bookings.length} bookings
                                    </Badge>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="px-4 pb-4 space-y-2">
                                  {customerGroup.bookings.map(booking => (
                                    <div key={booking.id} className="bg-black/30 rounded-lg p-4 flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="text-sm">
                                          <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            <span className="text-white font-medium">{booking.station.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                              {booking.station.type === 'ps5' ? 'PlayStation 5' : '8-Ball Pool'}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-4 text-gray-400">
                                            <div className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              <span>{booking.start_time} - {booking.end_time}</span>
                                            </div>
                                            <span>₹{booking.final_price}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Badge className={getStatusColor(booking.status)}>
                                          {booking.status}
                                        </Badge>
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(booking)}
                                            className="h-8 w-8 p-0 hover:bg-cuephoria-purple/20"
                                          >
                                            <Edit3 className="h-3 w-3 text-cuephoria-purple" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(booking)}
                                            className="h-8 w-8 p-0 hover:bg-red-500/20"
                                          >
                                            <Trash2 className="h-3 w-3 text-red-400" />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
        )}
      </div>

      {/* Dialogs */}
      <BookingEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        booking={selectedBooking}
        onSave={handleSave}
      />

      <BookingDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        booking={selectedBooking}
        onDelete={handleSave}
      />
    </div>
  );
}