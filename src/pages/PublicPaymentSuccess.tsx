import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type PendingBooking = {
  selectedStations: string[];
  selectedDateISO: string;
  slots: Array<{ start_time: string; end_time: string }>;
  duration: number;
  customer: { id?: string; name: string; phone: string; email?: string };
  pricing: { original: number; discount: number; final: number; coupons: string };
};

export default function PublicPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get("payment_id") || "";
  const orderId = searchParams.get("order_id") || "";
  const signature = searchParams.get("signature") || "";
  const [status, setStatus] = useState<"checking" | "creating" | "done" | "failed">("checking");
  const [msg, setMsg] = useState("Verifying your payment…");

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
        const { data, error } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", pb.customer.phone)
          .maybeSingle();

        if (!error && data?.id) {
          customerId = data.id;
        } else {
          const { data: created, error: cErr } = await supabase
            .from("customers")
            .insert({
              name: pb.customer.name,
              phone: pb.customer.phone,
              email: pb.customer.email || null,
              is_member: false,
              loyalty_points: 0,
              total_spent: 0,
              total_play_time: 0,
            })
            .select("id")
            .single();

          if (cErr) {
            setStatus("failed");
            setMsg("Could not create customer. Please contact support or rebook.");
            return;
          }
          customerId = created!.id;
        }
      }

      // 4) Insert booking rows directly (one per station per slot)
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

      const { error: bErr, data: insertedBookings } = await supabase
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

      console.log("✅ Bookings created:", insertedBookings?.length || 0);

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
        couponCode: pb.pricing.coupons || undefined,
        discountAmount: pb.pricing.discount > 0 ? pb.pricing.discount : undefined,
        sessionDuration: pb.duration === 15 ? "15 minutes" : "60 minutes",
      };

      localStorage.setItem("bookingConfirmation", JSON.stringify(confirmationData));
      localStorage.removeItem("pendingBooking");

      // Redirect to booking page with success flag
      navigate("/public/booking?booking_success=true");
    };

    run();
  }, [paymentId, orderId, signature]);

  const title =
    status === "done" ? "Payment Success"
    : status === "failed" ? "Payment Issue"
    : "Processing…";

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-gray-200 p-6">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <p className="text-sm mb-6">{msg}</p>
        {status === "done" && (
          <p className="text-xs text-gray-400 mb-4">Redirecting to booking confirmation...</p>
        )}
      </div>
    </div>
  );
}
