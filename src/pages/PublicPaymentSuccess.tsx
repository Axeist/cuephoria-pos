import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
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

      localStorage.removeItem("pendingBooking");
      setStatus("done");
      setMsg("Booking confirmed! You can head back.");
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
        <Link to="/public/booking" className="inline-flex rounded-md bg-cuephoria-purple/80 hover:bg-cuephoria-purple px-4 py-2 text-white">
          Back to Booking
        </Link>
      </div>
    </div>
  );
}
