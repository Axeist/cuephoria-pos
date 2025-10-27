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
    console.log('Fetching business data for AI...');
    
    // Fetch all data in parallel
    const [
      { data: customers, error: customersError },
      { data: products, error: productsError },
      { data: stations, error: stationsError },
      { data: sessions, error: sessionsError },
      { data: bills, error: billsError },
      { data: tournaments, error: tournamentsError },
      { data: expenses, error: expensesError },
      { data: bookings, error: bookingsError },
      { data: staff, error: staffError },
      { data: cashVault, error: cashVaultError },
    ] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('stations').select('*').order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').order('start_time', { ascending: false }).limit(200),
      supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('bookings').select('*').order('booking_date', { ascending: false }).limit(100),
      supabase.from('staff_profiles').select('*').limit(50),
      supabase.from('cash_vault_transactions').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    // Log errors but continue
    if (customersError) console.error('Error fetching customers:', customersError);
    if (productsError) console.error('Error fetching products:', productsError);
    if (stationsError) console.error('Error fetching stations:', stationsError);
    if (sessionsError) console.error('Error fetching sessions:', sessionsError);
    if (billsError) console.error('Error fetching bills:', billsError);
    if (tournamentsError) console.error('Error fetching tournaments:', tournamentsError);
    if (expensesError) console.error('Error fetching expenses:', expensesError);
    if (bookingsError) console.error('Error fetching bookings:', bookingsError);
    if (staffError) console.error('Error fetching staff:', staffError);
    if (cashVaultError) console.error('Error fetching cash vault:', cashVaultError);

    // Calculate key statistics
    const stats = {
      totalCustomers: customers?.length || 0,
      totalProducts: products?.length || 0,
      totalStations: stations?.length || 0,
      activeSessions: sessions?.filter(s => !s.end_time).length || 0,
      totalRevenue: bills?.reduce((sum, bill) => sum + (bill.total || 0), 0) || 0,
      totalBills: bills?.length || 0,
      totalTournaments: tournaments?.length || 0,
      totalExpenses: expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0,
      totalBookings: bookings?.length || 0,
      upcomingBookings: bookings?.filter(b => new Date(b.booking_date) >= new Date()).length || 0,
    };

    // Build a compact context string
    const contextParts = [
      '=== CUEPHORIA BUSINESS DATA SNAPSHOT ===',
      `\nSTATISTICS:\n${JSON.stringify(stats, null, 2)}`,
      `\n\nCUSTOMERS (${customers?.length || 0}):\n${createSummary(customers || [], 'customers')}`,
      `\n\nPRODUCTS (${products?.length || 0}):\n${createSummary(products || [], 'products')}`,
      `\n\nSTATIONS (${stations?.length || 0}):\n${createSummary(stations || [], 'stations')}`,
      `\n\nRECENT SESSIONS (${sessions?.length || 0}):\n${createSummary(sessions || [], 'sessions')}`,
      `\n\nRECENT BILLS (${bills?.length || 0}):\n${createSummary(bills || [], 'bills')}`,
      `\n\nTOURNAMENTS (${tournaments?.length || 0}):\n${createSummary(tournaments || [], 'tournaments')}`,
      `\n\nEXPENSES (${expenses?.length || 0}):\n${createSummary(expenses || [], 'expenses')}`,
      `\n\nBOOKINGS (${bookings?.length || 0}):\n${createSummary(bookings || [], 'bookings')}`,
      `\n\nSTAFF (${staff?.length || 0}):\n${createSummary(staff || [], 'staff')}`,
      `\n\nCASH VAULT (${cashVault?.length || 0}):\n${createSummary(cashVault || [], 'cash_vault')}`,
    ];

    const context = contextParts.join('\n');
    console.log(`Generated context size: ${context.length} characters`);
    
    return context;
  } catch (error) {
    console.error('Error fetching business data:', error);
    return 'Error fetching business data. Please try again.';
  }
};
