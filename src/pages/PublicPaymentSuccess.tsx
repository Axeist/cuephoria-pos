import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";

type PendingBooking = {
  selectedStations: string[];
  stationPlayerCounts?: Record<string, number>;
  selectedDateISO: string;
  slots: Array<{ start_time: string; end_time: string }>;
  duration: number;
  customer: { id?: string; name: string; phone: string; email?: string };
  locationId?: string | null;
  pricing: { original: number; discount: number; final: number; transactionFee?: number; totalWithFee?: number; coupons: string };
};

// Phone number normalization (matches PublicBooking.tsx)
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Generate unique Customer ID (matches PublicBooking.tsx)
const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

function razorpayOrderTag(orderId: string): string {
  return `Razorpay Order: ${orderId}`;
}

function formatBookingTime(timeString: string): string {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function fetchPaidBookingsForCheckout(paymentId: string, orderId: string) {
  const { data: byPayment } = await supabase
    .from("bookings")
    .select("id, booking_date, start_time, end_time, final_price, station_id, customer_id")
    .eq("payment_txn_id", paymentId);

  if (byPayment && byPayment.length > 0) {
    return byPayment;
  }

  const { data: byOrder } = await supabase
    .from("bookings")
    .select("id, booking_date, start_time, end_time, final_price, station_id, customer_id")
    .eq("notes", razorpayOrderTag(orderId))
    .eq("payment_mode", "razorpay");

  return byOrder ?? [];
}

async function buildConfirmationAndRedirect(args: {
  bookings: Array<{
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    final_price?: number | null;
    station_id: string;
    customer_id: string;
  }>;
  paymentId: string;
  pb: PendingBooking | null;
  razorpayProfile: string;
  navigate: (path: string) => void;
}) {
  const { bookings, paymentId, pb, razorpayProfile, navigate } = args;
  const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const stationIds = [...new Set(bookings.map((b) => b.station_id))];
  const { data: stationsData } = await supabase
    .from("stations")
    .select("id, name")
    .in("id", stationIds);

  const stationNames =
    stationsData?.map((s) => s.name) ??
    pb?.selectedStations ??
    stationIds;

  let customerName = pb?.customer.name ?? "";
  if (!customerName && first.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("name")
      .eq("id", first.customer_id)
      .maybeSingle();
    customerName = customer?.name ?? "";
  }

  const totalAmount =
    pb?.pricing.final ??
    bookings.reduce((sum, b) => sum + (Number(b.final_price) || 0), 0);

  localStorage.setItem(
    "bookingConfirmation",
    JSON.stringify({
      bookingId: first.id.slice(0, 8).toUpperCase(),
      customerName,
      stationNames,
      date: first.booking_date,
      startTime: formatBookingTime(first.start_time),
      endTime: formatBookingTime(last.end_time),
      totalAmount,
      transactionFee: pb?.pricing.transactionFee,
      totalWithFee: pb?.pricing.totalWithFee || totalAmount,
      couponCode: pb?.pricing.coupons || undefined,
      discountAmount: pb?.pricing.discount && pb.pricing.discount > 0 ? pb.pricing.discount : undefined,
      sessionDuration: (pb?.duration ?? 60) === 15 ? "15 minutes" : "60 minutes",
      paymentMode: "razorpay",
      paymentTxnId: paymentId,
    })
  );
  localStorage.removeItem("pendingBooking");

  const bookingBase =
    razorpayProfile === "lite" ? "/lite/public/booking" : "/public/booking";
  navigate(`${bookingBase}?booking_success=true`);
}

export default function PublicPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get("payment_id") || "";
  const orderId = searchParams.get("order_id") || "";
  const signature = searchParams.get("signature") || "";
  const razorpayProfile = searchParams.get("profile") || "";
  const [status, setStatus] = useState<"checking" | "creating" | "done" | "failed">("checking");
  const [msg, setMsg] = useState("Verifying your payment…");

  // Warn user not to close/refresh the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === "checking" || status === "creating") {
        e.preventDefault();
        e.returnValue = "Your booking is being processed. Closing this page may prevent your booking from being created. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status]);

  useEffect(() => {
    const run = async () => {
      if (!paymentId || !orderId || !signature) {
        setStatus("failed");
        setMsg("Missing payment details. Please rebook.");
        return;
      }

      setStatus("creating");
      setMsg("Payment successful! Creating your booking…");

      // ──────────────────────────────────────────────────────────────────
      // Primary path: server-side idempotent materialize (webhook may have
      // already run). Never insert client-side if bookings already exist.
      // ──────────────────────────────────────────────────────────────────
      let materializeSucceeded = false;
      try {
        const matRes = await fetch("/api/bookings/materialize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
            ...(razorpayProfile === "lite" ? { profile: "lite" } : {}),
          }),
        });
        const matData = await matRes.json().catch(() => null);
        materializeSucceeded = Boolean(
          matRes.ok && matData?.ok && matData?.success !== false
        );
        if (materializeSucceeded) {
          console.log("✅ Server-side booking materialized:", matData);
        } else {
          console.warn("⚠️ Server-side materialize did not succeed:", matData);
        }
      } catch (err) {
        console.warn("⚠️ Server-side materialize threw:", err);
      }

      const pendingRaw = localStorage.getItem("pendingBooking");
      const pendingBooking: PendingBooking | null = pendingRaw
        ? JSON.parse(pendingRaw)
        : null;

      const existingBookings = await fetchPaidBookingsForCheckout(paymentId, orderId);
      if (existingBookings.length > 0) {
        setStatus("done");
        setMsg("Payment successful — your booking is confirmed!");
        await buildConfirmationAndRedirect({
          bookings: existingBookings,
          paymentId,
          pb: pendingBooking,
          razorpayProfile,
          navigate,
        });
        return;
      }

      if (materializeSucceeded) {
        setStatus("failed");
        setMsg(
          "Payment verified but booking rows are not visible yet. Please wait — our system reconciles automatically within 30 seconds."
        );
        return;
      }

      // Legacy fallback: only when materialize failed AND no rows exist yet.
      if (!pendingBooking) {
        setStatus("failed");
        setMsg(
          "Payment received but booking details are not available. Please contact support — your payment is safe and we'll reconcile it within 30 seconds automatically."
        );
        return;
      }

      const pb = pendingBooking;

      // Resolve location_id early — needed for both customer and booking inserts
      let locationId: string | null = pb.locationId || null;
      if (!locationId) {
        const fallbackSlug = razorpayProfile === "lite" ? "lite" : "main";
        const { data: loc } = await supabase
          .from("locations")
          .select("id")
          .eq("slug", fallbackSlug)
          .limit(1)
          .maybeSingle();
        locationId = loc?.id ?? null;
      }
      if (!locationId) {
        setStatus("failed");
        setMsg("Could not determine venue location. Please contact support or rebook.");
        return;
      }

      // 3) Ensure customer exists (by phone); create if needed
      let customerId = pb.customer.id;
      if (!customerId) {
        // Normalize phone number before searching (matches venue booking flow)
        const normalizedPhone = normalizePhoneNumber(pb.customer.phone);
        
        // Validate customer name is provided
        if (!pb.customer.name || !pb.customer.name.trim()) {
          setStatus("failed");
          setMsg("Customer name is required. Please contact support or rebook.");
          return;
        }

        // Check for existing customer with normalized phone
        const { data: existingCustomer, error: searchError } = await supabase
          .from("customers")
          .select("id, name, custom_id")
          .eq("phone", normalizedPhone)
          .eq("location_id", locationId)
          .maybeSingle();

        if (searchError && searchError.code !== "PGRST116") {
          console.error("Customer search error:", searchError);
          setStatus("failed");
          setMsg("Could not search for customer. Please contact support or rebook.");
          return;
        }

        if (existingCustomer) {
          customerId = existingCustomer.id;
          console.log(`✅ Found existing customer: ${existingCustomer.name} (${existingCustomer.custom_id || existingCustomer.id})`);
        } else {
          // Create new customer with normalized phone and custom_id (matches venue booking flow)
          const customerID = generateCustomerID(normalizedPhone);

          const { data: created, error: cErr } = await supabase
            .from("customers")
            .insert({
              name: pb.customer.name.trim(),
              phone: normalizedPhone,
              email: pb.customer.email?.trim() || null,
              custom_id: customerID,
              location_id: locationId,
              is_member: false,
              loyalty_points: 0,
              total_spent: 0,
              total_play_time: 0,
            })
            .select("id")
            .single();

          if (cErr) {
            console.error("Customer creation error:", cErr);
            if (cErr.code === '23505') {
              // Duplicate phone number - try to find the existing customer again
              const { data: retryCustomer } = await supabase
                .from("customers")
                .select("id")
                .eq("phone", normalizedPhone)
                .eq("location_id", locationId)
                .maybeSingle();
              
              if (retryCustomer) {
                customerId = retryCustomer.id;
                console.log("✅ Found existing customer on retry:", customerId);
              } else {
                setStatus("failed");
                setMsg("This phone number is already registered. Please contact support.");
                return;
              }
            } else {
              setStatus("failed");
              setMsg("Could not create customer. Please contact support or rebook.");
              return;
            }
          } else {
            customerId = created!.id;
            console.log(`✅ New customer created: ${pb.customer.name.trim()} (${customerID})`);
          }
        }
      }

      // 4) Last-chance check before client insert (webhook may have landed)
      const preInsertBookings = await fetchPaidBookingsForCheckout(paymentId, orderId);
      if (preInsertBookings.length > 0) {
        setStatus("done");
        setMsg("Payment successful — your booking is confirmed!");
        await buildConfirmationAndRedirect({
          bookings: preInsertBookings,
          paymentId,
          pb,
          razorpayProfile,
          navigate,
        });
        return;
      }

      // 5) Insert booking rows directly (one per station per slot) — backup only
      const uniqueStations = [...new Set(pb.selectedStations)];
      const totalBookings = uniqueStations.length * pb.slots.length;
      const rows: Array<Record<string, unknown>> = [];
      uniqueStations.forEach((station_id) => {
        pb.slots.forEach((slot) => {
          rows.push({
            station_id,
            customer_id: customerId!,
            location_id: locationId,
            booking_date: pb.selectedDateISO,
            start_time: slot.start_time,
            end_time: slot.end_time,
            duration: pb.duration,
            status: "confirmed",
            original_price: pb.pricing.original / totalBookings,
            discount_percentage:
              pb.pricing.discount > 0 ? (pb.pricing.discount / pb.pricing.original) * 100 : null,
            final_price: pb.pricing.final / totalBookings,
            coupon_code: pb.pricing.coupons || null,
            payment_mode: "razorpay",
            payment_txn_id: paymentId,
            player_count: pb.stationPlayerCounts?.[station_id] ?? 1,
            notes: razorpayOrderTag(orderId),
          });
        });
      });

      const { error: bErr, data: inserted } = await supabase
        .from("bookings")
        .insert(rows)
        .select("id, booking_date, start_time, end_time, final_price, station_id, customer_id");

      if (bErr) {
        const racedBookings = await fetchPaidBookingsForCheckout(paymentId, orderId);
        if (racedBookings.length > 0) {
          setStatus("done");
          setMsg("Payment successful — your booking is confirmed!");
          await buildConfirmationAndRedirect({
            bookings: racedBookings,
            paymentId,
            pb,
            razorpayProfile,
            navigate,
          });
          return;
        }
        console.error("Booking creation error:", bErr);
        setStatus("failed");
        setMsg(
          `Payment ok, but booking creation failed: ${bErr.message || "Database error"}. Please contact support or rebook.`
        );
        return;
      }

      setStatus("done");
      setMsg("Payment successful — your booking is confirmed!");
      await buildConfirmationAndRedirect({
        bookings: inserted ?? [],
        paymentId,
        pb,
        razorpayProfile,
        navigate,
      });
    };

    run();
  }, [paymentId, orderId, signature, razorpayProfile]);

  const title =
    status === "done" ? "Payment Successful!"
    : status === "failed" ? "Payment Issue"
    : "Processing Payment…";

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12] flex items-center justify-center p-6">
      {/* Animated background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cuephoria-purple/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-cuephoria-blue/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cuephoria-lightpurple/20 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo Section */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-cuephoria-purple/30 to-cuephoria-lightpurple/30 blur-xl animate-pulse"></div>
            <img
              src="/branding/cuetronix-logo.png"
              alt="Cuetronix"
              className="h-20 md:h-24 relative z-10 drop-shadow-[0_0_25px_rgba(155,135,245,0.5)] animate-float"
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl animate-scale-in">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === "checking" || status === "creating" ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-cuephoria-lightpurple/20 animate-ping"></div>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="w-16 h-16 border-t-4 border-cuephoria-lightpurple border-solid rounded-full animate-spin"></div>
                  <div className="absolute w-12 h-12 border-t-4 border-r-4 border-transparent border-solid rounded-full border-r-cuephoria-purple animate-spin-slow"></div>
                  <Loader2 className="absolute w-8 h-8 text-cuephoria-lightpurple animate-spin" />
                </div>
              </div>
            ) : status === "done" ? (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 animate-pulse"></div>
                  <CheckCircle2 className="w-20 h-20 text-green-500 relative z-10 animate-scale-in" />
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
                <AlertCircle className="w-20 h-20 text-red-500 relative z-10 animate-scale-in" />
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-purple animate-text-gradient">
            {title}
          </h1>

          {/* Message */}
          <p className="text-gray-300 mb-6 text-base leading-relaxed">{msg}</p>

          {/* Critical Warning - Do not close/refresh */}
          {(status === "checking" || status === "creating") && (
            <div className="mb-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/40 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-300 mb-1">
                    ⚠️ Please Do Not Close or Refresh This Page
                  </p>
                  <p className="text-xs text-yellow-200/80 leading-relaxed">
                    Your booking is being processed. Closing this browser window or refreshing the page may prevent your booking from being created. Please wait until you see the confirmation message.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Progress Indicator */}
          {(status === "checking" || status === "creating") && (
            <div className="mb-6">
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple rounded-full animate-shimmer" style={{
                  width: status === "checking" ? "40%" : "70%",
                  transition: "width 0.5s ease-in-out"
                }}></div>
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-2">
                <Sparkles className="h-3 w-3 text-cuephoria-lightpurple animate-pulse" />
                {status === "checking" ? "Verifying payment details..." : "Creating your booking..."}
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "done" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-green-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment verified and booking confirmed!
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin text-cuephoria-lightpurple" />
                <span>Redirecting to booking confirmation...</span>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === "failed" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-sm text-red-400 flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {msg}
                </p>
              </div>
            </div>
          )}

          {/* Decorative Elements */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <Sparkles className="h-3 w-3 text-cuephoria-lightpurple/50" />
              Powered by Cuephoria Gaming Lounge
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
