import React, { useEffect, useMemo, useState } from "react";
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
  CalendarIcon,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  Gamepad2,
  Timer,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Lock,
  X,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse, getDay } from "date-fns";

/* =========================
   Types
   ========================= */
type StationType = "ps5" | "8ball";
interface Station {
  id: string;
  name: string;
  type: StationType;
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

/* =========================
   Helpers
   ========================= */
const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

const genTxnId = () =>
  `CUE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const isHappyHour = (date: Date, slot: TimeSlot | null) => {
  if (!slot) return false;
  const day = getDay(date); // 0 Sun .. 6 Sat
  const startHour = Number(slot.start_time.split(":")[0]);
  return day >= 1 && day <= 5 && startHour >= 11 && startHour < 16; // Mon-Fri, 11:00–15:59
};

/* =========================
   Component
   ========================= */
export default function PublicBooking() {
  // Stations & slots
  const [stations, setStations] = useState<Station[]>([]);
  const [stationType, setStationType] = useState<"all" | StationType>("all");
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Customer
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Coupons
  const [appliedCoupons, setAppliedCoupons] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"venue" | "phonepe">("venue");
  const [loading, setLoading] = useState(false);
  const [manualCheckLoading, setManualCheckLoading] = useState(false);

  // Misc
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<
    "terms" | "privacy" | "contact" | "refund"
  >("terms");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [todayRows, setTodayRows] = useState<TodayBookingRow[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);

  /* =========================
     Effects
     ========================= */
  useEffect(() => {
    fetchStations();
    fetchTodaysBookings();
  }, []);

  useEffect(() => {
    // Remove NIT99 if happy hour condition breaks
    if (appliedCoupons["8ball"] === "NIT99" && !isHappyHour(selectedDate, selectedSlot)) {
      setAppliedCoupons((prev) => {
        const copy = { ...prev };
        delete copy["8ball"];
        toast.error("❌ NIT99 removed: valid only Mon–Fri 11 AM–4 PM");
        return copy;
      });
    }
  }, [selectedDate, selectedSlot, appliedCoupons]);

  useEffect(() => {
    const ch = supabase
      .channel("booking-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
          fetchTodaysBookings();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
    else {
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [selectedStations, selectedDate]);

  // Enhanced PhonePe return handler
  useEffect(() => {
    const handlePaymentResult = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pp = urlParams.get('pp');
      const orderId = urlParams.get('order');
      const msg = urlParams.get('msg');

      // Only proceed if we have payment result parameters
      if (!pp || !orderId) return;

      console.log("🎯 Processing payment result:", { pp, orderId, msg });

      setLoading(true);
      toast.loading("Verifying payment status...", { id: 'payment-verify' });

      try {
        // Step 1: Always verify actual payment status from PhonePe
        console.log("🔍 Verifying payment with PhonePe...");
        
        const statusRes = await fetch(`/api/phonepe/status?order=${encodeURIComponent(orderId)}`, {
          headers: { "cache-control": "no-cache" }
        });
        
        const statusData = await statusRes.json();
        console.log("💳 Payment verification result:", statusData);
        
        toast.dismiss('payment-verify');
        
        if (statusData.ok && statusData.state === 'COMPLETED') {
          // Step 2: Payment confirmed successful - create booking
          toast.success("✅ Payment verified! Creating your booking...");
          
          const bookingDataStr = sessionStorage.getItem('pendingBookingData');
          if (!bookingDataStr) {
            throw new Error("No booking data found. Please try booking again.");
          }
          
          const bookingData = JSON.parse(bookingDataStr);
          console.log("📝 Creating booking with data:", bookingData);
          
          const bookingRes = await fetch('/api/bookings/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ...bookingData, 
              orderId: orderId 
            }),
          });
          
          const bookingResult = await bookingRes.json();
          console.log("🎫 Booking creation result:", bookingResult);
          
          if (bookingResult.ok) {
            // Step 3: Booking created successfully
            toast.success("🎉 Booking confirmed! Payment successful.");
            
            // Show confirmation dialog
            setBookingConfirmationData({
              bookingId: bookingResult.bookingId.slice(0, 8).toUpperCase(),
              customerName: bookingData.customerInfo.name,
              stationNames: stations
                .filter(s => bookingData.selectedStations.includes(s.id))
                .map(s => s.name),
              date: bookingData.selectedDate,
              startTime: new Date(`2000-01-01T${bookingData.selectedSlot.start_time}`).toLocaleTimeString(
                "en-US", { hour: "numeric", minute: "2-digit", hour12: true }
              ),
              endTime: new Date(`2000-01-01T${bookingData.selectedSlot.end_time}`).toLocaleTimeString(
                "en-US", { hour: "numeric", minute: "2-digit", hour12: true }
              ),
              totalAmount: bookingData.finalPrice,
              couponCode: Object.values(bookingData.appliedCoupons || {}).join(",") || undefined,
              discountAmount: bookingData.discount > 0 ? bookingData.discount : undefined,
            });
            setShowConfirmationDialog(true);
            
            // Clean up
            sessionStorage.removeItem('pendingBookingData');
            resetForm();
            
          } else {
            throw new Error(bookingResult.error || "Failed to create booking");
          }
          
        } else if (statusData.state === 'FAILED') {
          // Payment failed
          toast.error("❌ Payment failed. Please try booking again.");
          sessionStorage.removeItem('pendingBookingData');
          
          // Show retry options
          setTimeout(() => {
            toast.info("💡 You can try again or choose 'Pay at Venue' option.", {
              duration: 5000,
              action: {
                label: "Try Again",
                onClick: () => resetForm()
              }
            });
          }, 2000);
          
        } else if (statusData.state === 'PENDING') {
          // Payment still processing
          toast.warning("⏳ Payment is still processing. We'll update you once confirmed.");
          
        } else {
          // Unknown status
          toast.error(`Payment status unclear: ${statusData.state || 'Unknown'}. Contact support with Order ID: ${orderId}`);
        }
        
      } catch (error: any) {
        console.error("❌ Payment verification error:", error);
        toast.dismiss('payment-verify');
        toast.error(`Payment verification failed: ${error.message}. Contact support with Order ID: ${orderId}`);
      } finally {
        setLoading(false);
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    // Run payment verification when component loads
    handlePaymentResult();
  }, [stations]);

  /* =========================
     Helper Functions
     ========================= */
  const resetForm = () => {
    setSelectedStations([]);
    setSelectedSlot(null);
    setCustomerNumber("");
    setCustomerInfo({ name: "", phone: "", email: "" });
    setIsReturningCustomer(false);
    setHasSearched(false);
    setCouponCode("");
    setAppliedCoupons({});
    setAvailableSlots([]);
  };

  /* =========================
     Queries
     ========================= */
  async function fetchStations() {
    try {
      const { data, error } = await supabase
        .from("stations")
        .select("id, name, type, hourly_rate")
        .order("name");
      if (error) throw error;
      setStations(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load stations");
    }
  }

  async function fetchAvailableSlots() {
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
        // Merge available slots across selected stations
        const results = await Promise.all(
          selectedStations.map((id) =>
            supabase.rpc("get_available_slots", {
              p_date: dateStr,
              p_station_id: id,
              p_slot_duration: 60,
            })
          )
        );
        const base = results.find((r) => !r.error && Array.isArray(r.data))
          ?.data as TimeSlot[] | undefined;
        if (!base) {
          const firstErr = results.find((r) => r.error)?.error;
          if (firstErr) throw firstErr;
          setAvailableSlots([]);
          return;
        }
        const key = (s: TimeSlot) => `${s.start_time}-${s.end_time}`;
        const union = new Map<string, boolean>();
        base.forEach((s) => union.set(key(s), Boolean(s.is_available)));
        results.forEach((r) => {
          (r.data || []).forEach((s: TimeSlot) => {
            const k = key(s);
            union.set(k, union.get(k) || Boolean(s.is_available));
          });
        });
        const merged = base.map((s) => ({
          ...s,
          is_available: union.get(key(s)) ?? false,
        }));
        setAvailableSlots(merged);
      }

      // Deselect slot if it became unavailable
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
    } catch (e) {
      console.error(e);
      toast.error("Failed to load time slots");
    } finally {
      setSlotsLoading(false);
    }
  }

  async function searchCustomer() {
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
    } catch (e) {
      console.error(e);
      toast.error("Failed to search customer");
    } finally {
      setSearchingCustomer(false);
    }
  }

  /* =========================
     Selection helpers
     ========================= */
  const handleStationToggle = (id: string) => {
    setSelectedStations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedSlot(null);
  };

  async function filterStationsForSlot(slot: TimeSlot) {
    if (selectedStations.length === 0) return selectedStations;
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
          (s: any) =>
            s.start_time === slot.start_time &&
            s.end_time === slot.end_time &&
            s.is_available
        );
        return { stationId, available: Boolean(match) };
      })
    );
    const availableIds = checks.filter((c) => c.available).map((c) => c.stationId);
    const removed = checks.filter((c) => !c.available).map((c) => c.stationId);
    if (removed.length) {
      const names = stations
        .filter((s) => removed.includes(s.id))
        .map((s) => s.name)
        .join(", ");
      toast.message("Some stations aren't free at this time", {
        description: `Removed: ${names}.`,
      });
    }
    return availableIds;
  }

  async function handleSlotSelect(slot: TimeSlot) {
    if (selectedStations.length > 0) {
      const filtered = await filterStationsForSlot(slot);
      if (filtered.length === 0) {
        toast.error("That time isn't available for the selected stations.");
        setSelectedSlot(null);
        return;
      }
      if (filtered.length !== selectedStations.length) setSelectedStations(filtered);
    }
    setSelectedSlot(slot);
  }

  /* =========================
     Coupons & Pricing
     ========================= */
  const allowedCoupons = [
    "CUEPHORIA25",
    "CUEPHORIA50",
    "NIT99",
    "NIT50",
    "ALMA50",
    "AXEIST",
  ];

  function validateStudentID() {
    return window.confirm(
      "🎓 CUEPHORIA50 is for other college & school students ONLY.\nShow a valid student ID card during your visit for this discount. Apply?"
    );
  }

  function removeCoupon(key: string) {
    setAppliedCoupons((prev) => {
      const c = { ...prev };
      delete c[key];
      return c;
    });
  }

  function applyCoupon(raw: string) {
    const code = (raw || "").toUpperCase().trim();
    if (!allowedCoupons.includes(code)) {
      toast.error("🚫 Invalid coupon code. Please re-check and try again!");
      return;
    }

    const selectedHas8Ball = selectedStations.some(
      (id) => stations.find((s) => s.id === id && s.type === "8ball")
    );
    const selectedHasPS5 = selectedStations.some(
      (id) => stations.find((s) => s.id === id && s.type === "ps5")
    );
    const happyHourActive = isHappyHour(selectedDate, selectedSlot);

    // CUEPHORIA50
    if (code === "CUEPHORIA50") {
      if (!validateStudentID()) return;
      setAppliedCoupons({ all: "CUEPHORIA50" });
      toast.success(
        "📚 CUEPHORIA50 applied: 50% OFF for students with valid ID!\nShow your student ID when you visit! 🤝"
      );
      return;
    }

    // AXEIST
    if (code === "AXEIST") {
      const ok = window.confirm(
        "🥷 AXEIST grants 100% OFF for close friends. Apply?"
      );
      if (!ok) return;
      setAppliedCoupons({ all: "AXEIST" });
      toast.success("🥷 AXEIST applied! 100% OFF — Loyalty matters.");
      return;
    }

    // CUEPHORIA25
    if (code === "CUEPHORIA25") {
      setAppliedCoupons({ all: "CUEPHORIA25" });
      toast.success("🎉 CUEPHORIA25 applied: 25% OFF! Book more, play more! 🕹️");
      return;
    }

    // NIT99
    if (code === "NIT99") {
      if (!selectedHas8Ball) {
        toast.error("🎱 NIT99 applies only to 8-Ball stations.");
        return;
      }
      if (!happyHourActive) {
        toast.error("🕒 NIT99 valid only Mon–Fri 11 AM to 4 PM (Happy Hours).");
        return;
      }
      setAppliedCoupons((prev) => ({ ...prev, ["8ball"]: "NIT99" }));
      toast.success(
        "🎱 NIT99 applied! All 8-Ball stations at ₹99/hour during Happy Hours! ✨"
      );
      return;
    }

    // NIT50 logic
    if (code === "NIT50") {
      if (!(selectedHas8Ball || selectedHasPS5)) {
        toast.error(
          "NIT50 can only be applied to PS5 or 8-Ball stations in your selection."
        );
        return;
      }
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHasPS5) updated["ps5"] = "NIT50";
        if (selectedHas8Ball) updated["8ball"] = prev["8ball"] === "NIT99" ? "NIT99" : "NIT50";
        return updated;
      });
      let msg = "🎓 NIT50 applied! 50% OFF for ";
      if (selectedHasPS5 && selectedHas8Ball) msg += "PS5 & 8-Ball stations!";
      else if (selectedHasPS5) msg += "PS5 stations!";
      else msg += "8-Ball stations!";
      if (selectedHas8Ball && appliedCoupons["8ball"] === "NIT99" && happyHourActive) {
        toast.info("💡 With both NIT50 and NIT99 applied: 8-Ball pool is just ₹99/hr (not 50% off), and PS5 remains at 50% OFF!");
      } else {
        toast.success(msg);
      }
      return;
    }

    // ALMA50
    if (code === "ALMA50") {
      if (!(selectedHas8Ball || selectedHasPS5)) {
        toast.error(
          "ALMA50 can only be applied to PS5 or 8-Ball stations in your selection."
        );
        return;
      }
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHasPS5) updated["ps5"] = "ALMA50";
        if (selectedHas8Ball) updated["8ball"] = "ALMA50";
        return updated;
      });
      let msg = "🏫 ALMA50 applied! 50% OFF for ";
      if (selectedHasPS5 && selectedHas8Ball) msg += "PS5 & 8-Ball stations!";
      else if (selectedHasPS5) msg += "PS5 stations!";
      else msg += "8-Ball stations!";
      toast.success(msg);
      return;
    }
  }

  const handleCouponApply = () => {
    applyCoupon(couponCode);
    setCouponCode("");
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0 || !selectedSlot) return 0;
    return stations
      .filter((s) => selectedStations.includes(s.id))
      .reduce((sum, s) => sum + s.hourly_rate, 0);
  };

  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    if (original === 0) return { total: 0, breakdown: {} as Record<string, number> };
    if (!Object.keys(appliedCoupons).length)
      return { total: 0, breakdown: {} as Record<string, number> };

    if (appliedCoupons["all"]) {
      if (appliedCoupons["all"] === "AXEIST")
        return { total: original, breakdown: { all: original } };
      if (appliedCoupons["all"] === "CUEPHORIA25") {
        const disc = original * 0.25;
        return { total: disc, breakdown: { all: disc } };
      }
      if (appliedCoupons["all"] === "CUEPHORIA50") {
        const disc = original * 0.5;
        return { total: disc, breakdown: { all: disc } };
      }
      return { total: 0, breakdown: {} as Record<string, number> };
    }

    let totalDiscount = 0;
    const breakdown: Record<string, number> = {};

    // NIT99 stacked with NIT50
    if (
      appliedCoupons["8ball"] === "NIT99" &&
      appliedCoupons["ps5"] === "NIT50"
    ) {
      const eightBalls = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "8ball"
      );
      const sum = eightBalls.reduce((x, s) => x + s.hourly_rate, 0);
      const d = sum - eightBalls.length * 99;
      if (d > 0) {
        totalDiscount += d;
        breakdown["8-Ball (NIT99)"] = d;
      }
      const ps5s = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "ps5"
      );
      const sum2 = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
      const d2 = sum2 * 0.5;
      totalDiscount += d2;
      breakdown[`PS5 (NIT50)`] = d2;
    } else {
      if (appliedCoupons["8ball"] === "NIT99") {
        const eightBalls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const sum = eightBalls.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum - eightBalls.length * 99;
        if (d > 0) {
          totalDiscount += d;
          breakdown["8-Ball (NIT99)"] = d;
        }
      }

      if (appliedCoupons["8ball"] === "NIT50" || appliedCoupons["8ball"] === "ALMA50") {
        const balls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const sum = balls.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum * 0.5;
        totalDiscount += d;
        breakdown[`8-Ball (${appliedCoupons["8ball"]})`] = d;
      }

      if (appliedCoupons["ps5"] === "NIT50" || appliedCoupons["ps5"] === "ALMA50") {
        const ps5s = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "ps5"
        );
        const sum = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum * 0.5;
        totalDiscount += d;
        breakdown[`PS5 (${appliedCoupons["ps5"]})`] = d;
      }
    }

    return { total: totalDiscount, breakdown };
  };

  const originalPrice = calculateOriginalPrice();
  const discountObj = calculateDiscount();
  const discount = discountObj.total;
  const discountBreakdown = discountObj.breakdown;
  const finalPrice = Math.max(originalPrice - discount, 0);

  const isCustomerInfoComplete = () =>
    hasSearched && customerNumber.trim() !== "" && customerInfo.name.trim() !== "";
  const isStationSelectionAvailable = () => isCustomerInfoComplete();
  const isTimeSelectionAvailable = () =>
    isStationSelectionAvailable() && selectedStations.length > 0;

  /* =========================
     Create booking (Pay at venue)
     ========================= */
  async function createVenueBooking() {
    setLoading(true);
    try {
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
        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      const couponCodes = Object.values(appliedCoupons).join(",");
      const rows = selectedStations.map((stationId) => ({
        station_id: stationId,
        customer_id: customerId!,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedSlot!.start_time,
        end_time: selectedSlot!.end_time,
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
      if (bookingError) throw bookingError;

      const stationObjects = stations.filter((s) =>
        selectedStations.includes(s.id)
      );
      setBookingConfirmationData({
        bookingId: inserted[0].id.slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: stationObjects.map((s) => s.name),
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: new Date(`2000-01-01T${selectedSlot!.start_time}`).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        ),
        endTime: new Date(`2000-01-01T${selectedSlot!.end_time}`).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        ),
        totalAmount: finalPrice,
        couponCode: couponCodes || undefined,
        discountAmount: discount > 0 ? discount : undefined,
      });
      setShowConfirmationDialog(true);

      // Reset form
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     PhonePe payment
     ========================= */
  const initiatePhonePe = async () => {
    if (finalPrice <= 0) {
      toast.error("Amount must be greater than 0 for online payment.");
      return;
    }
    if (!customerInfo.phone) {
      toast.error("Customer phone is required for payment.");
      return;
    }

    // Store booking data in sessionStorage before payment
    const bookingData = {
      customerInfo,
      selectedStations,
      selectedDate: format(selectedDate, "yyyy-MM-dd"),
      selectedSlot,
      originalPrice,
      discount,
      finalPrice,
      appliedCoupons,
    };
    sessionStorage.setItem('pendingBookingData', JSON.stringify(bookingData));

    const txnId = genTxnId();
    setLoading(true);
    
    try {
      console.log("🚀 Initiating PhonePe payment:", { finalPrice, txnId });
      
      const res = await fetch("/api/phonepe/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: finalPrice,
          customerPhone: customerInfo.phone,
          merchantTransactionId: txnId,
        }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error("Failed to parse response:", raw);
      }

      console.log("📨 PhonePe response:", { status: res.status, ok: res.ok });

      if (res.ok && data?.ok && data?.url) {
        console.log("✅ Redirecting to PhonePe payment page");
        window.location.href = data.url;
        return;
      }

      // Handle errors
      const apiErr = (data && (data.error || data.raw)) || raw || "Unknown error";
      toast.error(`Could not start PhonePe payment: ${apiErr}`);
    } catch (e: any) {
      console.error("💥 Payment initiation error:", e);
      toast.error(`Unable to start payment: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  async function handleConfirm() {
    if (!isCustomerInfoComplete()) {
      toast.error("Please complete customer information first");
      return;
    }
    if (selectedStations.length === 0) {
      toast.error("Please select at least one station");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select a time slot");
      return;
    }
    if (!customerInfo.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (paymentMethod === "venue") {
      await createVenueBooking();
    } else {
      await initiatePhonePe();
    }
  }

  /* =========================
     Manual Payment Status Check
     ========================= */
  const handleManualStatusCheck = async () => {
    const orderId = prompt("If you have an order ID from a previous payment attempt, enter it here to check status:");
    if (!orderId?.trim()) return;
    
    setManualCheckLoading(true);
    try {
      const statusRes = await fetch(`/api/phonepe/status?order=${encodeURIComponent(orderId.trim())}`);
      const statusData = await statusRes.json();
      
      if (statusData.ok) {
        if (statusData.state === 'COMPLETED') {
          toast.success("✅ Payment found and completed! Processing booking...");
          // You could trigger the booking creation flow here if needed
        } else if (statusData.state === 'FAILED') {
          toast.error("❌ Payment failed or was cancelled.");
        } else {
          toast.info(`ℹ️ Payment status: ${statusData.state}`);
        }
      } else {
        toast.error("Order not found or invalid order ID.");
      }
    } catch (error) {
      toast.error("Unable to check payment status. Please try again or contact support.");
    } finally {
      setManualCheckLoading(false);
    }
  };

  /* =========================
     Today's bookings
     ========================= */
  function maskPhone(p?: string) {
    if (!p) return "";
    const s = p.replace(/\D/g, "");
    if (s.length <= 4) return s;
    return `${s.slice(0, 3)}${"X".repeat(Math.max(0, s.length - 5))}${s.slice(-2)}`;
  }

  async function fetchTodaysBookings() {
    setTodayLoading(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_date, start_time, end_time, status, station_id, customer_id"
        )
        .eq("booking_date", todayStr)
        .order("start_time", { ascending: true });

      if (error) throw error;
      if (!bookingsData?.length) {
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
    } catch (e) {
      console.error(e);
      toast.error("Failed to load today's bookings");
    } finally {
      setTodayLoading(false);
    }
  }

  const timeKey = (s: string, e: string) => {
    const start = new Date(`2000-01-01T${s}`);
    const end = new Date(`2000-01-01T${e}`);
    return `${start.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })} — ${end.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
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
        return (
          <span
            className={cn(
              base,
              "bg-blue-500/15 text-blue-300 border border-blue-400/20"
            )}
          >
            confirmed
          </span>
        );
      case "in-progress":
        return (
          <span
            className={cn(
              base,
              "bg-amber-500/15 text-amber-300 border border-amber-400/20"
            )}
          >
            in-progress
          </span>
        );
      case "completed":
        return (
          <span
            className={cn(
              base,
              "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20"
            )}
          >
            completed
          </span>
        );
      case "cancelled":
        return (
          <span
            className={cn(
              base,
              "bg-rose-500/15 text-rose-300 border border-rose-400/20"
            )}
          >
            cancelled
          </span>
        );
      case "no-show":
        return (
          <span
            className={cn(
              base,
              "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20"
            )}
          >
            no-show
          </span>
        );
      default:
        return (
          <span
            className={cn(
              base,
              "bg-zinc-500/15 text-zinc-300 border border-zinc-400/20"
            )}
          >
            {s}
          </span>
        );
    }
  };

  /* =========================
     Render
     ========================= */
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]">
      {/* glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cuephoria-purple/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-cuephoria-blue/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cuephoria-lightpurple/20 blur-3xl" />
      </div>

      <CouponPromotionalPopup onCouponSelect={applyCoupon} />

      {/* Header */}
      <header className="py-10 px-4 sm:px-6 md:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6">
              <img
                src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                alt="Cuephoria Logo"
                className="h-24 drop-shadow-[0_0_25px_rgba(168,85,247,0.15)]"
              />
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-widest uppercase text-gray-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-cuephoria-lightpurple" />
              Premium Gaming Lounge
            </span>

            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-white">
              Book Your Gaming Session
            </h1>
            <p className="mt-2 text-lg text-gray-300/90 max-w-2xl text-center">
              Reserve PlayStation 5 or Pool Table sessions at Cuephoria
            </p>

            {/* LOB badge */}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300 backdrop-blur-md">
              <span className="font-semibold tracking-wide">Line of Business:</span>
              <span>
                Amusement & Gaming Lounge Services (time-based PS5 & 8-Ball rentals)
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-14 relative z-10">
        {/* About */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
          <h2 className="mb-1 text-base font-semibold text-white">About Cuephoria</h2>
          <p>
            Cuephoria offers <span className="font-medium">time-based rentals</span> of
            PlayStation 5 stations and 8-Ball pool tables. Book 60-minute sessions
            for single or multiple stations.
          </p>
          <p className="mt-2 text-gray-400">
            <span className="font-medium text-gray-200">Pricing:</span> All prices are
            displayed in <span className="ml-1 font-semibold">INR (₹)</span>.
          </p>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Customer */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-purple/20 ring-1 ring-white/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-cuephoria-purple" />
                  </div>
                  Step 1: Customer Information
                  {isCustomerInfoComplete() && (
                    <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-cuephoria-purple/10 border border-cuephoria-purple/20 rounded-xl p-3">
                  <p className="text-sm text-cuephoria-purple/90 font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Please complete customer
                    information to proceed with booking
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={customerNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerNumber(val);
                      setHasSearched(false);
                      setIsReturningCustomer(false);
                      setCustomerInfo((prev) => ({
                        ...prev,
                        name: "",
                        email: "",
                        phone: val,
                      }));
                    }}
                    placeholder="Enter phone number"
                    className="bg-black/30 border-white/10 text-white placeholder:text-gray-400 rounded-xl flex-1"
                  />
                  <Button
                    onClick={searchCustomer}
                    disabled={searchingCustomer}
                    className="rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple"
                  >
                    {searchingCustomer ? "Searching..." : "Search"}
                  </Button>
                </div>

                {hasSearched && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-300 uppercase">
                        Full Name{" "}
                        {isReturningCustomer && (
                          <CheckCircle className="inline h-4 w-4 text-green-400 ml-1" />
                        )}
                      </Label>
                      <Input
                        value={customerInfo.name}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter your full name"
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                        disabled={isReturningCustomer}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-300 uppercase">
                        Email (Optional)
                      </Label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="Enter your email address"
                        className="mt-1 bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                        disabled={isReturningCustomer}
                      />
                    </div>
                  </div>
                )}

                {isCustomerInfoComplete() && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" /> Customer information complete!
                    You can now proceed to station selection.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Stations */}
            <Card className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-white/10 bg-gradient-to-br from-cuephoria-blue/25 to-transparent">
                      {!isStationSelectionAvailable() ? (
                        <Lock className="h-4 w-4 text-gray-500" />
                      ) : (
                        <MapPin className="h-4 w-4 text-cuephoria-blue" />
                      )}
                    </div>
                    <CardTitle className="m-0 p-0 text-white">
                      Step 2: Select Gaming Stations
                    </CardTitle>
                  </div>
                  {isStationSelectionAvailable() && selectedStations.length > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {selectedStations.length} selected
                    </div>
                  )}
                </div>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </CardHeader>
              <CardContent className="relative pt-3">
                <div
                  className={cn(
                    "grid grid-cols-3 gap-2 sm:gap-3 mb-4",
                    !isStationSelectionAvailable() && "pointer-events-none"
                  )}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("all")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "all"
                        ? "bg-white/12 text-gray-100"
                        : "bg-transparent text-gray-300"
                    )}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("ps5")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "ps5"
                        ? "bg-cuephoria-purple/15 text-cuephoria-purple"
                        : "bg-transparent text-cuephoria-purple"
                    )}
                  >
                    PS5
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("8ball")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "8ball"
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-transparent text-emerald-300"
                    )}
                  >
                    8-Ball
                  </Button>
                </div>

                {!isStationSelectionAvailable() ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">
                      Complete customer information to unlock station selection
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 p-3 sm:p-4 bg-white/6">
                    <StationSelector
                      stations={
                        stationType === "all"
                          ? stations
                          : stations.filter((s) => s.type === stationType)
                      }
                      selectedStations={selectedStations}
                      onStationToggle={handleStationToggle}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Time */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-cuephoria-lightpurple/20 ring-1 ring-white/10 flex items-center justify-center">
                    {!isTimeSelectionAvailable() ? (
                      <Lock className="h-4 w-4 text-gray-500" />
                    ) : (
                      <CalendarIcon className="h-4 w-4 text-cuephoria-lightpurple" />
                    )}
                  </div>
                  Step 3: Choose Date & Time
                  {isTimeSelectionAvailable() && selectedSlot && (
                    <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isTimeSelectionAvailable() ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">
                      Select stations to unlock date and time selection
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-base font-medium text-gray-200">
                        Choose Date
                      </Label>
                      <div className="mt-2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          disabled={(date) => date < new Date()}
                          className={cn(
                            "rounded-xl border bg-black/30 border-white/10 pointer-events-auto"
                          )}
                        />
                      </div>
                    </div>
                    {selectedStations.length > 0 && (
                      <div>
                        <Label className="text-base font-medium text-gray-200">
                          Available Time Slots
                        </Label>
                        <div className="mt-2">
                          <TimeSlotPicker
                            slots={availableSlots}
                            selectedSlot={selectedSlot}
                            onSlotSelect={handleSlotSelect}
                            loading={slotsLoading}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE: Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 bg-white/10 backdrop-blur-xl border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStations.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase">
                      Selected Stations
                    </Label>
                    <div className="mt-2 space-y-1">
                      {selectedStations.map((id) => {
                        const s = stations.find((x) => x.id === id);
                        if (!s) return null;
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-cuephoria-purple/20 border border-white/10 flex items-center justify-center">
                              {s.type === "ps5" ? (
                                <Gamepad2 className="h-3.5 w-3.5 text-cuephoria-purple" />
                              ) : (
                                <Timer className="h-3.5 w-3.5 text-green-400" />
                              )}
                            </div>
                            <Badge className="bg-white/5 border-white/10 text-gray-200 rounded-full px-2.5 py-1">
                              {s.name}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedDate && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase">
                      Date
                    </Label>
                    <p className="mt-1 text-sm text-gray-200">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase">
                      Time
                    </Label>
                    <p className="mt-1 text-sm text-gray-200">
                      {new Date(`2000-01-01T${selectedSlot.start_time}`).toLocaleTimeString(
                        "en-US",
                        { hour: "numeric", minute: "2-digit", hour12: true }
                      )}{" "}
                      —{" "}
                      {new Date(`2000-01-01T${selectedSlot.end_time}`).toLocaleTimeString(
                        "en-US",
                        { hour: "numeric", minute: "2-digit", hour12: true }
                      )}
                    </p>
                  </div>
                )}

                {/* Coupon */}
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase">
                    Coupon Code
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 rounded-xl flex-1"
                    />
                    <Button
                      onClick={handleCouponApply}
                      size="sm"
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    All discounts and totals are calculated in INR (₹).
                  </p>
                  <p className="mt-2 text-xs text-cuephoria-lightpurple">
                    📝 Coupon rules:<br />
                    NIT50/ALMA50: 50% off for NIT Trichy students;<br />
                    NIT99: 8-Ball @ ₹99/hr only Mon–Fri 11 AM–4 PM;<br />
                    CUEPHORIA50: 50% off for students (ID required);<br />
                    CUEPHORIA25: 25% off for everyone!
                  </p>

                  {Object.entries(appliedCoupons).length > 0 && (
                    <div className="mt-2 space-y-2">
                      {Object.entries(appliedCoupons).map(([key, val]) => {
                        let emoji = "🏷️";
                        if (val === "NIT99") emoji = "🎱";
                        else if (val === "NIT50") emoji = "🎓";
                        else if (val === "CUEPHORIA25") emoji = "🎉";
                        else if (val === "CUEPHORIA50") emoji = "📚";
                        else if (val === "ALMA50") emoji = "🏫";
                        else if (val === "AXEIST") emoji = "🥷";
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between px-4 py-2 rounded-xl shadow-sm font-semibold"
                            style={{
                              background: "linear-gradient(90deg,#231743 10%,#181121 100%)",
                              border: "1px solid #A37CFF",
                              color: "#F7CBFF",
                              letterSpacing: "1.5px"
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{emoji}</span>
                              <span className="font-extrabold uppercase tracking-widest">{val}</span>
                              <span className="ml-2 text-xs font-semibold text-green-400">
                                Applied!
                              </span>
                            </div>
                            <button
                              onClick={() => removeCoupon(key)}
                              aria-label="Remove coupon"
                              className="ml-2 p-1 hover:bg-[#3B2159] rounded-full"
                            >
                              <X className="h-4 w-4 text-purple-200" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div className="mt-2">
                  <Label className="text-xs font-semibold text-gray-400 uppercase">
                    Payment Method
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("venue")}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm border",
                        paymentMethod === "venue"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-black/20 border-white/10 text-gray-300"
                      )}
                    >
                      Pay at Venue
                    </button>
                    <button
                      onClick={() => setPaymentMethod("phonepe")}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm border inline-flex items-center justify-center gap-2",
                        paymentMethod === "phonepe"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-black/20 border-white/10 text-gray-300"
                      )}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay Online (PhonePe)
                    </button>
                  </div>
                  {paymentMethod === "phonepe" && (
                    <p className="mt-2 text-[11px] text-gray-400">
                      You'll be redirected to PhonePe. Booking is created only after
                      payment success.
                    </p>
                  )}
                </div>

                {/* Totals */}
                {originalPrice > 0 && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm text-gray-300">Subtotal</Label>
                        <span className="text-sm text-gray-200">
                          {INR(originalPrice)}
                        </span>
                      </div>

                      {discount > 0 && (
                        <>
                          <div className="border p-2 rounded bg-black/10 text-green-400">
                            <Label className="font-semibold text-xs uppercase">
                              Discount Breakdown
                            </Label>
                            <ul className="list-disc ml-5 mt-1 text-sm">
                              {Object.entries(discountBreakdown).map(([k, v]) => (
                                <li key={k}>
                                  {k}: -{INR(v)}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex justify-between items-center">
                            <Label className="text-sm text-green-400">
                              Total Discount
                            </Label>
                            <span className="text-sm text-green-400">-{INR(discount)}</span>
                          </div>
                        </>
                      )}

                      <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold text-gray-100">
                          Total Amount
                        </Label>
                        <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">
                          {INR(finalPrice)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={handleConfirm}
                  disabled={
                    !selectedSlot || selectedStations.length === 0 || !customerNumber || loading
                  }
                  className="w-full rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple"
                  size="lg"
                >
                  {loading
                    ? paymentMethod === "phonepe"
                      ? "Starting Payment..."
                      : "Creating Booking..."
                    : paymentMethod === "phonepe"
                    ? "Confirm & Pay (PhonePe)"
                    : "Confirm Booking"}
                </Button>

                {/* Manual status check button */}
                <Button
                  onClick={handleManualStatusCheck}
                  disabled={manualCheckLoading}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 rounded-xl border-white/20 text-gray-300 hover:bg-white/5"
                >
                  {manualCheckLoading ? "Checking..." : "Check Payment Status"}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  All prices are shown in <span className="font-semibold">INR (₹)</span>.{" "}
                  {paymentMethod === "phonepe"
                    ? "You will complete payment securely on PhonePe."
                    : "Payment will be collected at the venue."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Policy summaries */}
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold mb-2">
              Terms & Conditions (Summary)
            </h3>
            <ul className="ml-5 list-disc text-sm text-gray-300 space-y-1.5">
              <li>Bookings are for 60-minute time slots; extensions subject to availability.</li>
              <li>Arrive on time; late arrivals may reduce play time without fee adjustment.</li>
              <li>Damage to equipment may incur charges as per in-store policy.</li>
              <li>Management may refuse service in cases of misconduct or safety concerns.</li>
              <li>All prices are in <strong>INR (₹)</strong>.</li>
            </ul>
            <button
              onClick={() => {
                setLegalDialogType("terms");
                setShowLegalDialog(true);
              }}
              className="mt-3 text-sm text-cuephoria-lightpurple hover:underline"
            >
              View full Terms & Conditions
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold mb-2">Privacy Policy (Summary)</h3>
            <ul className="ml-5 list-disc text-sm text-gray-300 space-y-1.5">
              <li>We collect minimal personal data (name, phone, optional email).</li>
              <li>Data is stored securely and used only for bookings/updates.</li>
              <li>No selling of data; limited sharing only to fulfill your booking.</li>
              <li>Contact us to correct or delete your data.</li>
            </ul>
            <button
              onClick={() => {
                setLegalDialogType("privacy");
                setShowLegalDialog(true);
              }}
              className="mt-3 text-sm text-cuephoria-lightpurple hover:underline"
            >
              View full Privacy Policy
            </button>
          </div>
        </section>

        {/* Today's bookings */}
        <div className="mt-10">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-cuephoria-lightpurple" />
                Today's Bookings
              </CardTitle>
              <span className="text-xs text-gray-300 rounded-full border border-white/10 px-2 py-0.5">
                {todayRows.length} total
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayLoading ? (
                <div className="h-12 rounded-md bg-white/5 animate-pulse" />
              ) : groupedByTime.length === 0 ? (
                <div className="text-sm text-gray-400">No bookings today.</div>
              ) : (
                groupedByTime.map(([timeLabel, rows]) => (
                  <details
                    key={timeLabel}
                    className="group rounded-xl border border-white/10 bg-black/30 open:bg-black/40"
                  >
                    <summary className="list-none cursor-pointer select-none px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-200">
                        <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                        <span className="font-medium">{timeLabel}</span>
                      </div>
                      <span className="text-xs text-gray-300 rounded-full border border-white/10 px-2 py-0.5">
                        {rows.length} booking{rows.length !== 1 ? "s" : ""}
                      </span>
                    </summary>
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 overflow-x-auto">
                      <table className="min-w-[520px] w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400">
                            <th className="py-2 pr-3 font-medium">Customer</th>
                            <th className="py-2 pr-3 font-medium">Station</th>
                            <th className="py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id} className="border-t border-white/10">
                              <td className="py-2 pr-3">
                                <div className="text-gray-100">{r.customerName}</div>
                                <div className="text-xs text-gray-400">{r.customerPhone}</div>
                              </td>
                              <td className="py-2 pr-3">
                                <Badge className="bg-white/5 border-white/10 text-gray-200 rounded-full">
                                  {r.stationName}
                                </Badge>
                              </td>
                              <td className="py-2">{statusChip(r.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 px-4 sm:px-6 md:px-8 border-t border-white/10 backdrop-blur-md bg-black/30 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img
                src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                alt="Cuephoria Logo"
                className="h-8 mr-3"
              />
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} Cuephoria. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-400 text-sm">
                <Clock className="h-4 w-4 text-gray-400 mr-1.5" />
                <span>Book anytime, anywhere</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-wrap justify-center md:justify-start gap-6">
              <button
                onClick={() => (setLegalDialogType("terms"), setShowLegalDialog(true))}
                className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1 transition"
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => (setLegalDialogType("privacy"), setShowLegalDialog(true))}
                className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1 transition"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => (setLegalDialogType("contact"), setShowLegalDialog(true))}
                className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1 transition"
              >
                Contact Us
              </button>
              <button
                onClick={() => setShowRefundDialog(true)}
                className="text-gray-400 hover:text-white hover:underline/20 text-sm flex items-center gap-1 transition"
              >
                Refund Policy
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <a href="tel:+918637625155" className="hover:text-white transition-colors">
                  +91 86376 25155
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <a
                  href="mailto:contact@cuephoria.in"
                  className="hover:text-white transition-colors"
                >
                  contact@cuephoria.in
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking confirmation dialog */}
      {bookingConfirmationData && (
        <BookingConfirmationDialog
          isOpen={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          bookingData={bookingConfirmationData}
        />
      )}

      {/* Legal dialog */}
      <LegalDialog
        isOpen={showLegalDialog}
        onClose={() => setShowLegalDialog(false)}
        type={legalDialogType}
      />

      {/* Refund policy modal */}
      {showRefundDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c13] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Refund & Cancellation Policy
              </h3>
              <button
                aria-label="Close refund policy"
                onClick={() => setShowRefundDialog(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="prose prose-invert max-w-none text-sm text-gray-300">
              <p className="text-gray-400">
                This policy outlines how a booking for a gaming service made through the
                Platform can be canceled or refunded.
              </p>

              <h4 className="mt-4 text-white">Cancellations</h4>
              <ul className="ml-5 list-disc">
                <li>Requests must be made within <strong>1 day</strong> of placing the booking.</li>
                <li>Cancellation may not be possible if the session is already confirmed or about to commence.</li>
              </ul>

              <h4 className="mt-4 text-white">Non-Cancellable Services</h4>
              <ul className="ml-5 list-disc">
                <li>No cancellations for time-sensitive or non-refundable bookings.</li>
                <li>Refunds/rescheduling may be considered if the session wasn't provided as described.</li>
              </ul>

              <h4 className="mt-4 text-white">Service Quality Issues</h4>
              <ul className="ml-5 list-disc">
                <li>Report issues within <strong>1 day</strong> of the scheduled session.</li>
              </ul>

              <h4 className="mt-4 text-white">Refund Processing</h4>
              <ul className="ml-5 list-disc">
                <li>If approved, refunds are processed within <strong>3 days</strong> to the original payment method.</li>
              </ul>

              <p className="mt-4 text-xs text-gray-400">
                Need help? Call{" "}
                <a className="underline hover:text-white" href="tel:+918637625155">
                  +91 86376 25155
                </a>{" "}
                or email{" "}
                <a
                  className="ml-1 underline hover:text-white"
                  href="mailto:contact@cuephoria.in"
                >
                  contact@cuephoria.in
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
