import { supabase } from "@/integrations/supabase/client";

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization"
    },
  });
}

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return j({ ok: true }, 200);
  }

  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
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
      return j({ 
        ok: false, 
        error: "Missing required fields",
        required: ["customer_name", "customer_phone", "station_id", "booking_date", "start_time", "end_time"]
      }, 400);
    }

    // Normalize phone number
    const normalizedPhone = customer_phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      return j({ ok: false, error: "Invalid phone number" }, 400);
    }

    // Handle single station or array of stations
    const stationIds = Array.isArray(station_id) ? station_id : [station_id];
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(booking_date)) {
      return j({ ok: false, error: "Invalid date format. Use YYYY-MM-DD" }, 400);
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return j({ ok: false, error: "Invalid time format. Use HH:MM (24-hour)" }, 400);
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
      return j({ ok: false, error: "Customer search failed" }, 500);
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
        return j({ ok: false, error: "Failed to create customer" }, 500);
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
      return j({ ok: false, error: "Invalid station ID(s)" }, 400);
    }

    // Calculate price (hourly_rate * hours)
    const hours = bookingDuration / 60;
    const basePrice = stationsData[0].hourly_rate * hours; // Use first station's rate

    // Create booking records
    const rows = stationIds.map((stationId: string) => ({
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

    const { data: inserted, error: bookingError } = await supabase
      .from("bookings")
      .insert(rows)
      .select("id, booking_date, start_time, end_time");

    if (bookingError) {
      console.error("❌ Booking creation failed:", bookingError);
      return j({ 
        ok: false, 
        error: "Failed to create booking", 
        details: bookingError.message 
      }, 500);
    }

    console.log("✅ Booking created successfully:", inserted.length, "records");

    // Return success response
    return j({ 
      ok: true, 
      bookingId: inserted[0].id,
      bookingIds: inserted.map(b => b.id),
      message: "Booking created successfully",
      booking: {
        customer_name,
        stations: stationsData.map(s => s.name),
        date: booking_date,
        time: `${start_time} - ${end_time}`,
        duration: `${bookingDuration} minutes`,
        price: `₹${basePrice}`,
        booking_ids: inserted.map(b => b.id)
      }
    }, 200);

  } catch (error: any) {
    console.error("💥 ElevenLabs webhook error:", error);
    return j({ 
      ok: false, 
      error: "Unexpected error occurred",
      details: error.message
    }, 500);
  }
}

