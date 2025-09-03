import { supabase } from "@/integrations/supabase/client";

export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json();
    const { 
      customerInfo, 
      selectedStations, 
      selectedDate, 
      selectedSlot, 
      originalPrice, 
      discount, 
      finalPrice, 
      appliedCoupons,
      orderId
    } = payload;

    console.log("Creating booking for order:", orderId);

    // Create customer if new
    let customerId = customerInfo.id;
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email || null,
          is_member: false,
          loyalty_points: 0,
          total_spent: 0,
          total_play_time: 0,
        })
        .select("id")
        .single();
      
      if (customerError) {
        console.error("Customer creation error:", customerError);
        throw customerError;
      }
      customerId = newCustomer.id;
    }

    // Create booking records
    const couponCodes = Object.values(appliedCoupons).join(",");
    const rows = selectedStations.map((stationId: string) => ({
      station_id: stationId,
      customer_id: customerId,
      booking_date: selectedDate,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      duration: 60,
      status: "confirmed",
      original_price: originalPrice,
      discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
      final_price: finalPrice,
      coupon_code: couponCodes || null,
    }));

    const { data: inserted, error: bookingError } = await supabase
      .from("bookings")
      .insert(rows)
      .select("id");

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      throw bookingError;
    }

    console.log("Booking created successfully:", inserted);

    return j({ 
      ok: true, 
      bookingId: inserted[0].id,
      message: "Booking created successfully" 
    });

  } catch (error: any) {
    console.error("Booking creation error:", error);
    return j({ 
      ok: false, 
      error: error.message || "Failed to create booking" 
    }, 500);
  }
}
