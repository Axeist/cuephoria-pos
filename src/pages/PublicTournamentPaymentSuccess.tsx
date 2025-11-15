import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, AlertCircle, Sparkles, Trophy } from "lucide-react";
import { generateId } from '@/utils/pos.utils';

type PendingTournamentRegistration = {
  tournamentId: string;
  tournamentName: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    id?: string;
    is_existing_customer: boolean;
  };
  entryFee: number;
  transactionFee: number;
  totalWithFee: number;
};

// Phone number normalization
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export default function PublicTournamentPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get("payment_id") || "";
  const orderId = searchParams.get("order_id") || "";
  const signature = searchParams.get("signature") || "";
  const [status, setStatus] = useState<"checking" | "registering" | "done" | "failed">("checking");
  const [msg, setMsg] = useState("Verifying your payment…");

  useEffect(() => {
    const run = async () => {
      if (!paymentId || !orderId || !signature) {
        setStatus("failed");
        setMsg("Missing payment details. Please try registering again.");
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
          localStorage.removeItem("pendingTournamentRegistration");
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

      // 2) Get saved registration payload
      const raw = localStorage.getItem("pendingTournamentRegistration");
      if (!raw) {
        setStatus("failed");
        setMsg("No registration data found. Please try registering again.");
        return;
      }

      const pr: PendingTournamentRegistration = JSON.parse(raw);

      setStatus("registering");
      setMsg("Payment successful! Completing your registration…");

      // 3) Ensure customer exists (by phone); create if needed
      let customerId = pr.customer.id;
      if (!customerId || !pr.customer.is_existing_customer) {
        const normalizedPhone = normalizePhoneNumber(pr.customer.phone);
        
        if (!pr.customer.name || !pr.customer.name.trim()) {
          setStatus("failed");
          setMsg("Customer name is required. Please contact support.");
          return;
        }

        // Check for existing customer with normalized phone
        const { data: existingCustomer, error: searchError } = await supabase
          .from("customers")
          .select("id, name")
          .eq("phone", normalizedPhone)
          .maybeSingle();

        if (searchError && searchError.code !== "PGRST116") {
          console.error("Customer search error:", searchError);
          setStatus("failed");
          setMsg("Could not search for customer. Please contact support.");
          return;
        }

        if (existingCustomer) {
          customerId = existingCustomer.id;
          console.log(`✅ Found existing customer: ${existingCustomer.name}`);
        } else {
          // Create new customer
          const { data: created, error: cErr } = await supabase
            .from("customers")
            .insert({
              name: pr.customer.name.trim(),
              phone: normalizedPhone,
              email: pr.customer.email?.trim() || null,
              is_member: false,
              loyalty_points: 0,
              total_spent: 0,
              total_play_time: 0,
              created_via_tournament: true
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
              setMsg("Could not create customer. Please contact support.");
              return;
            }
          } else {
            customerId = created!.id;
            console.log(`✅ New customer created: ${pr.customer.name.trim()}`);
          }
        }
      }

      // 4) Register for tournament
      const { error: registrationError } = await supabase
        .from('tournament_public_registrations')
        .insert({
          tournament_id: pr.tournamentId,
          customer_name: pr.customer.name.trim(),
          customer_phone: normalizePhoneNumber(pr.customer.phone),
          customer_email: pr.customer.email?.trim() || null,
          registration_source: 'public_website',
          status: 'registered',
          entry_fee: pr.entryFee,
          payment_status: 'paid'
        });

      if (registrationError) {
        console.error('Registration error:', registrationError);
        setStatus("failed");
        setMsg("Payment successful but registration failed. Please contact support.");
        return;
      }

      // 5) Add player to tournament players array
      const { data: tournamentData, error: tournamentFetchError } = await supabase
        .from('tournaments')
        .select('players')
        .eq('id', pr.tournamentId)
        .single();

      if (tournamentFetchError) {
        console.error('Error fetching tournament:', tournamentFetchError);
      } else {
        const playerId = generateId();
        const updatedPlayers = [
          ...(Array.isArray(tournamentData.players) ? tournamentData.players : []),
          {
            id: playerId,
            name: pr.customer.name.trim(),
            customerId: customerId,
            customer_id: customerId
          }
        ];

        const { error: tournamentUpdateError } = await supabase
          .from('tournaments')
          .update({
            players: updatedPlayers,
            updated_at: new Date().toISOString()
          })
          .eq('id', pr.tournamentId);

        if (tournamentUpdateError) {
          console.error('Tournament update error:', tournamentUpdateError);
        }
      }

      localStorage.removeItem("pendingTournamentRegistration");
      setStatus("done");
      setMsg("Registration completed successfully!");

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/public/tournaments?registration_success=true");
      }, 2000);
    };

    run();
  }, [paymentId, orderId, signature, navigate]);

  const title =
    status === "done" ? "Registration Successful!"
    : status === "failed" ? "Registration Issue"
    : "Processing Registration…";

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
            {status === "checking" || status === "registering" ? (
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
                  <Trophy className="w-20 h-20 text-green-500 relative z-10 animate-scale-in" />
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

          {/* Loading Progress Indicator */}
          {(status === "checking" || status === "registering") && (
            <div className="mb-6">
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple rounded-full animate-shimmer" style={{
                  width: status === "checking" ? "40%" : "70%",
                  transition: "width 0.5s ease-in-out"
                }}></div>
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-2">
                <Sparkles className="h-3 w-3 text-cuephoria-lightpurple animate-pulse" />
                {status === "checking" ? "Verifying payment details..." : "Completing your registration..."}
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "done" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
                <p className="text-sm text-green-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment verified and registration confirmed!
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin text-cuephoria-lightpurple" />
                <span>Redirecting to tournaments page...</span>
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

