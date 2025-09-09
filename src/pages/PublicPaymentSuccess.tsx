import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type PendingBooking = {
  selectedStations: string[];
  selectedDateISO: string;
  start_time: string;
  end_time: string;
  customer: { id?: string; name: string; phone: string; email?: string };
  pricing: { original: number; discount: number; final: number; coupons: string };
};

export default function PublicPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const txn = searchParams.get("txn") || "";
  const [status, setStatus] = useState<"checking" | "creating" | "done" | "failed">("checking");
  const [msg, setMsg] = useState("Verifying your payment…");

  useEffect(() => {
    const run = async () => {
      if (!txn) {
        setStatus("failed");
        setMsg("Missing transaction reference. Please rebook.");
        return;
      }

      // 1) Verify with backend
      try {
        const st = await fetch(`/api/phonepe/status?txn=${encodeURIComponent(txn)}`).then(r => r.json());
        if (!st?.success) {
          localStorage.removeItem("pendingBooking");
          setStatus("failed");
          setMsg("Payment verification failed. Please try again.");
          return;
        }
      } catch {
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

      // 4) Insert booking rows (one per station)
      const rows = pb.selectedStations.map((station_id) => ({
        station_id,
        customer_id: customerId!,
        booking_date: pb.selectedDateISO,
        start_time: pb.start_time,
        end_time: pb.end_time,
        duration: 60,
        status: "confirmed",
        original_price: pb.pricing.original,
        discount_percentage:
          pb.pricing.discount > 0 ? (pb.pricing.discount / pb.pricing.original) * 100 : null,
        final_price: pb.pricing.final,
        coupon_code: pb.pricing.coupons || null,
        payment_mode: "phonepe",
        payment_txn_id: txn,
      }));

      const { error: bErr } = await supabase.from("bookings").insert(rows);
      if (bErr) {
        setStatus("failed");
        setMsg("Payment ok, but booking creation failed. Please contact support or rebook.");
        return;
      }

      localStorage.removeItem("pendingBooking");
      setStatus("done");
      setMsg("Booking confirmed! You can head back.");
    };

    run();
  }, [txn]);

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
