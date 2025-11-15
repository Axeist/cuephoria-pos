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

    // Create booking records
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
      return j({ ok: false, error: "Failed to create booking", details: bookingError.message }, 500);
    }

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
