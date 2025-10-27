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

// Helper to truncate arrays to prevent token exhaustion
function truncateArray<T>(arr: T[], limit: number): T[] {
  return arr.slice(0, limit);
}

// Helper to format summary statistics
function createSummary(data: any[], entityName: string): string {
  const count = data.length;
  const recent = data.slice(0, 5).map(item => {
    const simplified = { ...item };
    // Remove large data fields
    if (simplified.players) delete simplified.players;
    if (simplified.matches) delete simplified.matches;
    return simplified;
  });
  return `${entityName}: ${count} total records. Recent 5: ${JSON.stringify(recent)}`;
}

export const fetchBusinessDataForAI = async (): Promise<string> => {
  try {
    console.log('Fetching ALL business data for AI...');
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const todayDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Fetch ALL data in parallel - NO LIMITS
    const [
      { data: customers, error: customersError },
      { data: products, error: productsError },
      { data: stations, error: stationsError },
      { data: allSessions, error: sessionsError },
      { data: allBills, error: billsError },
      { data: todayBills, error: todayBillsError },
      { data: tournaments, error: tournamentsError },
      { data: expenses, error: expensesError },
      { data: allBookings, error: bookingsError },
      { data: todayBookings, error: todayBookingsError },
      { data: staff, error: staffError },
      { data: cashVault, error: cashVaultError },
    ] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('stations').select('*').order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').order('start_time', { ascending: false }),
      supabase.from('bills').select('*').order('created_at', { ascending: false }),
      supabase.from('bills').select('*').gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').order('booking_date', { ascending: false }),
      supabase.from('bookings').select('*').eq('booking_date', todayDateStr),
      supabase.from('staff_profiles').select('*'),
      supabase.from('cash_vault_transactions').select('*').order('created_at', { ascending: false }),
    ]);

    // Log errors but continue
    if (customersError) console.error('Error fetching customers:', customersError);
    if (productsError) console.error('Error fetching products:', productsError);
    if (stationsError) console.error('Error fetching stations:', stationsError);
    if (sessionsError) console.error('Error fetching sessions:', sessionsError);
    if (billsError) console.error('Error fetching bills:', billsError);
    if (todayBillsError) console.error('Error fetching today bills:', todayBillsError);
    if (tournamentsError) console.error('Error fetching tournaments:', tournamentsError);
    if (expensesError) console.error('Error fetching expenses:', expensesError);
    if (bookingsError) console.error('Error fetching bookings:', bookingsError);
    if (todayBookingsError) console.error('Error fetching today bookings:', todayBookingsError);
    if (staffError) console.error('Error fetching staff:', staffError);
    if (cashVaultError) console.error('Error fetching cash vault:', cashVaultError);

    const sessions = allSessions || [];
    const bills = allBills || [];
    const bookings = allBookings || [];

    // Calculate key statistics
    const todayRevenue = todayBills?.reduce((sum: number, bill: any) => sum + (bill.total || 0), 0) || 0;
    const todaySalesCount = todayBills?.length || 0;
    const todayBookingsCount = todayBookings?.length || 0;
    
    const stats = {
      CURRENT_DATE: new Date().toISOString().split('T')[0],
      totalCustomers: customers?.length || 0,
      totalProducts: products?.length || 0,
      totalStations: stations?.length || 0,
      activeSessions: sessions.filter(s => !s.end_time).length || 0,
      totalRevenueAllTime: bills.reduce((sum: number, bill: any) => sum + (bill.total || 0), 0),
      totalBills: bills.length || 0,
      totalTournaments: tournaments?.length || 0,
      totalExpenses: expenses?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0),
      totalBookings: bookings.length || 0,
      upcomingBookings: bookings.filter(b => new Date(b.booking_date) >= new Date()).length || 0,
      TODAY_RECEIPTS: todaySalesCount,
      TODAY_REVENUE: todayRevenue,
      TODAY_BOOKINGS: todayBookingsCount,
    };

    // Build comprehensive context
    const contextParts = [
      '=== CUEPHORIA BUSINESS DATA - ALL RECORDS ===',
      `\nCURRENT DATE: ${stats.CURRENT_DATE}`,
      `\nTODAY'S SALES: ${stats.TODAY_RECEIPTS} transactions, Revenue: ₹${stats.TODAY_REVENUE}`,
      `\nTODAY'S BOOKINGS: ${stats.TODAY_BOOKINGS}`,
      '\n=== OVERALL STATISTICS ===',
      `Total Customers: ${stats.totalCustomers}`,
      `Total Products: ${stats.totalProducts}`,
      `Total Stations: ${stats.totalStations}`,
      `Active Sessions: ${stats.activeSessions}`,
      `Total Revenue (All Time): ₹${stats.totalRevenueAllTime}`,
      `Total Bills: ${stats.totalBills}`,
      `Total Bookings: ${stats.totalBookings}`,
      `Upcoming Bookings: ${stats.upcomingBookings}`,
      '\n=== ALL BILLS DATA ===',
      JSON.stringify(bills, null, 2),
      '\n=== ALL BOOKINGS DATA ===',
      JSON.stringify(bookings, null, 2),
      '\n=== ALL SESSIONS DATA ===',
      JSON.stringify(sessions, null, 2),
      '\n=== ALL PRODUCTS DATA ===',
      JSON.stringify(products, null, 2),
      '\n=== ALL CUSTOMERS DATA ===',
      JSON.stringify(customers, null, 2),
      '\n=== ALL STATIONS DATA ===',
      JSON.stringify(stations, null, 2),
      '\n=== ALL EXPENSES DATA ===',
      JSON.stringify(expenses, null, 2),
      '\n=== ALL TOURNAMENTS DATA ===',
      JSON.stringify(tournaments, null, 2),
      '\n=== CASH VAULT DATA ===',
      JSON.stringify(cashVault, null, 2),
    ];

    const context = contextParts.join('\n');
    console.log(`Generated context size: ${context.length} characters`);
    
    return context;
  } catch (error) {
    console.error('Error fetching business data:', error);
    return 'Error fetching business data. Please try again.';
  }
};
