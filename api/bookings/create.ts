import { supabase } from "@/integrations/supabase/server";

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Phone number normalization
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Generate unique Customer ID
const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    console.log("📝 Received booking payload:", payload);

    const { 
      customerInfo, 
      selectedStations, 
      selectedDate, 
      selectedSlot, 
      originalPrice, 
      discount, 
      finalPrice, 
      appliedCoupons,
      orderId,
      payment_mode = "venue"
    } = payload;

    // Validate required fields
    if (!customerInfo || !selectedStations || !selectedDate || !selectedSlot) {
      console.error("❌ Missing required booking data:", {
        hasCustomerInfo: !!customerInfo,
        hasSelectedStations: !!selectedStations,
        hasSelectedDate: !!selectedDate,
        hasSelectedSlot: !!selectedSlot
      });
      return j({ ok: false, error: "Missing required booking data" }, 400);
    }

    // Create customer if new
    let customerId = customerInfo.id;
    if (!customerId) {
      // Normalize phone number before searching
      const normalizedPhone = normalizePhoneNumber(customerInfo.phone);
      console.log("🔍 Searching for existing customer with phone:", normalizedPhone);
      
      const { data: existingCustomer, error: searchError } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", normalizedPhone)
        .maybeSingle();
      
      if (searchError && searchError.code !== "PGRST116") {
        console.error("❌ Customer search error:", searchError);
        return j({ ok: false, error: "Customer search failed" }, 500);
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log("✅ Found existing customer:", customerId);
      } else {
        console.log("👤 Creating new customer");
        const customerID = generateCustomerID(normalizedPhone);
        
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: customerInfo.name.trim(),
            phone: normalizedPhone,
            email: customerInfo.email?.trim() || null,
            custom_id: customerID,
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
        console.log("✅ New customer created:", customerId, "with custom_id:", customerID);
      }
    }

    // STEP 1: Check for existing bookings and slot blocks
    console.log("🔒 Checking for slot availability and blocks...");
    const normalizedPhone = normalizePhoneNumber(customerInfo.phone);
    const sessionId = payload.sessionId || `session_${Date.now()}_${normalizedPhone.slice(-4)}`;
    
    // Check for existing bookings that would conflict
    const { data: existingBookings, error: checkError } = await supabase
      .from("bookings")
      .select("id, station_id, start_time, end_time")
      .in("station_id", selectedStations)
      .eq("booking_date", selectedDate)
      .in("status", ["confirmed", "in-progress"])
      .or(`start_time.lte.${selectedSlot.start_time},end_time.gt.${selectedSlot.start_time}`)
      .or(`start_time.lt.${selectedSlot.end_time},end_time.gte.${selectedSlot.end_time}`);

    if (checkError) {
      console.error("❌ Error checking existing bookings:", checkError);
      return j({ ok: false, error: "Failed to check availability" }, 500);
    }

    // Check for conflicting bookings
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const requestedStart = timeToMinutes(selectedSlot.start_time);
    const requestedEnd = timeToMinutes(selectedSlot.end_time);
    const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;

    const conflictingBookings = existingBookings?.filter(booking => {
      const existingStart = timeToMinutes(booking.start_time);
      const existingEnd = timeToMinutes(booking.end_time);
      const existingEndMinutes = existingEnd === 0 ? 24 * 60 : existingEnd;

      return (
        (requestedStart >= existingStart && requestedStart < existingEndMinutes) ||
        (requestedEndMinutes > existingStart && requestedEndMinutes <= existingEndMinutes) ||
        (requestedStart <= existingStart && requestedEndMinutes >= existingEndMinutes) ||
        (existingStart <= requestedStart && existingEndMinutes >= requestedEndMinutes)
      );
    }) || [];

    if (conflictingBookings.length > 0) {
      console.error("❌ Slot already booked:", conflictingBookings);
      return j({ 
        ok: false, 
        error: "Selected slot is no longer available. Please select another time slot.",
        conflict: true
      }, 409);
    }

    // STEP 2: Check for active slot blocks (excluding our own session)
    const { data: activeBlocks, error: blockCheckError } = await supabase
      .from("slot_blocks")
      .select("id, station_id, session_id")
      .in("station_id", selectedStations)
      .eq("booking_date", selectedDate)
      .eq("start_time", selectedSlot.start_time)
      .eq("end_time", selectedSlot.end_time)
      .gt("expires_at", new Date().toISOString())
      .eq("is_confirmed", false)
      .neq("session_id", sessionId);

    if (blockCheckError) {
      console.error("❌ Error checking slot blocks:", blockCheckError);
      return j({ ok: false, error: "Failed to check slot availability" }, 500);
    }

    if (activeBlocks && activeBlocks.length > 0) {
      console.error("❌ Slot is currently blocked by another user:", activeBlocks);
      return j({ 
        ok: false, 
        error: "This slot is currently being booked by another customer. Please try again in a moment or select another slot.",
        conflict: true,
        blocked: true
      }, 409);
    }

    // STEP 3: Create slot blocks for all selected stations
    console.log("🔒 Creating slot blocks for stations...");
    const blockDurationMinutes = 5; // 5 minutes block duration
    const expiresAt = new Date(Date.now() + blockDurationMinutes * 60 * 1000).toISOString();

    const blockRows = selectedStations.map((stationId: string) => ({
      station_id: stationId,
      booking_date: selectedDate,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      expires_at: expiresAt,
      session_id: sessionId,
      customer_phone: normalizedPhone,
      is_confirmed: false,
    }));

    const { error: blockError } = await supabase
      .from("slot_blocks")
      .upsert(blockRows, {
        onConflict: "station_id,booking_date,start_time,end_time",
        ignoreDuplicates: false
      });

    if (blockError) {
      console.error("❌ Failed to create slot blocks:", blockError);
      // If block creation fails, it might be due to race condition - check again
      const { data: newActiveBlocks } = await supabase
        .from("slot_blocks")
        .select("id")
        .in("station_id", selectedStations)
        .eq("booking_date", selectedDate)
        .eq("start_time", selectedSlot.start_time)
        .eq("end_time", selectedSlot.end_time)
        .gt("expires_at", new Date().toISOString())
        .eq("is_confirmed", false)
        .neq("session_id", sessionId);

      if (newActiveBlocks && newActiveBlocks.length > 0) {
        return j({ 
          ok: false, 
          error: "This slot was just booked by another customer. Please select another time slot.",
          conflict: true,
          blocked: true
        }, 409);
      }
      // If no blocks found, continue anyway (edge case)
    }

    // STEP 4: Create booking records
    const couponCodes = appliedCoupons ? Object.values(appliedCoupons).join(",") : "";
    
    const rows = selectedStations.map((stationId: string) => ({
      station_id: stationId,
      customer_id: customerId,
      booking_date: selectedDate,
      start_time: selectedSlot.start_time, // Fixed field name
      end_time: selectedSlot.end_time, // Fixed field name
      duration: 60,
      status: "confirmed",
      original_price: originalPrice || 0,
      discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
      final_price: finalPrice || 0,
      coupon_code: couponCodes || null,
      payment_mode: payment_mode || null, // 'venue', 'razorpay', etc.
      payment_txn_id: orderId || null, // Payment transaction/order ID
    }));

    console.log("💾 Inserting booking records:", rows.length, "records");

    const { data: inserted, error: bookingError } = await supabase
      .from("bookings")
      .insert(rows)
      .select("id");

    if (bookingError) {
      console.error("❌ Booking creation failed:", bookingError);
      
      // Release slot blocks if booking fails
      await supabase
        .from("slot_blocks")
        .delete()
        .in("station_id", selectedStations)
        .eq("booking_date", selectedDate)
        .eq("start_time", selectedSlot.start_time)
        .eq("end_time", selectedSlot.end_time)
        .eq("session_id", sessionId);
      
      return j({ ok: false, error: "Failed to create booking", details: bookingError.message }, 500);
    }

    // STEP 5: Confirm slot blocks (mark as confirmed)
    console.log("✅ Confirming slot blocks...");
    await supabase
      .from("slot_blocks")
      .update({ is_confirmed: true })
      .in("station_id", selectedStations)
      .eq("booking_date", selectedDate)
      .eq("start_time", selectedSlot.start_time)
      .eq("end_time", selectedSlot.end_time)
      .eq("session_id", sessionId);

    console.log("✅ Booking created successfully:", inserted.length, "records");

    return j({ 
      ok: true, 
      bookingId: inserted[0].id,
      message: "Booking created successfully" 
    });

  } catch (error: any) {
    console.error("💥 Unexpected booking creation error:", error);
    return j({ 
      ok: false, 
      error: "Unexpected error occurred",
      details: error.message
    }, 500);
  }
}
