// Service to efficiently fetch and prepare data for Gemini AI chat
import { supabase } from '@/integrations/supabase/client';

export interface BusinessSnapshot {
  timestamp: string;
  customers: any[];
  products: any[];
  stations: any[];
  sessions: any[];
  bills: any[];
  tournaments: any[];
  expenses: any[];
  bookings: any[];
  staff: any[];
  cashVault: any[];
}

export const fetchBusinessDataForAI = async (): Promise<string> => {
  try {
    console.log('Fetching optimized business data for AI...');
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const todayDateStr = now.toISOString().split('T')[0];
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Fetch ONLY essential data with smart limits
    const [
      { data: todayBills, error: todayBillsError },
      { data: recentBills, error: recentBillsError },
      { data: todayBookings, error: todayBookingsError },
      { data: upcomingBookings, error: upcomingBookingsError },
      { data: customers, error: customersError },
      { data: products, error: productsError },
      { data: stations, error: stationsError },
      { data: activeSessions, error: sessionsError },
      { data: expenses, error: expensesError },
    ] = await Promise.all([
      // Today's bills
      supabase.from('bills').select('id, total, payment_method, created_at').gte('created_at', todayStart).lte('created_at', todayEnd),
      // Last 7 days summary
      supabase.from('bills').select('total').gte('created_at', last7Days),
      // Today's bookings with customer and station info
      supabase.from('bookings').select('booking_date, start_time, end_time, status, station_id, customer_id').eq('booking_date', todayDateStr),
      // Upcoming bookings
      supabase.from('bookings').select('booking_date, start_time, status').gte('booking_date', todayDateStr).limit(100),
      // Top customers
      supabase.from('customers').select('id, name, is_member, loyalty_points, total_spent').order('total_spent', { ascending: false }).limit(20),
      // Products
      supabase.from('products').select('name, price, category, stock').order('created_at', { ascending: false }).limit(50),
      // Stations
      supabase.from('stations').select('id, name, type, hourly_rate, is_occupied'),
      // Active sessions
      supabase.from('sessions').select('station_id, start_time').is('end_time', null),
      // Recent expenses
      supabase.from('expenses').select('name, amount, category').order('created_at', { ascending: false }).limit(20),
    ]);

    // Log errors but continue
    if (todayBillsError) console.error('Error fetching today bills:', todayBillsError);
    if (recentBillsError) console.error('Error fetching recent bills:', recentBillsError);
    if (todayBookingsError) console.error('Error fetching today bookings:', todayBookingsError);
    if (upcomingBookingsError) console.error('Error fetching upcoming bookings:', upcomingBookingsError);
    if (customersError) console.error('Error fetching customers:', customersError);
    if (productsError) console.error('Error fetching products:', productsError);
    if (stationsError) console.error('Error fetching stations:', stationsError);
    if (sessionsError) console.error('Error fetching sessions:', sessionsError);
    if (expensesError) console.error('Error fetching expenses:', expensesError);

    // Calculate TODAY stats
    const todayRevenue = todayBills?.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0) || 0;
    const todayCashCount = todayBills?.filter((b: any) => b.payment_method === 'cash').length || 0;
    const todayUPICount = todayBills?.filter((b: any) => b.payment_method === 'upi').length || 0;
    
    // Calculate week stats
    const weekRevenue = recentBills?.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0) || 0;
    
    // Summary data
    const totalMembers = customers?.filter((c: any) => c.is_member).length || 0;
    const topSpenders = customers?.slice(0, 5).map((c: any) => `${c.name}:₹${Number(c.total_spent).toFixed(0)}`).join('|') || 'None';
    
    const lowStockProducts = products?.filter((p: any) => Number(p.stock) < 10).map((p: any) => `${p.name}(${p.stock})`).join('|') || 'None';
    const outOfStock = products?.filter((p: any) => Number(p.stock) === 0).length || 0;
    
    const occupied = stations?.filter((s: any) => s.is_occupied).length || 0;
    const stationList = stations?.map((s: any) => `${s.name}(${s.type}):${s.is_occupied ? 'BUSY' : 'FREE'}`).join('|') || 'None';
    
    // Build detailed booking info with customer name, station, and timings
    let todayBookingsDetail = 'None';
    if (todayBookings && todayBookings.length > 0 && customers && stations) {
      const bookingDetails = todayBookings.slice(0, 10).map((b: any) => {
        const customer = customers.find((c: any) => c.id === b.customer_id);
        const station = stations.find((s: any) => s.id === b.station_id);
        const customerName = customer?.name || 'Unknown';
        const stationName = station?.name || 'Unknown';
        return `${customerName}@${stationName}:${b.start_time}-${b.end_time}(${b.status})`;
      });
      todayBookingsDetail = bookingDetails.join('|');
    }
    
    // Build MINIMAL context
    const context = `CUEPHORIA ${todayDateStr}

TODAY: Sales:${todayBills?.length || 0} Revenue:₹${todayRevenue.toFixed(0)} Cash:${todayCashCount} UPI:${todayUPICount} Bookings:${todayBookings?.length || 0}

BOOKINGS_DETAIL: ${todayBookingsDetail}

WEEK: Revenue:₹${weekRevenue.toFixed(0)}

CUSTOMERS: Total:${customers?.length || 0} Members:${totalMembers} Top:${topSpenders}

STATIONS: Total:${stations?.length || 0} Occupied:${occupied} List:${stationList}

EXPENSES: ${expenses?.slice(0, 5).map((e: any) => `${e.category}:₹${Number(e.amount).toFixed(0)}`).join('|') || 'None'}
`;

    console.log(`Optimized context: ${context.length} chars`);
    
    return context;
  } catch (error) {
    console.error('Error fetching business data:', error);
    return 'Error fetching business data. Please try again.';
  }
};
