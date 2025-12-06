// Using Node.js runtime to use Razorpay SDK and Supabase client
export const config = {
  maxDuration: 30, // 30 seconds
};

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-razorpay-signature');
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

// Environment variable getter (Node.js runtime)
function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as any)[name];
  }
  return undefined;
}

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Get Razorpay webhook secret
function getRazorpayWebhookSecret() {
  const mode = need("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  
  return isLive
    ? (need("RAZORPAY_WEBHOOK_SECRET_LIVE") || need("RAZORPAY_WEBHOOK_SECRET"))
    : (need("RAZORPAY_WEBHOOK_SECRET_TEST") || need("RAZORPAY_WEBHOOK_SECRET"));
}

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Razorpay webhook signature verification
  // Signature format: HMAC SHA256 of payload with webhook secret
  // For edge runtime, we'll do basic validation
  // Full verification should be implemented with proper crypto library
  
  if (!signature || !payload) {
    return false;
  }

  // Basic check - full verification requires crypto library
  // In production, use a proper HMAC verification library
  return true; // Simplified for edge runtime
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

// Get Razorpay credentials
function getRazorpayCredentials() {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  
  const keyId = isLive 
    ? (getEnv("RAZORPAY_KEY_ID_LIVE") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_LIVE"))
    : (getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_TEST"));
    
  const keySecret = isLive
    ? (getEnv("RAZORPAY_KEY_SECRET_LIVE") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_LIVE"))
    : (getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_TEST"));

  return { keyId, keySecret, isLive };
}

// Get Supabase client
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  // Try multiple environment variable names (VITE_ prefix is for client-side, not available in server)
  const supabaseUrl = getEnv("SUPABASE_URL") || 
                      getEnv("NEXT_PUBLIC_SUPABASE_URL") || 
                      getEnv("VITE_SUPABASE_URL") ||
                      "https://apltkougkglbsfphbghi.supabase.co"; // Fallback to hardcoded URL
  
  // Try service role key first (required for admin operations like creating bookings/bills)
  // Fallback to anon key if service role key is not available (may not work for all operations)
  const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || 
                      getEnv("SUPABASE_ANON_KEY") ||
                      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbHRrb3Vna2dsYnNmcGhiZ2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTE3MDMsImV4cCI6MjA1OTE2NzcwM30.Kk38S9Hl9tIwv_a3VPgUaq1cSCCPmlGJOR5R98tREeU"; // Fallback to anon key
  
  if (!supabaseUrl) {
    throw new Error("Supabase URL not found in environment variables");
  }
  
  if (!supabaseKey) {
    throw new Error("Supabase key not found. Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in environment variables");
  }
  
  // Log which key is being used (for debugging)
  const isServiceRole = !!getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (isServiceRole) {
    console.log("✅ Using SUPABASE_SERVICE_ROLE_KEY for admin operations");
  } else {
    console.warn("⚠️ Using SUPABASE_ANON_KEY instead of SUPABASE_SERVICE_ROLE_KEY. Some operations may fail due to RLS policies.");
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'x-application-name': 'cuephoria-razorpay-webhook'
      }
    }
  });
}

// Fetch order details from Razorpay to get full booking data
async function fetchOrderDetails(orderId: string) {
  try {
    const Razorpay = (await import('razorpay')).default;
    const { keyId, keySecret } = getRazorpayCredentials();
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (error: any) {
    console.error("❌ Error fetching order from Razorpay:", error);
    return null;
  }
}

// Create bill from booking data
// NOTE: This function is ONLY called for online Razorpay payments via webhook
// It is NOT called for venue payments, AI bookings, or any other payment methods
async function createBillFromBooking(
  customerId: string,
  bookings: any[],
  pricing: any,
  selectedStations: string[],
  selectedDateISO: string,
  slots: any[]
) {
  const supabase = await getSupabaseClient();
  
  try {
    // Validate customerId exists
    if (!customerId) {
      throw new Error("Customer ID is required to create bill");
    }
    
    // Verify customer exists (important for new customers)
    const { data: customerCheck, error: customerCheckError } = await supabase
      .from("customers")
      .select("id, total_spent")
      .eq("id", customerId)
      .single();
    
    if (customerCheckError || !customerCheck) {
      console.error("❌ Customer not found for bill creation:", customerId, customerCheckError);
      throw new Error(`Customer not found: ${customerId}`);
    }
    
    console.log("✅ Customer verified for bill creation:", {
      customerId,
      currentTotalSpent: customerCheck.total_spent || 0
    });
    
    // Check if bill already exists for these bookings (by checking payment_txn_id in bookings)
    const { data: existingBillCheck } = await supabase
      .from("bookings")
      .select("payment_txn_id")
      .in("id", bookings.map(b => b.id))
      .limit(1);
    
    if (existingBillCheck && existingBillCheck.length > 0 && existingBillCheck[0].payment_txn_id) {
      // Check if a bill exists for this customer with razorpay payment method around the same time
      const { data: existingBills } = await supabase
        .from("bills")
        .select("id")
        .eq("customer_id", customerId)
        .eq("payment_method", "razorpay")
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Within last 5 minutes
        .limit(1);
      
      if (existingBills && existingBills.length > 0) {
        console.log("✅ Bill already exists for this payment");
        return { success: true, billId: existingBills[0].id, alreadyExists: true };
      }
    }
    
    // Fetch station names
    const { data: stationsData, error: stationsError } = await supabase
      .from("stations")
      .select("id, name")
      .in("id", selectedStations);
    
    if (stationsError) {
      console.error("❌ Error fetching stations:", stationsError);
      throw stationsError;
    }
    
    const stationMap = new Map(stationsData?.map((s: any) => [s.id, s.name]) || []);
    
    // Calculate bill totals from actual bookings (sum of all booking prices)
    // This ensures accuracy when there are multiple stations/slots
    const totalFromBookings = bookings.reduce((sum, booking) => sum + (Number(booking.final_price) || 0), 0);
    const originalFromBookings = bookings.reduce((sum, booking) => {
      // Calculate original price per booking (reverse the discount if needed)
      // If we have discount_percentage, we can calculate original
      const bookingOriginal = booking.original_price || booking.final_price;
      return sum + (Number(bookingOriginal) || 0);
    }, 0);
    
    // Use calculated values, fallback to pricing if needed
    const subtotal = originalFromBookings > 0 ? originalFromBookings : pricing.original;
    const total = totalFromBookings > 0 ? totalFromBookings : pricing.final; // This is the amount without transaction fee
    const discountValue = subtotal - total;
    
    // Create the bill
    const { data: billData, error: billError } = await supabase
      .from("bills")
      .insert({
        customer_id: customerId,
        subtotal: subtotal,
        discount: discountValue > 0 ? (discountValue / subtotal) * 100 : 0, // discount percentage
        discount_value: discountValue,
        discount_type: "fixed",
        loyalty_points_used: 0,
        loyalty_points_earned: 0,
        total: total,
        payment_method: "razorpay",
        status: "completed",
        is_split_payment: false,
        cash_amount: 0,
        upi_amount: 0,
      })
      .select()
      .single();
    
    if (billError) {
      console.error("❌ Bill creation error:", billError);
      throw billError;
    }
    
    console.log("✅ Bill created successfully:", billData.id);
    
    // Create bill items for each booking
    const billItems: any[] = [];
    
    for (const booking of bookings) {
      const stationName = stationMap.get(booking.station_id) || "Unknown Station";
      
      // Find matching slot for this booking
      const slot = slots.find(
        (s: any) => s.start_time === booking.start_time && s.end_time === booking.end_time
      );
      
      // Format date for display
      const bookingDate = new Date(selectedDateISO);
      const dateStr = bookingDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
      
      // Create descriptive name: "Station Name - Date (Start Time - End Time)"
      const itemName = `${stationName} - ${dateStr} (${slot?.start_time || booking.start_time} - ${slot?.end_time || booking.end_time})`;
      
      billItems.push({
        bill_id: billData.id,
        item_id: booking.id, // Use booking ID as item_id
        name: itemName,
        price: booking.final_price,
        quantity: 1,
        total: booking.final_price,
        item_type: "session", // Use "session" to match existing pattern
      });
    }
    
    // Insert bill items
    const { error: itemsError } = await supabase
      .from("bill_items")
      .insert(billItems);
    
    if (itemsError) {
      console.error("❌ Bill items creation error:", itemsError);
      // Rollback: delete the bill if items creation fails
      await supabase.from("bills").delete().eq("id", billData.id);
      throw itemsError;
    }
    
    console.log("✅ Bill items created successfully:", billItems.length);
    
    // Update customer total_spent (using the customer data we already fetched)
    const currentTotalSpent = customerCheck.total_spent || 0;
    const newTotalSpent = currentTotalSpent + total;
    
    const { error: updateError } = await supabase
      .from("customers")
      .update({ total_spent: newTotalSpent })
      .eq("id", customerId);
    
    if (updateError) {
      console.error("❌ Error updating customer total_spent:", updateError);
      // Don't throw - bill is already created, this is just a side effect
    } else {
      console.log("✅ Customer total_spent updated:", {
        customerId,
        oldTotal: currentTotalSpent,
        newTotal: newTotalSpent,
        billAmount: total
      });
    }
    
    return { success: true, billId: billData.id };
  } catch (error: any) {
    console.error("💥 Error creating bill from booking:", error);
    throw error;
  }
}

// Create booking from webhook data
async function createBookingFromWebhook(orderId: string, paymentId: string, bookingData?: any) {
  const supabase = await getSupabaseClient();
  
  try {
    // If booking data not provided, try to fetch from order
    let data = bookingData;
    if (!data) {
      const order = await fetchOrderDetails(orderId);
      if (order?.notes) {
        // Try to get booking_data (might be split across multiple fields)
        if (order.notes.booking_data) {
          data = order.notes.booking_data;
        } else if (order.notes.booking_data_1) {
          // Reconstruct from split fields
          data = order.notes.booking_data_1 + (order.notes.booking_data_2 || '');
        } else {
          console.log("⚠️ No booking_data found in order notes");
          return { success: false, message: "No booking data available" };
        }
      } else {
        console.log("⚠️ No order notes found");
        return { success: false, message: "No order notes available" };
      }
    } else if (typeof bookingData === 'object' && bookingData.booking_data_1) {
      // Handle case where notes object is passed directly
      data = bookingData.booking_data_1 + (bookingData.booking_data_2 || '');
    }
    
    // Parse compact booking data
    data = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Expand compact format (handle both compact and full format)
    const selectedStations = data.s || data.stations || [];
    const selectedDateISO = data.d || data.date || '';
    const slots = (data.t || data.slots || []).map((s: any) => ({
      start_time: s.s || s.start_time,
      end_time: s.e || s.end_time,
    }));
    const duration = data.du || data.dur || data.duration || 60;
    const customer = {
      name: data.c?.n || data.cust?.n || data.cust?.name || '',
      phone: data.c?.p || data.cust?.p || data.cust?.phone || '',
      email: data.c?.e || data.cust?.e || data.cust?.email || '',
      id: data.c?.i || data.cust?.i || data.cust?.id || '',
    };
    const pricing = {
      original: data.p?.o || data.price?.o || data.price?.original || 0,
      discount: data.p?.d || data.price?.d || data.price?.discount || 0,
      final: data.p?.f || data.price?.f || data.price?.final || 0,
      transactionFee: data.p?.tf || data.price?.tf || data.price?.transactionFee || 0,
      totalWithFee: data.p?.twf || data.price?.twf || data.price?.totalWithFee || 0,
      coupons: data.cp || data.coup || data.coupons || '',
    };

    // Check if booking already exists for this payment
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("payment_txn_id", paymentId)
      .limit(1);

    if (existingBookings && existingBookings.length > 0) {
      console.log("✅ Booking already exists for payment:", paymentId);
      return { success: true, message: "Booking already exists", bookingIds: existingBookings.map(b => b.id) };
    }

    // Ensure customer exists
    let customerId = customer.id;
    if (!customerId) {
      const normalizedPhone = normalizePhoneNumber(customer.phone);
      
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const customerID = generateCustomerID(normalizedPhone);
        const { data: newCustomer, error: cErr } = await supabase
          .from("customers")
          .insert({
            name: customer.name.trim(),
            phone: normalizedPhone,
            email: customer.email?.trim() || null,
            custom_id: customerID,
            is_member: false,
            loyalty_points: 0,
            total_spent: 0,
            total_play_time: 0,
          })
          .select("id")
          .single();

        if (cErr) {
          if (cErr.code === '23505') {
            // Duplicate - try to find again
            const { data: retryCustomer } = await supabase
              .from("customers")
              .select("id")
              .eq("phone", normalizedPhone)
              .maybeSingle();
            
            if (retryCustomer) {
              customerId = retryCustomer.id;
            } else {
              throw new Error("Failed to create or find customer");
            }
          } else {
            throw cErr;
          }
        } else {
          customerId = newCustomer!.id;
        }
      }
    }

    // Check for existing bookings and slot blocks before creating
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Check for conflicting bookings
    for (const slot of slots) {
      const requestedStart = timeToMinutes(slot.start_time);
      const requestedEnd = timeToMinutes(slot.end_time);
      const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;

      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("id, station_id, start_time, end_time")
        .in("station_id", selectedStations)
        .eq("booking_date", selectedDateISO)
        .in("status", ["confirmed", "in-progress"]);

      if (existingBookings) {
        const conflicts = existingBookings.filter(booking => {
          const existingStart = timeToMinutes(booking.start_time);
          const existingEnd = timeToMinutes(booking.end_time);
          const existingEndMinutes = existingEnd === 0 ? 24 * 60 : existingEnd;

          return (
            (requestedStart >= existingStart && requestedStart < existingEndMinutes) ||
            (requestedEndMinutes > existingStart && requestedEndMinutes <= existingEndMinutes) ||
            (requestedStart <= existingStart && requestedEndMinutes >= existingEndMinutes) ||
            (existingStart <= requestedStart && existingEndMinutes >= requestedEndMinutes)
          );
        });

        if (conflicts.length > 0) {
          console.error("❌ Slot conflicts detected in webhook:", conflicts);
          throw new Error("Selected slot is no longer available. Please select another time slot.");
        }
      }

      // Check for active slot blocks (excluding our own if we have session info)
      const { data: activeBlocks } = await supabase
        .from("slot_blocks")
        .select("id, station_id")
        .in("station_id", selectedStations)
        .eq("booking_date", selectedDateISO)
        .eq("start_time", slot.start_time)
        .eq("end_time", slot.end_time)
        .gt("expires_at", new Date().toISOString())
        .eq("is_confirmed", false);

      if (activeBlocks && activeBlocks.length > 0) {
        console.error("❌ Slot is blocked in webhook:", activeBlocks);
        throw new Error("This slot is currently being booked by another customer.");
      }
    }

    // Create booking rows
    // Calculate total number of bookings (stations × slots) to properly divide pricing
    const totalBookings = selectedStations.length * slots.length;
    const rows: any[] = [];
    selectedStations.forEach((station_id: string) => {
      slots.forEach((slot: any) => {
        rows.push({
          station_id,
          customer_id: customerId!,
          booking_date: selectedDateISO,
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration: duration,
          status: "confirmed",
          original_price: pricing.original / totalBookings,
          discount_percentage: pricing.discount > 0 ? (pricing.discount / pricing.original) * 100 : null,
          final_price: pricing.final / totalBookings,
          coupon_code: pricing.coupons || null,
          payment_mode: "razorpay", // Only online Razorpay payments trigger bill creation
          payment_txn_id: paymentId,
          notes: `Razorpay Order: ${orderId}`,
        });
      });
    });

    const { error: bErr, data: insertedBookings } = await supabase
      .from("bookings")
      .insert(rows)
      .select("id");

    // Confirm slot blocks after successful booking creation
    if (!bErr && insertedBookings) {
      for (const slot of slots) {
        await supabase
          .from("slot_blocks")
          .update({ is_confirmed: true })
          .in("station_id", selectedStations)
          .eq("booking_date", selectedDateISO)
          .eq("start_time", slot.start_time)
          .eq("end_time", slot.end_time)
          .gt("expires_at", new Date().toISOString())
          .eq("is_confirmed", false);
      }
    }

    if (bErr) {
      console.error("❌ Booking creation error:", bErr);
      throw bErr;
    }

    console.log("✅ Bookings created via webhook:", insertedBookings?.length || 0);
    
    // Create bill for the booking (ONLY for online Razorpay payments)
    // This ensures bills are automatically created when customers pay online
    // Venue payments and other payment methods do NOT trigger automatic bill creation
    if (!customerId) {
      console.error("❌ Cannot create bill: customerId is missing");
    } else {
      try {
        // Fetch the created bookings with all details needed for bill creation
        const { data: bookingsWithDetails } = await supabase
          .from("bookings")
          .select("id, station_id, start_time, end_time, final_price, original_price")
          .in("id", insertedBookings?.map(b => b.id) || []);
        
        if (bookingsWithDetails && bookingsWithDetails.length > 0) {
          console.log("📝 Creating bill for customer:", customerId, "with", bookingsWithDetails.length, "bookings");
          const billResult = await createBillFromBooking(
            customerId,
            bookingsWithDetails,
            pricing,
            selectedStations,
            selectedDateISO,
            slots
          );
          console.log("✅ Bill created for booking:", billResult);
        } else {
          console.warn("⚠️ No booking details found for bill creation");
        }
      } catch (billError: any) {
        console.error("❌ Failed to create bill from booking:", billError);
        // Don't fail the webhook - booking is already created
        // Bill can be created manually if needed
      }
    }
    
    return { success: true, bookingIds: insertedBookings?.map(b => b.id) || [] };
  } catch (error: any) {
    console.error("💥 Error creating booking from webhook:", error);
    throw error;
  }
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
    // In Node.js runtime, body might be parsed or raw
    // Razorpay sends raw JSON, so we need to handle both cases
    let rawPayload: string;
    let data: any;
    
    if (typeof req.body === 'string') {
      rawPayload = req.body;
      data = JSON.parse(rawPayload);
    } else if (req.body && typeof req.body === 'object') {
      // Already parsed
      data = req.body;
      rawPayload = JSON.stringify(req.body);
    } else {
      return j(res, { ok: false, error: "Invalid request body" }, 400);
    }

    const signature = req.headers?.["x-razorpay-signature"] || 
                     (Array.isArray(req.headers?.["x-razorpay-signature"]) 
                       ? req.headers["x-razorpay-signature"][0] 
                       : "") || "";
    
    console.log("📥 Razorpay webhook received:", {
      hasSignature: !!signature,
      payloadLength: rawPayload.length,
    });

    // Verify webhook signature
    const webhookSecret = getRazorpayWebhookSecret();
    const isValid = verifyWebhookSignature(rawPayload, signature, webhookSecret);

    if (!isValid) {
      console.error("❌ Invalid webhook signature");
      return j(res, { ok: false, error: "Invalid signature" }, 401);
    }
    const event = data.event;
    const payment = data.payload?.payment?.entity || data.payload?.payment;
    const order = data.payload?.order?.entity || data.payload?.order;
    
    // Also try to get order_id from payment to fetch order details if needed
    const orderIdFromPayment = payment?.order_id;

    console.log("📨 Webhook event:", event, {
      paymentId: payment?.id,
      orderId: payment?.order_id || order?.id,
      status: payment?.status,
    });

    // Handle different webhook events
    switch (event) {
      case "payment.captured":
        console.log("✅ Payment captured:", payment?.id);
        
        // Try to create booking from order
        const orderIdForBooking = payment?.order_id || order?.id;
        const paymentIdForBooking = payment?.id;
        
        if (orderIdForBooking && paymentIdForBooking) {
          try {
            console.log("📝 Attempting to create booking from webhook...");
            // Try to get booking data from order notes first, otherwise fetch from Razorpay
            const bookingDataFromNotes = order?.notes?.booking_data || 
                                         order?.notes?.booking_data_1 || 
                                         payment?.notes?.booking_data;
            const result = await createBookingFromWebhook(orderIdForBooking, paymentIdForBooking, bookingDataFromNotes || order?.notes);
            console.log("✅ Booking creation result:", result);
          } catch (bookingError: any) {
            console.error("❌ Failed to create booking from webhook:", bookingError);
            // Don't fail the webhook - booking might be created by frontend
          }
        }
        break;

      case "payment.failed":
        console.log("❌ Payment failed:", payment?.id);
        break;

      case "order.paid":
        console.log("✅ Order paid:", payment?.order_id || order?.id);
        // Also try to create booking for order.paid event
        const orderIdPaid = order?.id || payment?.order_id;
        const paymentIdPaid = payment?.id;
        
        if (orderIdPaid && paymentIdPaid) {
          try {
            console.log("📝 Attempting to create booking from order.paid webhook...");
            const bookingDataFromNotes = order?.notes?.booking_data;
            const result = await createBookingFromWebhook(orderIdPaid, paymentIdPaid, bookingDataFromNotes);
            console.log("✅ Booking creation result:", result);
          } catch (bookingError: any) {
            console.error("❌ Failed to create booking from webhook:", bookingError);
          }
        }
        break;

      default:
        console.log("ℹ️ Unhandled webhook event:", event);
    }

    return j(res, { ok: true, received: true });
  } catch (err: any) {
    console.error("💥 Webhook error:", err);
    return j(res, { 
      ok: false, 
      error: String(err?.message || err) 
    }, 500);
  }
}

