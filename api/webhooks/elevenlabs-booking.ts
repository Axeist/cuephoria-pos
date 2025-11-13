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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
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
    // In Vercel Node.js runtime, body is already parsed and available as req.body
    const payload = req.body || {};
    console.log("🤖 ElevenLabs webhook payload:", payload);

    // Extract booking data from ElevenLabs format
    const { 
      customer_name,
      customer_phone,
      customer_email,
      station_id, // Can be single station ID or array
      booking_date, // Format: YYYY-MM-DD
      start_time, // Format: HH:MM (24-hour)
      end_time, // Format: HH:MM (24-hour)
      duration, // Optional: in minutes (default 60)
      notes // Optional
    } = payload;

    // Validate required fields
    if (!customer_name || !customer_phone || !station_id || !booking_date || !start_time || !end_time) {
      return j(res, { 
        ok: false, 
        error: "Missing required fields",
        required: ["customer_name", "customer_phone", "station_id", "booking_date", "start_time", "end_time"]
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
        provided: phoneString,
        normalized: normalizedPhone
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

    // Handle single station, array of stations, or comma-separated string
    let stationInputs: string[];
    if (Array.isArray(station_id)) {
      stationInputs = station_id;
    } else if (typeof station_id === 'string' && station_id.includes(',')) {
      // Handle comma-separated station IDs
      stationInputs = station_id.split(',').map(id => id.trim()).filter(id => id.length > 0);
    } else {
      stationInputs = [station_id];
    }

    // Separate UUIDs from potential station names
    const validUUIDs = stationInputs.filter(id => isValidUUID(String(id)));
    const potentialNames = stationInputs.filter(id => !isValidUUID(String(id)));

    let stationIds: string[] = [...validUUIDs];

    // If we have station names, fetch all stations and match by name
    if (potentialNames.length > 0) {
      console.log("🔍 Looking up station names:", potentialNames);
      
      const { data: allStations, error: stationsError } = await supabase
        .from("stations")
        .select("id, name");

      if (stationsError) {
        console.error("❌ Error fetching stations:", stationsError);
        return j(res, {
          ok: false,
          error: "Failed to fetch stations for name lookup",
          details: stationsError.message
        }, 500);
      }

      // Match station names (case-insensitive, flexible matching)
      const matchedStations: string[] = [];
      const unmatchedNames: string[] = [];

      potentialNames.forEach(inputName => {
        // Try exact match first (case-insensitive)
        let matched = allStations?.find(s => 
          s.name.toLowerCase() === inputName.toLowerCase()
        );

        // If no exact match, try partial match
        if (!matched) {
          matched = allStations?.find(s => 
            s.name.toLowerCase().includes(inputName.toLowerCase()) ||
            inputName.toLowerCase().includes(s.name.toLowerCase())
          );
        }

        if (matched) {
          matchedStations.push(matched.id);
          console.log(`✅ Matched "${inputName}" to station "${matched.name}" (${matched.id})`);
        } else {
          unmatchedNames.push(inputName);
          console.error(`❌ Could not find station matching "${inputName}"`);
        }
      });

      if (unmatchedNames.length > 0) {
        return j(res, {
          ok: false,
          error: "Could not find stations matching the provided names",
          unmatched_station_names: unmatchedNames,
          available_stations: allStations?.map(s => ({ id: s.id, name: s.name })) || [],
          help: "Use exact station names or valid UUIDs. Call 'get_available_stations' to see all available stations."
        }, 400);
      }

      stationIds = [...stationIds, ...matchedStations];
    }

    if (stationIds.length === 0) {
      return j(res, {
        ok: false,
        error: "No valid station IDs or names provided"
      }, 400);
    }

    // Remove duplicates
    stationIds = [...new Set(stationIds)];
    console.log("✅ Final station IDs for booking:", stationIds);
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(booking_date)) {
      return j(res, { ok: false, error: "Invalid date format. Use YYYY-MM-DD" }, 400);
    }

    // Validate that booking date is not in the past
    const bookingDateObj = new Date(booking_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (bookingDateObj < today) {
      const todayStr = today.toISOString().split('T')[0];
      console.warn("⚠️ Attempted to book for past date:", booking_date, "Today is:", todayStr);
      return j(res, { 
        ok: false, 
        error: "Cannot create bookings for past dates",
        booking_date: booking_date,
        today: todayStr,
        help: "Please provide a current or future date for the booking"
      }, 400);
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return j(res, { ok: false, error: "Invalid time format. Use HH:MM (24-hour)" }, 400);
    }

    // Calculate duration if not provided
    const bookingDuration = duration || 60;

    // Create or find customer
    let customerId;
    const { data: existingCustomer, error: searchError } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", normalizedPhone)
      .single();
    
    if (searchError && searchError.code !== "PGRST116") {
      console.error("❌ Customer search error:", searchError);
      return j(res, { ok: false, error: "Customer search failed" }, 500);
    }

    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log("✅ Found existing customer:", customerId);
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customer_name,
          phone: normalizedPhone,
          email: customer_email || null,
          is_member: false,
          loyalty_points: 0,
          total_spent: 0,
          total_play_time: 0,
        })
        .select("id")
        .single();
      
      if (customerError) {
        console.error("❌ Customer creation failed:", customerError);
        return j(res, { ok: false, error: "Failed to create customer" }, 500);
      }
      customerId = newCustomer.id;
      console.log("✅ New customer created:", customerId);
    }

    // Fetch station details to calculate price
    const { data: stationsData, error: stationsError } = await supabase
      .from("stations")
      .select("id, name, hourly_rate")
      .in("id", stationIds);

    if (stationsError || !stationsData || stationsData.length === 0) {
      return j(res, { ok: false, error: "Invalid station ID(s)" }, 400);
    }

    // Check for existing bookings that overlap with the requested time slot
    const { data: conflictingBookings, error: conflictError } = await supabase
      .from("bookings")
      .select("id, station_id, start_time, end_time, status")
      .in("station_id", stationIds)
      .eq("booking_date", booking_date)
      .in("status", ["confirmed", "in-progress"]);

    if (conflictError) {
      console.error("❌ Error checking for conflicts:", conflictError);
      return j(res, { ok: false, error: "Failed to check booking availability" }, 500);
    }

    // Check for time overlaps
    const unavailableStations: string[] = [];
    if (conflictingBookings && conflictingBookings.length > 0) {
      conflictingBookings.forEach(booking => {
        // Convert time strings to minutes for comparison
        const timeToMinutes = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const requestedStart = timeToMinutes(start_time);
        const requestedEnd = timeToMinutes(end_time);
        const existingStart = timeToMinutes(booking.start_time);
        const existingEnd = timeToMinutes(booking.end_time);

        // Handle midnight crossover (end_time = 00:00 means 24:00)
        const existingEndMinutes = existingEnd === 0 ? 24 * 60 : existingEnd;
        const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;

        const overlaps = (
          // Case 1: Requested slot starts during existing booking
          (requestedStart >= existingStart && requestedStart < existingEndMinutes) ||
          // Case 2: Requested slot ends during existing booking
          (requestedEndMinutes > existingStart && requestedEndMinutes <= existingEndMinutes) ||
          // Case 3: Requested slot completely contains existing booking
          (requestedStart <= existingStart && requestedEndMinutes >= existingEndMinutes) ||
          // Case 4: Existing booking completely contains requested slot
          (existingStart <= requestedStart && existingEndMinutes >= requestedEndMinutes)
        );

        if (overlaps && !unavailableStations.includes(booking.station_id)) {
          unavailableStations.push(booking.station_id);
        }
      });
    }

    // Check for active sessions (for today's bookings)
    // Only block if the session's start time overlaps with the requested time slot
    const today = new Date().toISOString().split('T')[0];
    if (booking_date === today) {
      const { data: activeSessions, error: sessionError } = await supabase
        .from("sessions")
        .select("station_id, start_time")
        .in("station_id", stationIds)
        .is("end_time", null); // Active sessions only

      if (!sessionError && activeSessions) {
        // Filter sessions to only those that overlap with the requested time slot
        const timeToMinutes = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const requestedStart = timeToMinutes(start_time);
        const requestedEnd = timeToMinutes(end_time);
        const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;

        activeSessions.forEach(session => {
          // Extract time from session start_time (which is a timestamp)
          const sessionStartTime = new Date(session.start_time);
          const sessionTimeStr = `${sessionStartTime.getHours().toString().padStart(2, '0')}:${sessionStartTime.getMinutes().toString().padStart(2, '0')}`;
          const sessionStart = timeToMinutes(sessionTimeStr);

          // Only block if session start time falls within the requested time slot
          const overlaps = sessionStart >= requestedStart && sessionStart < requestedEndMinutes;
          
          if (overlaps && !unavailableStations.includes(session.station_id)) {
            unavailableStations.push(session.station_id);
          }
        });
      }
    }

    // Filter out unavailable stations
    const availableStationIds = stationIds.filter(id => !unavailableStations.includes(id));
    
    if (availableStationIds.length === 0) {
      const unavailableNames = stationsData
        .filter(s => unavailableStations.includes(s.id))
        .map(s => s.name)
        .join(", ");
      return j(res, { 
        ok: false, 
        error: "Selected stations are not available for the requested time slot",
        unavailable_stations: unavailableNames,
        requested_time: `${start_time} - ${end_time}`
      }, 400);
    }

    // If some stations are unavailable, use only available ones
    if (availableStationIds.length < stationIds.length) {
      const unavailableNames = stationsData
        .filter(s => unavailableStations.includes(s.id))
        .map(s => s.name)
        .join(", ");
      console.log(`⚠️ Some stations unavailable: ${unavailableNames}. Using available stations only.`);
      // Continue with available stations only
    }

    // Use only available stations
    const finalStationIds = availableStationIds;
    const finalStationsData = stationsData.filter(s => finalStationIds.includes(s.id));

    // Calculate price (hourly_rate * hours) - use first available station's rate
    const hours = bookingDuration / 60;
    const basePrice = finalStationsData[0]?.hourly_rate * hours || 0;

    // Create booking records (only for available stations)
    const rows = finalStationIds.map((stationId: string) => ({
      station_id: stationId,
      customer_id: customerId,
      booking_date: booking_date,
      start_time: start_time,
      end_time: end_time,
      duration: bookingDuration,
      status: "confirmed",
      original_price: basePrice,
      final_price: basePrice,
      discount_percentage: null,
      coupon_code: null,
      payment_mode: "venue", // AI bookings default to venue payment
      payment_txn_id: null,
      notes: notes || null,
    }));

    console.log("💾 Inserting booking records:", rows.length, "records");
    console.log("📋 Booking details:", {
      customer_id: customerId,
      booking_date,
      start_time,
      end_time,
      stations: finalStationIds,
      price: basePrice
    });

    const { data: inserted, error: bookingError } = await supabase
      .from("bookings")
      .insert(rows)
      .select("id, booking_date, start_time, end_time");

    if (bookingError) {
      console.error("❌ Booking creation failed:", bookingError);
      console.error("❌ Failed booking data:", rows);
      return j(res, { 
        ok: false, 
        error: "Failed to create booking", 
        details: bookingError.message,
        booking_data: rows
      }, 500);
    }

    if (!inserted || inserted.length === 0) {
      console.error("❌ No bookings were inserted despite no error");
      return j(res, {
        ok: false,
        error: "Booking creation returned no records",
        details: "The booking may not have been created"
      }, 500);
    }

    console.log("✅ Booking created successfully:", inserted.length, "records");
    console.log("✅ Created booking IDs:", inserted.map(b => b.id));

    // Return success response
    return j(res, { 
      ok: true, 
      bookingId: inserted[0].id,
      bookingIds: inserted.map(b => b.id),
      message: "Booking created successfully",
      booking: {
        customer_name,
        stations: finalStationsData.map(s => s.name),
        date: booking_date,
        time: `${start_time} - ${end_time}`,
        duration: `${bookingDuration} minutes`,
        price: `₹${basePrice}`,
        booking_ids: inserted.map(b => b.id)
      },
      unavailable_stations: unavailableStations.length > 0 
        ? stationsData.filter(s => unavailableStations.includes(s.id)).map(s => s.name)
        : []
    }, 200);

  } catch (error: any) {
    console.error("💥 ElevenLabs webhook error:", error);
    return j(res, { 
      ok: false, 
      error: "Unexpected error occurred",
      details: error.message
    }, 500);
  }
}

