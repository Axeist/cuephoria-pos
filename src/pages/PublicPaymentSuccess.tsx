import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";

type PendingBooking = {
  selectedStations: string[];
  selectedDateISO: string;
  slots: Array<{ start_time: string; end_time: string }>;
  duration: number;
  customer: { id?: string; name: string; phone: string; email?: string };
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

export default function PublicPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get("payment_id") || "";
  const orderId = searchParams.get("order_id") || "";
  const signature = searchParams.get("signature") || "";
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

      // 1) Verify payment with backend
      try {
        const verifyRes = await fetch("/api/razorpay/verify-payment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature,
          }),
        });

        const verifyData = await verifyRes.json().catch(() => null);

        if (!verifyRes.ok || !verifyData?.ok || !verifyData?.success) {
          localStorage.removeItem("pendingBooking");
          setStatus("failed");
          setMsg(verifyData?.error || "Payment verification failed. Please try again.");
          return;
        }

        console.log("✅ Payment verified:", verifyData);
      } catch (err) {
        console.error("Payment verification error:", err);
        setStatus("failed");
        setMsg("Could not verify payment at this time. Please try again.");
        return;
      }

      // 2) Get saved booking payload
      const raw = localStorage.getItem("pendingBooking");
      if (!raw) {
        setStatus("failed");
        setMsg("No booking data found. Please rebook.");
        return;
      }

      const pb: PendingBooking = JSON.parse(raw);

      setStatus("creating");
      setMsg("Payment successful! Creating your booking…");

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

      // 4) Check if booking already exists (created by webhook)
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("payment_txn_id", paymentId)
        .limit(1);

      let insertedBookings;
      if (existingBookings && existingBookings.length > 0) {
        console.log("✅ Booking already exists (created by webhook):", existingBookings[0].id);
        insertedBookings = existingBookings;
      } else {
        // 5) Insert booking rows directly (one per station per slot)
        const rows: any[] = [];
        pb.selectedStations.forEach((station_id) => {
          pb.slots.forEach((slot) => {
            rows.push({
              station_id,
              customer_id: customerId!,
              booking_date: pb.selectedDateISO,
              start_time: slot.start_time,
              end_time: slot.end_time,
              duration: pb.duration,
              status: "confirmed",
              original_price: pb.pricing.original / pb.slots.length,
              discount_percentage:
                pb.pricing.discount > 0 ? (pb.pricing.discount / pb.pricing.original) * 100 : null,
              final_price: pb.pricing.final / pb.slots.length,
              coupon_code: pb.pricing.coupons || null,
              payment_mode: "razorpay",
              payment_txn_id: paymentId, // Store Razorpay payment ID
              notes: `Razorpay Order: ${orderId}`, // Store order ID in notes for reference
            });
          });
        });

        const { error: bErr, data: inserted } = await supabase
          .from("bookings")
          .insert(rows)
          .select("id");

        if (bErr) {
          console.error("Booking creation error:", bErr);
          setStatus("failed");
          setMsg(
            `Payment ok, but booking creation failed: ${bErr.message || "Database error"}. Please contact support or rebook.`
          );
          return;
        }
        insertedBookings = inserted;
      }

      console.log("✅ Bookings created/found:", insertedBookings?.length || 0);

      // 5) Fetch station names for confirmation dialog
      const stationIds = [...new Set(pb.selectedStations)];
      const { data: stationsData, error: stationsError } = await supabase
        .from("stations")
        .select("id, name")
        .in("id", stationIds);

      if (stationsError) {
        console.error("Error fetching stations:", stationsError);
      }

      const stationNames = stationsData?.map(s => s.name) || pb.selectedStations;
      const firstSlot = pb.slots[0];
      const lastSlot = pb.slots[pb.slots.length - 1];

      // Format times
      const formatTime = (timeString: string) => {
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        });
      };

      // Store confirmation data in localStorage for the booking page to pick up
      const confirmationData = {
        bookingId: insertedBookings?.[0]?.id?.slice(0, 8).toUpperCase() || "BOOKING",
        customerName: pb.customer.name,
        stationNames: stationNames,
        date: pb.selectedDateISO,
        startTime: formatTime(firstSlot.start_time),
        endTime: formatTime(lastSlot.end_time),
        totalAmount: pb.pricing.final,
        transactionFee: pb.pricing.transactionFee,
        totalWithFee: pb.pricing.totalWithFee || pb.pricing.final,
        couponCode: pb.pricing.coupons || undefined,
        discountAmount: pb.pricing.discount > 0 ? pb.pricing.discount : undefined,
        sessionDuration: pb.duration === 15 ? "15 minutes" : "60 minutes",
        paymentMode: "razorpay", // Online payment via Razorpay
        paymentTxnId: paymentId, // Razorpay payment ID
      };

      localStorage.setItem("bookingConfirmation", JSON.stringify(confirmationData));
      localStorage.removeItem("pendingBooking");

      // Redirect to booking page with success flag
      navigate("/public/booking?booking_success=true");
    };

    run();
  }, [paymentId, orderId, signature]);

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
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria Logo"
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
