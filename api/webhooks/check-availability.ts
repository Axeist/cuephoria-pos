import { supabase } from "../../src/integrations/supabase/server";

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
    const payload = req.body || {};
    console.log("📥 Check availability request payload:", JSON.stringify(payload, null, 2));
    
    const { 
      station_id, // Can be single station ID, array, or comma-separated string
      booking_date, // Format: YYYY-MM-DD
      start_time, // Format: HH:MM (24-hour)
      end_time // Format: HH:MM (24-hour)
    } = payload;

    // Validate required fields
    if (!station_id || !booking_date || !start_time || !end_time) {
      console.error("❌ Missing required fields:", {
        has_station_id: !!station_id,
        has_booking_date: !!booking_date,
        has_start_time: !!start_time,
        has_end_time: !!end_time
      });
      return j(res, { 
        ok: false, 
        error: "Missing required fields",
        required: ["station_id", "booking_date", "start_time", "end_time"],
        received: {
          station_id: station_id || null,
          booking_date: booking_date || null,
          start_time: start_time || null,
          end_time: end_time || null
        }
      }, 400);
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(booking_date)) {
      console.error("❌ Invalid date format:", booking_date);
      return j(res, { 
        ok: false, 
        error: "Invalid date format. Use YYYY-MM-DD",
        received: booking_date,
        example: "2025-01-20"
      }, 400);
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      console.error("❌ Invalid time format:", { start_time, end_time });
      return j(res, { 
        ok: false, 
        error: "Invalid time format. Use HH:MM (24-hour)",
        received: { start_time, end_time },
        examples: { start_time: "14:00", end_time: "15:00" }
      }, 400);
    }

    // Handle single station, array of stations, or comma-separated string
    let stationInputs: string[];
    if (Array.isArray(station_id)) {
      stationInputs = station_id;
    } else if (typeof station_id === 'string' && station_id.includes(',')) {
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
    console.log("✅ Final station IDs to check:", stationIds);

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

    // Check for active slot blocks (temporary reservations)
    const { data: activeBlocks, error: blockError } = await supabase
      .from("slot_blocks")
      .select("id, station_id, expires_at, is_confirmed")
      .in("station_id", stationIds)
      .eq("booking_date", booking_date)
      .eq("start_time", start_time)
      .eq("end_time", end_time)
      .gt("expires_at", new Date().toISOString())
      .eq("is_confirmed", false);

    if (blockError) {
      console.error("❌ Error checking slot blocks:", blockError);
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

      const hasActiveBlock = activeBlocks?.some(
        block => block.station_id === station.id
      ) || false;

      const hasActiveSession = activeSessions.some(
        session => session.station_id === station.id
      );

      const isAvailable = !hasBookingConflict && !hasActiveBlock && !hasActiveSession;

      return {
        station_id: station.id,
        station_name: station.name,
        station_type: station.type,
        hourly_rate: station.hourly_rate,
        is_available: isAvailable,
        conflict_reason: !isAvailable 
          ? (hasBookingConflict 
              ? "Already booked for this time slot" 
              : hasActiveBlock 
                ? "Currently being booked by another customer" 
                : "Currently in use")
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

