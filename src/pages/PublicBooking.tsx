import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StationSelector } from "@/components/booking/StationSelector";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import CouponPromotionalPopup from "@/components/CouponPromotionalPopup";
import BookingConfirmationDialog from "@/components/BookingConfirmationDialog";
import LegalDialog from "@/components/dialog/LegalDialog";
import {
  CalendarIcon, Clock, MapPin, Phone, Mail, User, Gamepad2, Timer,
  Sparkles, Star, Zap, Percent, CheckCircle, AlertTriangle, Lock, X
} from "lucide-react";
import { format, parse, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/router";

interface Station {
  id: string;
  name: string;
  type: "ps5" | "8ball";
  hourly_rate: number;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface CustomerInfo {
  id?: string;
  name: string;
  phone: string;
  email: string;
}

interface TodayBookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
  station_id: string;
  customer_id: string;
  stationName: string;
  customerName: string;
  customerPhone: string;
}

export default function PublicBooking() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: "", phone: "", email: "" });
  const [customerNumber, setCustomerNumber] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [stationType, setStationType] = useState<"all" | "ps5" | "8ball">("all");
  const [appliedCoupons, setAppliedCoupons] = useState<{ [key: string]: string }>({});
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<"terms" | "privacy" | "contact">("terms");
  const [todayRows, setTodayRows] = useState<TodayBookingRow[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);

  // Helper: Happy Hour Checking
  const isHappyHour = (date: Date, slot: TimeSlot | null) => {
    if (!slot) return false;
    const day = getDay(date);
    const startHour = Number(slot.start_time.split(":")[0]);
    return (
      day >= 1 && day <= 5 && startHour >= 11 && startHour < 16
    ); // 11 AM inclusive to 4 PM exclusive
  };

  // ----- EFFECTS -----
  useEffect(() => {
    fetchStations();
    fetchTodaysBookings();
  }, []);

  useEffect(() => {
    if (appliedCoupons["8ball"] === "NIT99" && !isHappyHour(selectedDate, selectedSlot)) {
      setAppliedCoupons((prev) => {
        const copy = { ...prev };
        delete copy["8ball"];
        toast.error("NIT99 coupon removed: valid only Mon-Fri 11 AM–4 PM");
        return copy;
      });
    }
  }, [selectedDate, selectedSlot, appliedCoupons]);

  useEffect(() => {
    const channel = supabase
      .channel("booking-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
        fetchTodaysBookings();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
    else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedStations, selectedDate]);

  // ---- PHONEPE PAYMENT HANDLING ----
  const router = useRouter();
  useEffect(() => {
    const code = router.query.code;
    if (code === "SUCCESS") setShowConfirmationDialog(true);
    if (code === "FAILED" || code === "CANCELLED") setShowFailureDialog(true);
  }, [router.query]);

  // Fetch stations info
  const fetchStations = async () => {
    try {
      const { data, error } = await supabase.from("stations").select("id, name, type, hourly_rate").order("name");
      if (error) throw error;
      setStations(data || []);
    } catch (error) {
      toast.error("Failed to load stations");
    }
  };

  // Fetch available time slots for selected stations/date
  const fetchAvailableSlots = async () => {
    if (selectedStations.length === 0) return;
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      if (selectedStations.length === 1) {
        const { data, error } = await supabase.rpc("get_available_slots", {
          p_date: dateStr,
          p_station_id: selectedStations[0],
          p_slot_duration: 60,
        });
        if (error) throw error;
        setAvailableSlots(data || []);
      } else {
        const results = await Promise.all(
          selectedStations.map((stationId) =>
            supabase.rpc("get_available_slots", { p_date: dateStr, p_station_id: stationId, p_slot_duration: 60 })
          )
        );
        const base = results.find((r) => !r.error && Array.isArray(r.data))?.data as TimeSlot[] | undefined;
        if (!base) {
          const firstErr = results.find((r) => r.error)?.error;
          if (firstErr) throw firstErr;
          setAvailableSlots([]);
          return;
        }
        const unionMap = new Map<string, boolean>();
        const key = (slot: TimeSlot) => `${slot.start_time}-${slot.end_time}`;
        base.forEach((s) => unionMap.set(key(s), Boolean(s.is_available)));
        results.forEach((r) => {
          (r.data || []).forEach((s) => {
            const k = key(s);
            unionMap.set(k, unionMap.get(k) || Boolean(s.is_available));
          });
        });
        const merged = base.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
          is_available: unionMap.get(key(s)) ?? false,
        }));
        setAvailableSlots(merged);
      }
      if (
        selectedSlot &&
        !availableSlots.some(
          (s) =>
            s.start_time === selectedSlot.start_time &&
            s.end_time === selectedSlot.end_time &&
            s.is_available
        )
      ) {
        setSelectedSlot(null);
      }
    } catch {
      toast.error("Failed to load available time slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  // --- Customer search logic ---
  const searchCustomer = async () => {
    if (!customerNumber.trim()) {
      toast.error("Please enter a customer number");
      return;
    }
    setSearchingCustomer(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("phone", customerNumber)
        .single();
      if (error && (error as any).code !== "PGRST116") throw error;
      if (data) {
        setIsReturningCustomer(true);
        setCustomerInfo({
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email || "",
        });
        toast.success(`Welcome back, ${data.name}! 🎮`);
      } else {
        setIsReturningCustomer(false);
        setCustomerInfo({ name: "", phone: customerNumber, email: "" });
        toast.info("New customer! Please fill in your details below.");
      }
      setHasSearched(true);
    } catch {
      toast.error("Failed to search customer");
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleStationToggle = (stationId: string) => {
    setSelectedStations((prev) =>
      prev.includes(stationId) ? prev.filter((id) => id !== stationId) : [...prev, stationId]
    );
    setSelectedSlot(null);
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    if (selectedStations.length > 0) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const checks = await Promise.all(
        selectedStations.map(async (stationId) => {
          const { data, error } = await supabase.rpc("get_available_slots", {
            p_date: dateStr,
            p_station_id: stationId,
            p_slot_duration: 60,
          });
          if (error) return { stationId, available: false };
          const match = (data || []).find(
            (s: any) => s.start_time === slot.start_time && s.end_time === slot.end_time && s.is_available
          );
          return { stationId, available: Boolean(match) };
        })
      );
      const availableIds = checks.filter((c) => c.available).map((c) => c.stationId);
      const removedIds = checks.filter((c) => !c.available).map((c) => c.stationId);
      if (removedIds.length > 0) {
        const removedNames = stations
          .filter((s) => removedIds.includes(s.id))
          .map((s) => s.name)
          .join(", ");
        toast.message("Some stations aren’t free at this time", {
          description: `Removed: ${removedNames}. You can proceed with the rest.`,
        });
      }
      if (availableIds.length === 0) {
        toast.error("That time isn’t available for the selected stations.");
        setSelectedSlot(null);
        return;
      }
      if (availableIds.length !== selectedStations.length) {
        setSelectedStations(availableIds);
      }
    }
    setSelectedSlot(slot);
  };

  const removeCoupon = (key: string) => {
    setAppliedCoupons((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const applyCoupon = (code: string) => {
    const upper = (code || "").toUpperCase().trim();
    const allowed = ["CUEPHORIA25", "NIT99", "NIT50", "ALMA50", "AXEIST"];
    if (!allowed.includes(upper)) {
      toast.error("Invalid coupon code");
      return;
    }
    if (upper === "AXEIST") {
      const ok = window.confirm(
        "🥷 Psst… AXEIST unlocked!\n\nThis grants 100% OFF for close friends 💜\n\nApply it now?"
      );
      if (!ok) return;
    }
    if (upper === "NIT99") {
      if (!selectedStations.some((id) => stations.find((s) => s.id === id && s.type === "8ball"))) {
        toast.error("NIT99 applies only to 8-Ball stations");
        return;
      }
      if (!isHappyHour(selectedDate, selectedSlot)) {
        toast.error("NIT99 valid only Mon-Fri 11 AM to 4 PM");
        return;
      }
      setAppliedCoupons((prev) => ({ ...prev, "8ball": "NIT99" }));
      toast.success("NIT99 applied to 8-Ball stations");
      toast.message("Hint: With NIT99, you may also apply NIT50 to get 50% off on PS5 stations if selected.");
      return;
    }
    if (upper === "NIT50" || upper === "ALMA50") {
      if (appliedCoupons["8ball"] === "NIT99" && isHappyHour(selectedDate, selectedSlot)) {
        if (!selectedStations.some((id) => stations.find((s) => s.id === id && s.type === "ps5"))) {
          toast.error(`${upper} applies only to PS5 stations during happy hours with NIT99.`);
          return;
        }
      }
      setAppliedCoupons((prev) => {
        if (prev["ps5"] && prev["ps5"] !== upper) {
          toast.error("Only one PS5 coupon can be applied (NIT50 or ALMA50).");
          return prev;
        }
        return { ...prev, ps5: upper };
      });
      toast.success(`${upper} applied.`);
      return;
    }
    // CUEPHORIA25 and AXEIST apply globally (clear others)
    if (upper === "CUEPHORIA25" || upper === "AXEIST") {
      setAppliedCoupons({ all: upper });
      toast.success(`${upper} applied globally.`);
      return;
    }
  };

  const handleCouponApply = () => {
    applyCoupon(couponCode);
    setCouponCode("");
  };

  const handleCouponSelect = (coupon: string) => {
    applyCoupon(coupon);
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0 || !selectedSlot) return 0;
    return stations
      .filter((s) => selectedStations.includes(s.id))
      .reduce((sum, s) => sum + s.hourly_rate, 0);
  };

  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    if (original === 0) return { total: 0, breakdown: {} };
    if (!Object.keys(appliedCoupons).length) return { total: 0, breakdown: {} };
    if (appliedCoupons["all"]) {
      if (appliedCoupons["all"] === "AXEIST") return { total: original, breakdown: { all: original } };
      if (appliedCoupons["all"] === "CUEPHORIA25") {
        const disc = original * 0.25;
        return { total: disc, breakdown: { all: disc } };
      }
      return { total: 0, breakdown: {} };
    }
    let totalDiscount = 0;
    const breakdown: Record<string, number> = {};
    if (appliedCoupons["8ball"] === "NIT99") {
      const eightBallStations = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "8ball"
      );
      const totalEightBallRate = eightBallStations.reduce((sum, s) => sum + s.hourly_rate, 0);
      const discountAmount = totalEightBallRate - eightBallStations.length * 99;
      if (discountAmount > 0) {
        totalDiscount += discountAmount;
        breakdown["8-Ball (NIT99)"] = discountAmount;
      }
    }
    if (appliedCoupons["ps5"] === "NIT50" || appliedCoupons["ps5"] === "ALMA50") {
      const ps5Stations = stations.filter((s) => selectedStations.includes(s.id) && s.type === "ps5");
      const totalPs5Rate = ps5Stations.reduce((sum, s) => sum + s.hourly_rate, 0);
      const discountAmount = totalPs5Rate * 0.5;
      totalDiscount += discountAmount;
      breakdown[`PS5 (${appliedCoupons["ps5"]})`] = discountAmount;
    }
    return { total: totalDiscount, breakdown };
  };

  const calculateFinalPrice = () => {
    const original = calculateOriginalPrice();
    const discount = calculateDiscount().total;
    return Math.max(original - discount, 0);
  };

  const isCustomerInfoComplete = () =>
    hasSearched && customerNumber.trim() !== "" && customerInfo.name.trim() !== "";

  const isStationSelectionAvailable = () => isCustomerInfoComplete();
  const isTimeSelectionAvailable = () => isStationSelectionAvailable() && selectedStations.length > 0;

  // --- PAYMENT BUTTON LOGIC ---
  const handlePhonePePayment = async () => {
    if (!isCustomerInfoComplete() || !selectedSlot || selectedStations.length === 0) {
      toast.error("Complete booking details first");
      return;
    }
    setLoading(true);
    try {
      const amount = calculateFinalPrice();
      const res = await fetch("/api/phonepe-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerNumber, amount }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast.error("Failed: " + (data.error || "No response from PhonePe"));
      }
    } catch {
      toast.error("Error starting payment");
    } finally {
      setLoading(false);
    }
  };

  // --- Helper Mask Phone ---
  const maskPhone = (p?: string) => {
    if (!p) return "";
    const s = p.replace(/\D/g, "");
    if (s.length <= 4) return s;
    return `${s.slice(0, 3)}${"X".repeat(Math.max(0, s.length - 5))}${s.slice(-2)}`;
  };

  // --- Fetch today's bookings ---
  const fetchTodaysBookings = async () => {
    setTodayLoading(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("id, booking_date, start_time, end_time, status, station_id, customer_id")
        .eq("booking_date", todayStr)
        .order("start_time", { ascending: true });
      if (error) throw error;
      if (!bookingsData || bookingsData.length === 0) {
        setTodayRows([]);
        setTodayLoading(false);
        return;
      }
      const stationIds = [...new Set(bookingsData.map((b) => b.station_id))];
      const customerIds = [...new Set(bookingsData.map((b) => b.customer_id))];
      const [{ data: stationsData }, { data: customersData }] = await Promise.all([
        supabase.from("stations").select("id, name").in("id", stationIds),
        supabase.from("customers").select("id, name, phone").in("id", customerIds),
      ]);
      const rows: TodayBookingRow[] = bookingsData.map((b) => {
        const st = stationsData?.find((s) => s.id === b.station_id);
        const cu = customersData?.find((c) => c.id === b.customer_id);
        return {
          id: b.id,
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status as TodayBookingRow["status"],
          station_id: b.station_id,
          customer_id: b.customer_id,
          stationName: st?.name || "—",
          customerName: cu?.name || "—",
          customerPhone: maskPhone(cu?.phone),
        };
      });
      setTodayRows(rows);
    } catch {
      toast.error("Failed to load today’s bookings");
    } finally {
      setTodayLoading(false);
    }
  };

  // --- Group Today's Bookings By Time ---
  const timeKey = (s: string, e: string) => {
    const start = new Date(`2000-01-01T${s}`);
    const end = new Date(`2000-01-01T${e}`);
    return `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — ${end.toLocaleTimeString(
      "en-US",
      { hour: "numeric", minute: "2-digit" }
    )}`;
  };

  const groupedByTime = useMemo(() => {
    const map = new Map<string, TodayBookingRow[]>();
    todayRows.forEach((r) => {
      const k = timeKey(r.start_time, r.end_time);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    const entries = Array.from(map.entries()).sort(([a], [b]) => {
      const aStart = parse(a.split(" — ")[0], "h:mm a", new Date()).getTime();
      const bStart = parse(b.split(" — ")[0], "h:mm a", new Date()).getTime();
      return aStart - bStart;
    });
    return entries;
  }, [todayRows]);

  const statusChip = (s: TodayBookingRow["status"]) => {
    const base = "px-2 py-0.5 rounded-full text-xs capitalize";
    switch (s) {
      case "confirmed":
        return <span className={cn(base, "bg-blue-500/15 text-blue-300 border border-blue-400/20")}>confirmed</span>;
      case "in-progress":
        return <span className={cn(base, "bg-amber-500/15 text-amber-300 border border-amber-400/20")}>in-progress</span>;
      case "completed":
        return <span className={cn(base, "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20")}>completed</span>;
      case "cancelled":
        return <span className={cn(base, "bg-rose-500/15 text-rose-300 border border-rose-400/20")}>cancelled</span>;
      case "no-show":
        return <span className={cn(base, "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20")}>no-show</span>;
      default:
        return <span className={cn(base, "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20")}>{s}</span>;
    }
  };

  const originalPrice = calculateOriginalPrice();
  const discountObj = calculateDiscount();
  const discount = discountObj.total;
  const discountBreakdown = discountObj.breakdown;
  const finalPrice = calculateFinalPrice();

  // --- Simple Failure Dialog ---
  const FailureDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm flex flex-col items-center">
          <X className="w-8 h-8 text-red-500 mb-3" />
          <h2 className="text-xl font-bold mb-2 text-red-600">Payment Failed</h2>
          <p className="text-gray-700 mb-4 text-center">
            Payment could not be completed.<br />Please try again or use another method.
          </p>
          <Button onClick={onClose} className="bg-red-600 text-white">Close</Button>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]">
      {/* Header, Promo Popups, Steps, etc. */}
      {/* ...all your top-level and step UI (including input, selector, etc.) as before ... */}

      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-14 relative z-10">
        {/* Form and Cards */}
        {/* ...other cards and summary ... */}

        {/* Booking Summary Card */}
        <Card className="sticky top-4 bg-white/10 backdrop-blur-xl border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,.25)] animate-scale-in">
          <CardHeader>
            <CardTitle className="text-white">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ...All your summary and display logic... */}

            <Button
              onClick={handlePhonePePayment}
              disabled={!selectedSlot || selectedStations.length === 0 || !customerNumber || loading}
              className="w-full rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90 text-white border-0 transition-all duration-150 active:scale-[.99] shadow-xl shadow-cuephoria-lightpurple/20"
              size="lg"
            >
              {loading ? "Redirecting to Payment..." : "Pay Now with PhonePe"}
            </Button>
            <p className="text-xs text-gray-400 text-center">You will be redirected to PhonePe for payment.</p>
          </CardContent>
        </Card>
        {/* ...today's bookings, tables, etc ... */}
      </main>

      {/* Booking Confirmation Dialog Popup */}
      {bookingConfirmationData && (
        <BookingConfirmationDialog
          isOpen={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          bookingData={bookingConfirmationData}
        />
      )}
      <FailureDialog isOpen={showFailureDialog} onClose={() => setShowFailureDialog(false)} />

      <LegalDialog
        isOpen={showLegalDialog}
        onClose={() => setShowLegalDialog(false)}
        type={legalDialogType}
      />
    </div>
  );
}
