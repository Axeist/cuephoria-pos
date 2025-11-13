import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://apltkougkglbsfphbghi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbHRrb3Vna2dsYnNmcGhiZ2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTE3MDMsImV4cCI6MjA1OTE2NzcwM30.Kk38S9Hl9tIwv_a3VPgUaq1cSCCPmlGJOR5R98tREeU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'x-application-name': 'cuephoria-api'
    }
  }
});

// Vercel Node.js runtime types
type VercelRequest = {
  method?: string;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  end: () => void;
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = req.body || {};
    const { customer_phone } = payload;

    // Validate required fields
    if (!customer_phone) {
      return j(res, { 
        ok: false, 
        error: "Missing required field: customer_phone"
      }, 400);
    }

    // Normalize phone number (convert to string first in case it comes as a number)
    const phoneString = String(customer_phone || '');
    let normalizedPhone = phoneString.replace(/\D/g, '');
    
    // Handle Indian phone numbers: remove country code if present (91 or +91)
    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.substring(2);
    } else if (normalizedPhone.length === 13 && normalizedPhone.startsWith('9191')) {
      normalizedPhone = normalizedPhone.substring(2);
    }
    
    // Validate: Must be exactly 10 digits for Indian numbers
    if (normalizedPhone.length !== 10) {
      return j(res, { 
        ok: false, 
        error: "Invalid phone number. Indian mobile numbers must be exactly 10 digits",
        provided: phoneString
      }, 400);
    }
    
    // Validate: Indian mobile numbers start with 6, 7, 8, or 9
    const firstDigit = normalizedPhone[0];
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return j(res, { 
        ok: false, 
        error: "Invalid phone number. Indian mobile numbers must start with 6, 7, 8, or 9",
        provided: phoneString
      }, 400);
    }

    // Fetch customer by phone number
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, email, is_member, loyalty_points, total_spent, total_play_time, created_at")
      .eq("phone", normalizedPhone)
      .single();

    if (customerError) {
      if (customerError.code === "PGRST116") {
        // Customer not found
        return j(res, {
          ok: true,
          found: false,
          message: "Customer not found",
          customer: null
        }, 200);
      }
      console.error("❌ Error fetching customer:", customerError);
      return j(res, { ok: false, error: "Failed to fetch customer" }, 500);
    }

    if (!customer) {
      return j(res, {
        ok: true,
        found: false,
        message: "Customer not found",
        customer: null
      }, 200);
    }

    // Fetch recent bookings for this customer (last 10)
    const { data: recentBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id, 
        booking_date, 
        start_time, 
        end_time, 
        status, 
        station_id,
        stations (
          name,
          type
        )
      `)
      .eq("customer_id", customer.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(10);

    // Fetch total booking count
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id);

    return j(res, {
      ok: true,
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        is_member: customer.is_member,
        loyalty_points: customer.loyalty_points,
        total_spent: customer.total_spent,
        total_play_time: customer.total_play_time,
        created_at: customer.created_at,
        total_bookings: totalBookings || 0,
        recent_bookings: recentBookings?.map(booking => {
          const station = Array.isArray(booking.stations) ? booking.stations[0] : booking.stations;
          return {
            id: booking.id,
            date: booking.booking_date,
            time: `${booking.start_time} - ${booking.end_time}`,
            status: booking.status,
            station_name: station?.name || "Unknown",
            station_type: station?.type || "unknown"
          };
        }) || []
      }
    }, 200);

  } catch (error: any) {
    console.error("💥 Get customer error:", error);
    return j(res, {
      ok: false,
      error: error.message || "Failed to fetch customer"
    }, 500);
  }
}

