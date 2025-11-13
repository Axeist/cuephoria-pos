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
    const { 
      station_id, // Can be single station ID, array, or comma-separated string
      booking_date, // Format: YYYY-MM-DD
      start_time, // Format: HH:MM (24-hour)
      end_time // Format: HH:MM (24-hour)
    } = payload;

    // Validate required fields
    if (!station_id || !booking_date || !start_time || !end_time) {
      return j(res, { 
        ok: false, 
        error: "Missing required fields",
        required: ["station_id", "booking_date", "start_time", "end_time"]
      }, 400);
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(booking_date)) {
      return j(res, { ok: false, error: "Invalid date format. Use YYYY-MM-DD" }, 400);
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return j(res, { ok: false, error: "Invalid time format. Use HH:MM (24-hour)" }, 400);
    }

    // Handle single station, array of stations, or comma-separated string
    let stationIds: string[];
    if (Array.isArray(station_id)) {
      stationIds = station_id;
    } else if (typeof station_id === 'string' && station_id.includes(',')) {
      stationIds = station_id.split(',').map(id => id.trim()).filter(id => id.length > 0);
    } else {
      stationIds = [station_id];
    }

    // Check for existing bookings that overlap with the requested time slot
    // We need to fetch all bookings for the date and check overlaps in code
    const { data: allBookings, error: bookingError } = await supabase
      .from("bookings")
      .select("id, station_id, start_time, end_time, status")
      .in("station_id", stationIds)
      .eq("booking_date", booking_date)
      .in("status", ["confirmed", "in-progress"]);

    // Check for time overlaps in code
    const conflictingBookings: any[] = [];
    if (allBookings && allBookings.length > 0) {
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const requestedStart = timeToMinutes(start_time);
      const requestedEnd = timeToMinutes(end_time);
      const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;

      allBookings.forEach(booking => {
        const existingStart = timeToMinutes(booking.start_time);
        const existingEnd = timeToMinutes(booking.end_time);
        const existingEndMinutes = existingEnd === 0 ? 24 * 60 : existingEnd;

        const overlaps = (
          (requestedStart >= existingStart && requestedStart < existingEndMinutes) ||
          (requestedEndMinutes > existingStart && requestedEndMinutes <= existingEndMinutes) ||
          (requestedStart <= existingStart && requestedEndMinutes >= existingEndMinutes) ||
          (existingStart <= requestedStart && existingEndMinutes >= requestedEndMinutes)
        );

        if (overlaps) {
          conflictingBookings.push(booking);
        }
      });
    }

    if (bookingError) {
      console.error("❌ Error checking bookings:", bookingError);
      return j(res, { ok: false, error: "Failed to check availability" }, 500);
    }

    // Check for active sessions (for today's bookings)
    // Only block if the session's start time overlaps with the requested time slot
    const today = new Date().toISOString().split('T')[0];
    let activeSessions: any[] = [];
    if (booking_date === today) {
      const { data: sessions, error: sessionError } = await supabase
        .from("sessions")
        .select("station_id, start_time")
        .in("station_id", stationIds)
        .is("end_time", null); // Active sessions only

      if (!sessionError && sessions) {
        // Filter sessions to only those that overlap with the requested time slot
        const timeToMinutes = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const requestedStart = timeToMinutes(start_time);
        const requestedEnd = timeToMinutes(end_time);
        const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;

        activeSessions = sessions.filter(session => {
          // Extract time from session start_time (which is a timestamp)
          const sessionStartTime = new Date(session.start_time);
          const sessionTimeStr = `${sessionStartTime.getHours().toString().padStart(2, '0')}:${sessionStartTime.getMinutes().toString().padStart(2, '0')}`;
          const sessionStart = timeToMinutes(sessionTimeStr);

          // Check if session start time falls within the requested time slot
          return sessionStart >= requestedStart && sessionStart < requestedEndMinutes;
        });
      }
    }

    // Get station details
    const { data: stationsData, error: stationsError } = await supabase
      .from("stations")
      .select("id, name, type, hourly_rate")
      .in("id", stationIds);

    if (stationsError || !stationsData) {
      return j(res, { ok: false, error: "Failed to fetch station details" }, 500);
    }

    // Build availability response
    const availability = stationsData.map(station => {
      const hasBookingConflict = conflictingBookings?.some(
        booking => booking.station_id === station.id
      ) || false;

      const hasActiveSession = activeSessions.some(
        session => session.station_id === station.id
      );

      const isAvailable = !hasBookingConflict && !hasActiveSession;

      return {
        station_id: station.id,
        station_name: station.name,
        station_type: station.type,
        hourly_rate: station.hourly_rate,
        is_available: isAvailable,
        conflict_reason: !isAvailable 
          ? (hasBookingConflict ? "Already booked for this time slot" : "Currently in use")
          : null
      };
    });

    return j(res, {
      ok: true,
      booking_date,
      time_slot: `${start_time} - ${end_time}`,
      availability,
      available_count: availability.filter(a => a.is_available).length,
      total_count: availability.length
    }, 200);

  } catch (error: any) {
    console.error("💥 Check availability error:", error);
    return j(res, {
      ok: false,
      error: error.message || "Failed to check availability"
    }, 500);
  }
}

