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
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Fetch essential data with minimal fields
    const [
      { data: todayBills, error: todayBillsError },
      { data: weekBills, error: weekBillsError },
      { data: monthBills, error: monthBillsError },
      { data: weekBookings, error: weekBookingsError },
      { data: upcomingBookings, error: upcomingBookingsError },
      { data: customers, error: customersError },
      { data: products, error: productsError },
      { data: stations, error: stationsError },
      { data: expenses, error: expensesError },
    ] = await Promise.all([
      // Today's bills - detailed
      supabase.from('bills').select('total, payment_method').gte('created_at', todayStart).lte('created_at', todayEnd),
      // Last 7 days - detailed for trend analysis
      supabase.from('bills').select('total, payment_method, created_at').gte('created_at', last7Days),
      // Last 30 days - summary only
      supabase.from('bills').select('total').gte('created_at', last30Days),
      // Last 7 days bookings with details
      supabase.from('bookings').select('booking_date, start_time, end_time, status, station_id, customer_id').gte('booking_date', last7Days.split('T')[0]),
      // Upcoming bookings
      supabase.from('bookings').select('booking_date, start_time, status').gte('booking_date', todayDateStr).limit(10),
      // Top customers only
      supabase.from('customers').select('id, name, is_member, total_spent').order('total_spent', { ascending: false }).limit(10),
      // Products summary
      supabase.from('products').select('name, category, stock').limit(30),
      // Stations
      supabase.from('stations').select('id, name, type, is_occupied'),
      // Recent expenses
      supabase.from('expenses').select('amount, category').order('created_at', { ascending: false }).limit(10),
    ]);

    // Log errors but continue
    if (todayBillsError) console.error('Error fetching today bills:', todayBillsError);
    if (weekBillsError) console.error('Error fetching week bills:', weekBillsError);
    if (monthBillsError) console.error('Error fetching month bills:', monthBillsError);
    if (weekBookingsError) console.error('Error fetching week bookings:', weekBookingsError);
    if (upcomingBookingsError) console.error('Error fetching upcoming bookings:', upcomingBookingsError);
    if (customersError) console.error('Error fetching customers:', customersError);
    if (productsError) console.error('Error fetching products:', productsError);
    if (stationsError) console.error('Error fetching stations:', stationsError);
    if (expensesError) console.error('Error fetching expenses:', expensesError);

    // Calculate TODAY stats
    const todayRevenue = todayBills?.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0) || 0;
    const todayCashCount = todayBills?.filter((b: any) => b.payment_method === 'cash').length || 0;
    const todayUPICount = todayBills?.filter((b: any) => b.payment_method === 'upi').length || 0;
    
    // Calculate week stats - daily breakdown
    const weekDaily: Record<string, number> = weekBills?.reduce((acc: Record<string, number>, b: any) => {
      const date = new Date(b.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (Number(b.total) || 0);
      return acc;
    }, {}) || {};
    const weekRevenue = Object.values(weekDaily).reduce((sum, val) => sum + val, 0);
    const weekDays = Object.keys(weekDaily).map(d => `${d.split('-')[2]}:₹${weekDaily[d].toFixed(0)}`).join('|') || 'None';
    
    // Calculate month stat
    const monthRevenue = monthBills?.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0) || 0;
    
    // Weekly bookings with customer details
    let weekBookingsDetail = 'None';
    if (weekBookings && weekBookings.length > 0 && customers && stations) {
      const recentBookings = weekBookings.slice(0, 20).map((b: any) => {
        const customer = customers.find((c: any) => c.id === b.customer_id);
        const station = stations.find((s: any) => s.id === b.station_id);
        const customerName = customer?.name || 'U';
        const stationName = station?.name || 'U';
        return `${customerName}@${stationName}:${b.booking_date}:${b.start_time}-${b.end_time}(${b.status})`;
      });
      weekBookingsDetail = recentBookings.join('|');
    }
    
    // Upcoming bookings
    const upcoming = upcomingBookings?.slice(0, 5).map((b: any) => `${b.booking_date}:${b.start_time}(${b.status})`).join('|') || 'None';
    
    // Summary data
    const totalMembers = customers?.filter((c: any) => c.is_member).length || 0;
    const topSpenders = customers?.slice(0, 3).map((c: any) => `${c.name}:₹${Number(c.total_spent).toFixed(0)}`).join('|') || 'None';
    
    const lowStock = products?.filter((p: any) => Number(p.stock) < 10).map((p: any) => `${p.name}(${p.stock})`).join('|') || 'None';
    const occupied = stations?.filter((s: any) => s.is_occupied).length || 0;
    const stationList = stations?.map((s: any) => `${s.name}(${s.is_occupied ? 1 : 0})`).join('|') || 'None';
    
    const expenseTotal = expenses?.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || 0;
    
    // Build ULTRA-COMPACT context - minimal tokens
    const context = `${todayDateStr}

TODAY:${todayBills?.length || 0} sales ₹${todayRevenue.toFixed(0)} Cash:${todayCashCount} UPI:${todayUPICount}

WEEK:₹${weekRevenue.toFixed(0)} Days:${weekDays}

MONTH:₹${monthRevenue.toFixed(0)}

BOOKINGS:${weekBookingsDetail}

UPCOMING:${upcoming}

CUSTOMERS:${totalMembers}mem Top:${topSpenders}

PRODUCTS:Low:${lowStock}

STATIONS:${occupied}/${stations?.length || 0} ${stationList}

EXPENSES:₹${expenseTotal.toFixed(0)}
`;

    console.log(`Optimized context: ${context.length} chars`);
    
    return context;
  } catch (error) {
    console.error('Error fetching business data:', error);
    return 'Error fetching business data. Please try again.';
  }
};
