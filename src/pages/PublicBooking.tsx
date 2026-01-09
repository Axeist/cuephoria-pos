import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import OnlinePaymentPromoDialog from "@/components/OnlinePaymentPromoDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Headset,
  Shield,
  CheckCircle2,
  Zap,
  BadgeCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  Instagram,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse, getDay } from "date-fns";

/* =========================
   Types
   ========================= */
type StationType = "ps5" | "8ball" | "vr";
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
  status?: 'available' | 'booked' | 'elapsed';
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
  const day = getDay(date);
  const startHour = Number(slot.start_time.split(":")[0]);
  return day >= 1 && day <= 5 && startHour >= 11 && startHour < 16;
};

// ✅ NEW: Phone number normalization
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// ✅ NEW: Generate unique Customer ID
const generateCustomerID = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  const phoneHash = normalized.slice(-4);
  return `CUE${phoneHash}${timestamp}`;
};

// ✅ NEW: Validate Indian phone number
const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length !== 10) {
    return { valid: false, error: 'Phone number must be exactly 10 digits' };
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalized)) {
    return { valid: false, error: 'Please enter a valid Indian mobile number (starting with 6, 7, 8, or 9)' };
  }

  return { valid: true };
};

const getSlotDuration = (stationType: StationType) => {
  return stationType === 'vr' ? 15 : 60;
};

const getBookingDuration = (stationIds: string[], stations: Station[]) => {
  const hasVR = stationIds.some(id => 
    stations.find(s => s.id === id && s.type === 'vr')
  );
  return hasVR ? 15 : 60;
};

/* =========================
   Component
   ========================= */
export default function PublicBooking() {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationType, setStationType] = useState<"all" | StationType>("all");
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  // Generate a unique session ID for this booking session
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  const [customerNumber, setCustomerNumber] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
  });
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Auto-search when phone number reaches 10 digits
  useEffect(() => {
    const normalized = normalizePhoneNumber(customerNumber);
    if (normalized.length === 10 && !hasSearched) {
      const validation = validatePhoneNumber(normalized);
      if (validation.valid) {
        searchCustomer();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerNumber]);

  const [appliedCoupons, setAppliedCoupons] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"venue" | "razorpay">("venue");
  const [loading, setLoading] = useState(false);

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [bookingConfirmationData, setBookingConfirmationData] = useState<any>(null);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [legalDialogType, setLegalDialogType] = useState<
    "terms" | "privacy" | "contact" | "shipping"
  >("terms");
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [todayRows, setTodayRows] = useState<TodayBookingRow[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);
  const [showOnlinePaymentPromo, setShowOnlinePaymentPromo] = useState(false);
  const [showPaymentWarning, setShowPaymentWarning] = useState(false);
  const [showInstagramFollowDialog, setShowInstagramFollowDialog] = useState(false);
  const [instagramLinkClicked, setInstagramLinkClicked] = useState(false);
  const [showFollowConfirmation, setShowFollowConfirmation] = useState(false);
  const [expandedCoupons, setExpandedCoupons] = useState<Record<string, boolean>>({});
  const [pendingCoupon, setPendingCoupon] = useState<{ code: string; type: "all" | "per-station"; stationTypes?: { ps5?: string; "8ball"?: string; vr?: string } } | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<"processing" | "success" | "failed" | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>("");

  // Old PhonePe payment handling removed - now using Razorpay with separate success page

  useEffect(() => {
    fetchStations();
    fetchTodaysBookings();
  }, []);

  useEffect(() => {
    if (appliedCoupons["8ball"] === "HH99" && !isHappyHour(selectedDate, selectedSlot)) {
      setAppliedCoupons((prev) => {
        const copy = { ...prev };
        delete copy["8ball"];
        toast.error("❌ HH99 removed: valid only Mon–Fri 11 AM–4 PM");
        return copy;
      });
    }
    if (appliedCoupons["ps5"] === "HH99" && !isHappyHour(selectedDate, selectedSlot)) {
      setAppliedCoupons((prev) => {
        const copy = { ...prev };
        delete copy["ps5"];
        toast.error("❌ HH99 removed: valid only Mon–Fri 11 AM–4 PM");
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
    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedStations, selectedDate]);

  useEffect(() => {
    if (selectedStations.length > 0 && selectedDate) fetchAvailableSlots();
    else {
      setAvailableSlots([]);
      setSelectedSlot(null);
      setSelectedSlots([]);
    }
  }, [selectedStations, selectedDate]);

  // Check for booking confirmation from payment success redirect
  useEffect(() => {
    const bookingSuccess = searchParams.get("booking_success");
    
    if (bookingSuccess === "true") {
      const confirmationData = localStorage.getItem("bookingConfirmation");
      if (confirmationData) {
        try {
          const data = JSON.parse(confirmationData);
          setBookingConfirmationData(data);
          setShowConfirmationDialog(true);
          // Clear the data after showing
          localStorage.removeItem("bookingConfirmation");
          // Clean up URL
          window.history.replaceState({}, "", "/public/booking");
          toast.success("🎉 Booking confirmed! Get ready to game! 🎮");
        } catch (e) {
          console.error("Error parsing booking confirmation:", e);
        }
      }
    }
  }, [searchParams]);

  // Cleanup: Release slot blocks when component unmounts or slots are deselected
  useEffect(() => {
    return () => {
      // Release any unconfirmed blocks for this session when component unmounts
      if (selectedSlots.length > 0 && selectedStations.length > 0) {
        const releaseBlocks = async () => {
          for (const slot of selectedSlots) {
            await supabase
              .from("slot_blocks")
              .delete()
              .in("station_id", selectedStations)
              .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
              .eq("start_time", slot.start_time)
              .eq("end_time", slot.end_time)
              .eq("session_id", sessionId)
              .eq("is_confirmed", false);
          }
        };
        releaseBlocks().catch(console.error);
      }
    };
  }, [selectedSlots, selectedStations, selectedDate, sessionId]);

  async function fetchStations() {
    try {
      const { data, error } = await supabase
        .from("stations")
        .select("id, name, type, hourly_rate")
        .order("name");
      if (error) throw error;
      setStations((data || []).map(station => ({
        ...station,
        type: station.type as StationType
      })));
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
      const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
      
      const hasVR = selectedStations.some(id => 
        stations.find(s => s.id === id && s.type === 'vr')
      );
      const hasNonVR = selectedStations.some(id => 
        stations.find(s => s.id === id && s.type !== 'vr')
      );
      
      if (hasVR && hasNonVR) {
        toast.error("VR sessions cannot be booked with other station types due to different time intervals (VR: 15 min, Others: 60 min)");
        setSelectedStations(selectedStations.filter(id => 
          stations.find(s => s.id === id && s.type === 'vr')
        ));
        return;
      }
      
      const slotDuration = hasVR ? 15 : 60;
      
      if (selectedStations.length === 1) {
        const { data, error } = await supabase.rpc("get_available_slots", {
          p_date: dateStr,
          p_station_id: selectedStations[0],
          p_slot_duration: slotDuration,
        });
        if (error) throw error;
        
        let slotsToSet = data || [];
        
        if (isToday) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          slotsToSet = slotsToSet.map((slot: TimeSlot) => {
            const [slotHour, slotMinute] = slot.start_time.split(':').map(Number);
            
            const isPast = (slotHour < currentHour) || 
                          (slotHour === currentHour && slotMinute <= currentMinute);
            
            if (isPast) {
              return {
                ...slot,
                is_available: false,
                status: 'elapsed' as const
              };
            }
            return slot;
          });
        }
        
        setAvailableSlots(slotsToSet);
      } else {
        const results = await Promise.all(
          selectedStations.map((id) =>
            supabase.rpc("get_available_slots", {
              p_date: dateStr,
              p_station_id: id,
              p_slot_duration: slotDuration,
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
        let merged = base.map((s) => ({
          ...s,
          is_available: union.get(key(s)) ?? false,
        }));
        
        if (isToday) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          merged = merged.map((slot) => {
            const [slotHour, slotMinute] = slot.start_time.split(':').map(Number);
            
            const isPast = (slotHour < currentHour) || 
                          (slotHour === currentHour && slotMinute <= currentMinute);
            
            if (isPast) {
              return {
                ...slot,
                is_available: false,
                status: 'elapsed' as const
              };
            }
            return slot;
          });
        }
        
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
        setSelectedSlots([]);
      }
      
      // Also clear selectedSlots that are no longer available
      setSelectedSlots(prev => prev.filter(slot =>
        availableSlots.some(
          (s) =>
            s.start_time === slot.start_time &&
            s.end_time === slot.end_time &&
            s.is_available
        )
      ));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load time slots");
    } finally {
      setSlotsLoading(false);
    }
  }

  // ✅ UPDATED: searchCustomer with phone normalization
  async function searchCustomer() {
    if (!customerNumber.trim()) {
      toast.error("Please enter a customer number");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(customerNumber);
    
    const validation = validatePhoneNumber(normalizedPhone);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid phone number");
      return;
    }

    setSearchingCustomer(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, custom_id")
        .eq("phone", normalizedPhone)
        .maybeSingle();
        
      if (error && (error as any).code !== "PGRST116") throw error;

      if (data) {
        setIsReturningCustomer(true);
        setCustomerInfo({
          id: data.id,
          name: data.name,
          phone: normalizedPhone,
          email: data.email || "",
        });
        toast.success(`Welcome back, ${data.name}! 🎮`);
      } else {
        setIsReturningCustomer(false);
        setCustomerInfo({ 
          name: "", 
          phone: normalizedPhone,
          email: "" 
        });
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

  const handleStationToggle = (id: string) => {
    const station = stations.find(s => s.id === id);
    if (!station) return;
    
    if (!selectedStations.includes(id)) {
      const hasVR = selectedStations.some(stationId => 
        stations.find(s => s.id === stationId && s.type === 'vr')
      );
      const hasNonVR = selectedStations.some(stationId => 
        stations.find(s => s.id === stationId && s.type !== 'vr')
      );
      
      if ((station.type === 'vr' && hasNonVR) || (station.type !== 'vr' && hasVR)) {
        toast.error("Cannot mix VR stations with other types due to different time intervals");
        return;
      }
    }
    
    setSelectedStations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedSlot(null);
    setSelectedSlots([]);
  };

  async function filterStationsForSlot(slot: TimeSlot) {
    if (selectedStations.length === 0) return selectedStations;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    
    const hasVR = selectedStations.some(id => 
      stations.find(s => s.id === id && s.type === 'vr')
    );
    const slotDuration = hasVR ? 15 : 60;
    
    const checks = await Promise.all(
      selectedStations.map(async (stationId) => {
        const { data, error } = await supabase.rpc("get_available_slots", {
          p_date: dateStr,
          p_station_id: stationId,
          p_slot_duration: slotDuration,
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
    if (slot.status === 'elapsed') {
      toast.error("Cannot select a time slot that has already passed.");
      return;
    }
    
    // Check if slot is already selected (for multiple selection)
    const isAlreadySelected = selectedSlots.some(
      s => s.start_time === slot.start_time && s.end_time === slot.end_time
    );
    
    if (isAlreadySelected) {
      // Deselect the slot
      setSelectedSlots(prev => {
        const updated = prev.filter(
          s => !(s.start_time === slot.start_time && s.end_time === slot.end_time)
        );
        // If we removed the current selectedSlot, set it to the first remaining slot (if any)
        if (selectedSlot?.start_time === slot.start_time) {
          if (updated.length > 0) {
            setSelectedSlot(updated[0]);
          } else {
            setSelectedSlot(null);
          }
        }
        return updated;
      });
      return;
    }
    
    if (selectedStations.length > 0) {
      const filtered = await filterStationsForSlot(slot);
      if (filtered.length === 0) {
        toast.error("That time isn't available for the selected stations.");
        return;
      }
      if (filtered.length !== selectedStations.length) setSelectedStations(filtered);
    }
    
    // Add to multiple selection
    setSelectedSlots(prev => [...prev, slot]);
    // Also set as single selection for backward compatibility
    setSelectedSlot(slot);
  }

  const allowedCoupons = [
    "CUEPHORIA20",
    "CUEPHORIA35",
    "HH99",
    "NIT35",
    "AAVEG50",
    "AXEIST",
    "TEST210198$",
    "GAMEINSIDER50",
  ];

  function validateStudentID() {
    return window.confirm(
      "🎓 CUEPHORIA35 is for other college & school students ONLY.\nShow a valid student ID card during your visit for this discount. Apply?"
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
    const selectedHasVR = selectedStations.some(
      (id) => stations.find((s) => s.id === id && s.type === "vr")
    );
    const happyHourActive = isHappyHour(selectedDate, selectedSlot);

    // Check if customer is new (no customerInfo.id means new customer)
    const isNewCustomer = !customerInfo.id;
    
    // Helper function to check if Instagram follow dialog should be shown
    const shouldShowInstagramDialog = (couponCode: string) => {
      if (!isNewCustomer) return false; // Only for new customers
      
      // Check if any other dialog is open - don't show Instagram popup if so
      const isAnyDialogOpen = 
        showConfirmationDialog || 
        showLegalDialog || 
        showRefundDialog || 
        showOnlinePaymentPromo || 
        showPaymentWarning ||
        showFollowConfirmation;
      
      if (isAnyDialogOpen) {
        return false; // Don't show popup when other dialogs are open
      }
      
      return true;
    };

    // Helper function to apply coupon after Instagram follow
    const applyCouponAfterInstagram = (couponCode: string, couponType: "all" | "per-station", stationTypes?: { ps5?: string; "8ball"?: string; vr?: string }) => {
      if (couponType === "all") {
        setAppliedCoupons({ all: couponCode });
      } else if (stationTypes) {
        setAppliedCoupons((prev) => {
          let updated = { ...prev };
          if (stationTypes.ps5) updated["ps5"] = stationTypes.ps5;
          if (stationTypes["8ball"]) updated["8ball"] = stationTypes["8ball"];
          if (stationTypes.vr) updated["vr"] = stationTypes.vr;
          return updated;
        });
      }
    };

    if (code === "CUEPHORIA35") {
      if (!validateStudentID()) return;
      
      // For new customers, show Instagram follow dialog
      if (shouldShowInstagramDialog("CUEPHORIA35")) {
        setShowInstagramFollowDialog(true);
        setInstagramLinkClicked(false);
        // Store coupon info to apply after Instagram follow
        setPendingCoupon({ code: "CUEPHORIA35", type: "all" });
        return;
      }
      
      setAppliedCoupons({ all: "CUEPHORIA35" });
      toast.success(
        "📚 CUEPHORIA35 applied: 35% OFF for students with valid ID!\nShow your student ID when you visit! 🤝"
      );
      return;
    }

    if (code === "AXEIST") {
      const ok = window.confirm(
        "🥷 AXEIST grants 100% OFF for close friends. Apply?"
      );
      if (!ok) return;
      setAppliedCoupons({ all: "AXEIST" });
      toast.success("🥷 AXEIST applied! 100% OFF — Loyalty matters.");
      return;
    }

    if (code === "CUEPHORIA20") {
      // For new customers, show Instagram follow dialog
      if (shouldShowInstagramDialog("CUEPHORIA20")) {
        setShowInstagramFollowDialog(true);
        setInstagramLinkClicked(false);
        // Store coupon info to apply after Instagram follow
        setPendingCoupon({ code: "CUEPHORIA20", type: "all" });
        return;
      }
      
      setAppliedCoupons({ all: "CUEPHORIA20" });
      toast.success("🎉 CUEPHORIA20 applied: 20% OFF! Book more, play more! 🕹️");
      return;
    }

    if (code === "HH99") {
      if (selectedHasVR) {
        toast.error("⏰ HH99 is not applicable to VR gaming stations.");
        return;
      }
      if (!(selectedHas8Ball || selectedHasPS5)) {
        toast.error("⏰ HH99 applies to PS5 and 8-Ball stations during Happy Hours.");
        return;
      }
      if (!happyHourActive) {
        toast.error("🕒 HH99 valid only Mon–Fri 11 AM to 4 PM (Happy Hours).");
        return;
      }
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHas8Ball) updated["8ball"] = "HH99";
        if (selectedHasPS5) updated["ps5"] = "HH99";
        return updated;
      });
      toast.success(
        "⏰ HH99 applied! PS5 & 8-Ball stations at ₹99/hour during Happy Hours! ✨"
      );
      return;
    }

    if (code === "NIT35") {
      if (!(selectedHas8Ball || selectedHasPS5 || selectedHasVR)) {
        toast.error(
          "NIT35 can be applied to PS5, 8-Ball, or VR stations in your selection."
        );
        return;
      }
      
      // For new customers, show Instagram follow dialog
      if (shouldShowInstagramDialog("NIT35")) {
        setShowInstagramFollowDialog(true);
        setInstagramLinkClicked(false);
        // Store coupon info to apply after Instagram follow
        const stationTypes: { ps5?: string; "8ball"?: string; vr?: string } = {};
        if (selectedHasPS5) stationTypes.ps5 = "NIT35";
        if (selectedHas8Ball) stationTypes["8ball"] = appliedCoupons["8ball"] === "HH99" ? "HH99" : "NIT35";
        if (selectedHasVR) stationTypes.vr = "NIT35";
        setPendingCoupon({ code: "NIT35", type: "per-station", stationTypes });
        return;
      }
      
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHasPS5) updated["ps5"] = "NIT35";
        if (selectedHas8Ball) updated["8ball"] = prev["8ball"] === "HH99" ? "HH99" : "NIT35";
        if (selectedHasVR) updated["vr"] = "NIT35";
        return updated;
      });
      let msg = "🎓 NIT35 applied! 35% OFF for ";
      const types = [];
      if (selectedHasPS5) types.push("PS5");
      if (selectedHas8Ball) types.push("8-Ball");
      if (selectedHasVR) types.push("VR");
      msg += types.join(" & ") + " stations!";
      toast.success(msg);
      return;
    }

    if (code === "AAVEG50") {
      if (!(selectedHas8Ball || selectedHasPS5 || selectedHasVR)) {
        toast.error(
          "AAVEG50 can be applied to PS5, 8-Ball, or VR stations in your selection."
        );
        return;
      }
      setAppliedCoupons((prev) => {
        let updated = { ...prev };
        if (selectedHasPS5) updated["ps5"] = "AAVEG50";
        if (selectedHas8Ball) updated["8ball"] = "AAVEG50";
        if (selectedHasVR) updated["vr"] = "AAVEG50";
        return updated;
      });
      let msg = "🏫 AAVEG50 applied! 50% OFF for ";
      const types = [];
      if (selectedHasPS5) types.push("PS5");
      if (selectedHas8Ball) types.push("8-Ball");
      if (selectedHasVR) types.push("VR");
      msg += types.join(" & ") + " stations!";
      toast.success(msg);
      return;
    }

    if (code === "TEST210198$") {
      const ok = window.confirm(
        "🧪 TEST210198$ is a test coupon that sets the transaction value to ₹1 for payment flow testing. Apply?"
      );
      if (!ok) return;
      setAppliedCoupons({ all: "TEST210198$" });
      toast.success("🧪 TEST210198$ applied! Transaction value set to ₹1 for testing.");
      return;
    }

    if (code === "GAMEINSIDER50") {
      const ok = window.confirm(
        "🎮 GAMEINSIDER50 - 50% OFF Collaboration Coupon\n\n" +
        "⚠️ IMPORTANT: This coupon will be applied only after enrollment verification.\n\n" +
        "We will manually check your name/email ID used for booking against our enrollment list. " +
        "If your details are not found on the enrollment list, the discount will not be provided.\n\n" +
        "Do you want to proceed with applying this coupon?"
      );
      if (!ok) return;
      setAppliedCoupons({ all: "GAMEINSIDER50" });
      toast.success(
        "🎮 GAMEINSIDER50 applied: 50% OFF!\n" +
        "⚠️ Note: Discount will be verified against enrollment list. " +
        "If your name/email is not found, discount will not be provided."
      );
      return;
    }
  }

  const handleCouponApply = () => {
    applyCoupon(couponCode);
    setCouponCode("");
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0) return 0;
    // Check if we have any slots selected (either single or multiple)
    if (!selectedSlot && selectedSlots.length === 0) return 0;
    return stations
      .filter((s) => selectedStations.includes(s.id))
      .reduce((sum, s) => {
        const sessionRate = s.type === 'vr' ? s.hourly_rate : s.hourly_rate;
        return sum + sessionRate;
      }, 0);
  };

  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    if (original === 0) return { total: 0, breakdown: {} as Record<string, number> };
    if (!Object.keys(appliedCoupons).length)
      return { total: 0, breakdown: {} as Record<string, number> };

    if (appliedCoupons["all"]) {
      if (appliedCoupons["all"] === "AXEIST")
        return { total: original, breakdown: { all: original } };
      if (appliedCoupons["all"] === "CUEPHORIA20") {
        const disc = original * 0.20;
        return { total: disc, breakdown: { all: disc } };
      }
      if (appliedCoupons["all"] === "CUEPHORIA35") {
        const disc = original * 0.35;
        return { total: disc, breakdown: { all: disc } };
      }
      if (appliedCoupons["all"] === "TEST210198$") {
        // Set discount to make final price = 1 rupee
        const disc = Math.max(original - 1, 0);
        return { total: disc, breakdown: { all: disc } };
      }
      if (appliedCoupons["all"] === "GAMEINSIDER50") {
        const disc = original * 0.50;
        return { total: disc, breakdown: { all: disc } };
      }
      return { total: 0, breakdown: {} as Record<string, number> };
    }

    let totalDiscount = 0;
    const breakdown: Record<string, number> = {};

    if (
      appliedCoupons["8ball"] === "HH99" &&
      appliedCoupons["ps5"] === "NIT35"
    ) {
      const eightBalls = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "8ball"
      );
      const sum = eightBalls.reduce((x, s) => x + s.hourly_rate, 0);
      const d = sum - eightBalls.length * 99;
      if (d > 0) {
        totalDiscount += d;
        breakdown["8-Ball (HH99)"] = d;
      }
      const ps5s = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "ps5"
      );
      const sum2 = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
      const d2 = sum2 * 0.35; // NIT35 is 35% off
      totalDiscount += d2;
      breakdown["PS5 (HH99+NIT35)"] = d2;
    } else {
      if (appliedCoupons["8ball"] === "HH99") {
        const eightBalls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const sum = eightBalls.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum - eightBalls.length * 99;
        if (d > 0) {
          totalDiscount += d;
          breakdown["8-Ball (HH99)"] = d;
        }
      }

      if (appliedCoupons["ps5"] === "HH99") {
        const ps5s = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "ps5"
        );
        const sum = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
        const d = sum - ps5s.length * 99;
        if (d > 0) {
          totalDiscount += d;
          breakdown["PS5 (HH99)"] = d;
        }
      }

      if (appliedCoupons["8ball"] === "NIT35" || appliedCoupons["8ball"] === "AAVEG50") {
        const balls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const sum = balls.reduce((x, s) => x + s.hourly_rate, 0);
        const d = appliedCoupons["8ball"] === "NIT35" ? sum * 0.35 : sum * 0.5;
        totalDiscount += d;
        breakdown[`8-Ball (${appliedCoupons["8ball"]})`] = d;
      }

      if (appliedCoupons["ps5"] === "NIT35" || appliedCoupons["ps5"] === "AAVEG50") {
        const ps5s = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "ps5"
        );
        const sum = ps5s.reduce((x, s) => x + s.hourly_rate, 0);
        const d = appliedCoupons["ps5"] === "NIT35" ? sum * 0.35 : sum * 0.5;
        totalDiscount += d;
        breakdown[`PS5 (${appliedCoupons["ps5"]})`] = d;
      }

      if (appliedCoupons["vr"] === "NIT35" || appliedCoupons["vr"] === "AAVEG50") {
        const vrStations = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "vr"
        );
        const sum = vrStations.reduce((x, s) => x + s.hourly_rate, 0);
        const d = appliedCoupons["vr"] === "NIT35" ? sum * 0.35 : sum * 0.5;
        totalDiscount += d;
        breakdown[`VR (${appliedCoupons["vr"]})`] = d;
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

  // ✅ UPDATED: createVenueBooking with duplicate check and Customer ID
  async function createVenueBooking() {
    setLoading(true);
    try {
      let customerId = customerInfo.id;
      
      if (!customerId) {
        const normalizedPhone = normalizePhoneNumber(customerInfo.phone);
        
        const validation = validatePhoneNumber(normalizedPhone);
        if (!validation.valid) {
          toast.error(validation.error || "Invalid phone number");
          setLoading(false);
          return;
        }

        // ✅ Check for duplicate phone number
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id, name, custom_id")
          .eq("phone", normalizedPhone)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          toast.info(`Using existing customer: ${existingCustomer.name}`);
        } else {
          const customerID = generateCustomerID(normalizedPhone);

          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              name: customerInfo.name,
              phone: normalizedPhone,
              email: customerInfo.email || null,
              custom_id: customerID,
              is_member: false,
              loyalty_points: 0,
              total_spent: 0,
              total_play_time: 0,
            })
            .select("id")
            .single();
            
          if (customerError) {
            if (customerError.code === '23505') {
              toast.error("This phone number is already registered. Please search for your account.");
              setLoading(false);
              return;
            }
            throw customerError;
          }
          customerId = newCustomer.id;
          toast.success(`New customer created: ${customerID}`);
        }
      }

      const couponCodes = Object.values(appliedCoupons).join(",");
      const bookingDuration = getBookingDuration(selectedStations, stations);
      
      // Use selectedSlots if available, otherwise fall back to single selectedSlot
      const slotsToBook = selectedSlots.length > 0 ? selectedSlots : (selectedSlot ? [selectedSlot] : []);
      
      if (slotsToBook.length === 0) {
        toast.error("Please select at least one time slot");
        setLoading(false);
        return;
      }
      
      // Calculate total price for all slots
      const slotsCount = slotsToBook.length;
      const totalOriginalPrice = originalPrice * slotsCount;
      const totalDiscountAmount = discount * slotsCount;
      const totalFinalPrice = finalPrice * slotsCount;
      
      // Create bookings for each selected slot
      // Price per booking = price per slot (since each slot is independent)
      const rows = slotsToBook.flatMap((slot) =>
        selectedStations.map((stationId) => ({
          station_id: stationId,
          customer_id: customerId!,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration: bookingDuration,
          status: "confirmed",
          original_price: originalPrice,
          discount_percentage: discount > 0 ? (discount / originalPrice) * 100 : null,
          final_price: finalPrice,
          coupon_code: couponCodes || null,
        }))
      );

      // STEP 1: Check for conflicts and create slot blocks
      const timeToMinutes = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const normalizedPhone = normalizePhoneNumber(customerInfo.phone);
      const blockDurationMinutes = 5;
      const expiresAt = new Date(Date.now() + blockDurationMinutes * 60 * 1000).toISOString();

      for (const slot of slotsToBook) {
        const requestedStart = timeToMinutes(slot.start_time);
        const requestedEnd = timeToMinutes(slot.end_time);
        const requestedEndMinutes = requestedEnd === 0 ? 24 * 60 : requestedEnd;

        // Check for existing bookings
        const { data: existingBookings } = await supabase
          .from("bookings")
          .select("id, station_id, start_time, end_time")
          .in("station_id", selectedStations)
          .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
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
            toast.error("Selected slot is no longer available. Please select another time slot.");
            setLoading(false);
            return;
          }
        }

        // Check for active slot blocks (excluding our own session)
        const { data: activeBlocks } = await supabase
          .from("slot_blocks")
          .select("id, station_id")
          .in("station_id", selectedStations)
          .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
          .eq("start_time", slot.start_time)
          .eq("end_time", slot.end_time)
          .gt("expires_at", new Date().toISOString())
          .eq("is_confirmed", false)
          .neq("session_id", sessionId);

        if (activeBlocks && activeBlocks.length > 0) {
          toast.error("This slot is currently being booked by another customer. Please try again in a moment.");
          setLoading(false);
          return;
        }

        // Create slot blocks for all selected stations
        const blockRows = selectedStations.map((stationId: string) => ({
          station_id: stationId,
          booking_date: format(selectedDate, "yyyy-MM-dd"),
          start_time: slot.start_time,
          end_time: slot.end_time,
          expires_at: expiresAt,
          session_id: sessionId,
          customer_phone: normalizedPhone,
          is_confirmed: false,
        }));

        const { error: blockError } = await supabase
          .from("slot_blocks")
          .upsert(blockRows, {
            onConflict: "station_id,booking_date,start_time,end_time",
            ignoreDuplicates: false
          });

        if (blockError) {
          console.error("Failed to create slot blocks:", blockError);
          // Check again for blocks (race condition)
          const { data: newActiveBlocks } = await supabase
            .from("slot_blocks")
            .select("id")
            .in("station_id", selectedStations)
            .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
            .eq("start_time", slot.start_time)
            .eq("end_time", slot.end_time)
            .gt("expires_at", new Date().toISOString())
            .eq("is_confirmed", false)
            .neq("session_id", sessionId);

          if (newActiveBlocks && newActiveBlocks.length > 0) {
            toast.error("This slot was just booked by another customer. Please select another time slot.");
            setLoading(false);
            return;
          }
        }
      }

      const { data: inserted, error: bookingError } = await supabase
        .from("bookings")
        .insert(rows)
        .select("id");
        
      if (bookingError) {
        // Release slot blocks if booking fails
        for (const slot of slotsToBook) {
          await supabase
            .from("slot_blocks")
            .delete()
            .in("station_id", selectedStations)
            .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
            .eq("start_time", slot.start_time)
            .eq("end_time", slot.end_time)
            .eq("session_id", sessionId)
            .eq("is_confirmed", false);
        }
        throw bookingError;
      }

      // Confirm slot blocks after successful booking
      for (const slot of slotsToBook) {
        await supabase
          .from("slot_blocks")
          .update({ is_confirmed: true })
          .in("station_id", selectedStations)
          .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
          .eq("start_time", slot.start_time)
          .eq("end_time", slot.end_time)
          .eq("session_id", sessionId)
          .gt("expires_at", new Date().toISOString())
          .eq("is_confirmed", false);
      }

      const stationObjects = stations.filter((s) =>
        selectedStations.includes(s.id)
      );
      
      const hasVR = selectedStations.some(id => 
        stations.find(s => s.id === id && s.type === 'vr')
      );
      const sessionDuration = hasVR ? "15 minutes" : "60 minutes";
      
      // Use first slot for confirmation display (or selectedSlot if available)
      const displaySlot = selectedSlot || slotsToBook[0];
      
      setBookingConfirmationData({
        bookingId: inserted[0].id.slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: stationObjects.map((s) => s.name),
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: new Date(`2000-01-01T${displaySlot.start_time}`).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        ),
        endTime: new Date(`2000-01-01T${displaySlot.end_time}`).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        ),
        totalAmount: totalFinalPrice, // Total for all slots
        couponCode: couponCodes || undefined,
        discountAmount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
        sessionDuration: sessionDuration,
        paymentMode: "venue", // Venue payment
        paymentTxnId: undefined, // No transaction ID for venue payments
      });
      setShowConfirmationDialog(true);

      toast.success("🎉 Booking confirmed! Get ready to game! 🎮");

      setSelectedStations([]);
      setSelectedSlot(null);
      setSelectedSlots([]);
      setCustomerNumber("");
      setCustomerInfo({ name: "", phone: "", email: "" });
      setIsReturningCustomer(false);
      setHasSearched(false);
      setCouponCode("");
      setAppliedCoupons({});
      setAvailableSlots([]);
    } catch (e) {
      console.error(e);
      // Release any remaining slot blocks on error
      const slotsToRelease = selectedSlots.length > 0 ? selectedSlots : (selectedSlot ? [selectedSlot] : []);
      if (slotsToRelease.length > 0 && selectedStations.length > 0) {
        for (const slot of slotsToRelease) {
          await supabase
            .from("slot_blocks")
            .delete()
            .in("station_id", selectedStations)
            .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
            .eq("start_time", slot.start_time)
            .eq("end_time", slot.end_time)
            .eq("session_id", sessionId)
            .eq("is_confirmed", false)
            .catch(console.error);
        }
      }
      toast.error("Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Load Razorpay script and key ID when payment method is set to razorpay
  useEffect(() => {
    if (paymentMethod === "razorpay") {
      // Load Razorpay script if not already loaded
      if (!(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => {
          console.log("✅ Razorpay script loaded");
        };
        script.onerror = () => {
          console.error("❌ Failed to load Razorpay script");
          toast.error("Failed to load payment gateway. Please refresh the page.");
        };
        document.body.appendChild(script);
      }
      
      // Pre-fetch Razorpay key ID for faster payment initiation
      if (!razorpayKeyId) {
        fetch("/api/razorpay/get-key-id")
          .then((res) => res.json())
          .then((data) => {
            if (data.ok && data.keyId) {
              setRazorpayKeyId(data.keyId);
              console.log("✅ Razorpay key ID pre-loaded");
            }
          })
          .catch((err) => {
            console.error("Failed to pre-load Razorpay key ID:", err);
            // Don't show error to user yet, will retry during payment
          });
      }
    }
  }, [paymentMethod, razorpayKeyId]);

  const initiateRazorpay = async () => {
    // Use selectedSlots if available, otherwise fall back to single selectedSlot
    const slotsToBook = selectedSlots.length > 0 ? selectedSlots : (selectedSlot ? [selectedSlot] : []);
    
    if (slotsToBook.length === 0) {
      toast.error("Please select at least one time slot");
      return;
    }
    
    const totalPrice = finalPrice * slotsToBook.length;
    
    if (totalPrice <= 0) {
      toast.error("Amount must be greater than 0 for online payment.");
      return;
    }
    if (!customerInfo.phone) {
      toast.error("Customer phone is required for payment.");
      return;
    }

    if (!(window as any).Razorpay) {
      toast.error("Payment gateway is loading. Please wait a moment and try again.");
      return;
    }

    // Calculate 2.5% transaction fee for Razorpay
    const transactionFee = Math.round((totalPrice * 0.025) * 100) / 100; // Round to 2 decimal places
    const totalWithFee = totalPrice + transactionFee;

    const txnId = genTxnId();
    setLoading(true);

    try {
      const bookingDuration = getBookingDuration(selectedStations, stations);
      // Store all slots for booking creation after payment
      const pendingBooking = {
        selectedStations,
        selectedDateISO: format(selectedDate, "yyyy-MM-dd"),
        slots: slotsToBook.map(slot => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
        })),
        duration: bookingDuration,
        customer: customerInfo,
        pricing: {
          original: originalPrice * slotsToBook.length,
          discount: discount * slotsToBook.length,
          final: totalPrice,
          transactionFee: transactionFee,
          totalWithFee: totalWithFee,
          coupons: Object.values(appliedCoupons).join(","),
        },
      };
      localStorage.setItem("pendingBooking", JSON.stringify(pendingBooking));

      // Serialize booking data for order notes (compact format to fit 256 char limit per field)
      // Use minimal keys to save space
      const bookingDataCompact = JSON.stringify({
        s: selectedStations, // stations
        d: format(selectedDate, "yyyy-MM-dd"), // date
        t: slotsToBook.map(s => ({ s: s.start_time, e: s.end_time })), // time slots
        du: bookingDuration, // duration
        c: { n: customerInfo.name, p: customerInfo.phone, e: customerInfo.email || "", i: customerInfo.id || "" }, // customer
        p: { o: originalPrice * slotsToBook.length, d: discount * slotsToBook.length, f: totalPrice, tf: transactionFee, twf: totalWithFee }, // pricing
        cp: Object.values(appliedCoupons).join(","), // coupons
      });

      // Split booking_data across multiple note fields if needed (each field max 256 chars)
      const bookingDataStr = bookingDataCompact;
      const notes: Record<string, string> = {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email || "",
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        stations: selectedStations.join(","),
      };

      // Store booking_data, split if necessary
      if (bookingDataStr.length <= 256) {
        notes.booking_data = bookingDataStr;
      } else {
        // Split into multiple fields
        notes.booking_data_1 = bookingDataStr.substring(0, 256);
        if (bookingDataStr.length > 256) {
          notes.booking_data_2 = bookingDataStr.substring(256, 512);
        }
      }

      // Create order on server with total including transaction fee
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: totalWithFee,
          receipt: txnId,
          notes: notes,
        }),
      });

      // Fetch key ID in parallel with order creation if not already cached
      const keyPromise = razorpayKeyId 
        ? Promise.resolve({ keyId: razorpayKeyId })
        : fetch("/api/razorpay/get-key-id")
            .then((res) => res.json())
            .catch(() => ({ keyId: "" }));

      const [orderData, keyData] = await Promise.all([
        orderRes.json().catch(() => null),
        keyPromise
      ]);

      if (!orderRes.ok || !orderData?.ok || !orderData?.orderId) {
        const error = orderData?.error || "Failed to create payment order";
        console.error("❌ Order creation failed:", error);
        toast.error(`Payment setup failed: ${error}`);
        setLoading(false);
        return;
      }

      console.log("✅ Razorpay order created:", orderData.orderId);

      // Use cached key ID or fetch result
      const finalKeyId = keyData.keyId || razorpayKeyId;
      
      // Cache the key ID for future use
      if (keyData.keyId && !razorpayKeyId) {
        setRazorpayKeyId(keyData.keyId);
      }

      if (!finalKeyId) {
        toast.error("Payment gateway configuration error. Please contact support.");
        setLoading(false);
        return;
      }

      const origin = window.location.origin;
      const callbackUrl = `${origin}/api/razorpay/callback`;

      // Razorpay checkout options
      const options = {
        key: finalKeyId,
        amount: orderData.amount, // Amount in paise
        currency: orderData.currency || "INR",
        name: "Cuephoria Gaming Lounge",
        description: `Booking for ${slotsToBook.length} slot(s)`,
        order_id: orderData.orderId,
        handler: function (response: any) {
          console.log("✅ Razorpay payment success:", response);
          // Redirect to success page with payment details
          window.location.href = `/public/payment/success?payment_id=${encodeURIComponent(response.razorpay_payment_id)}&order_id=${encodeURIComponent(response.razorpay_order_id)}&signature=${encodeURIComponent(response.razorpay_signature)}`;
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email || "",
          contact: customerInfo.phone,
        },
        notes: {
          transaction_id: txnId,
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
        },
        theme: {
          color: "#8B5CF6", // Cuephoria purple
        },
        modal: {
          ondismiss: function() {
            console.log("Payment cancelled by user");
            setLoading(false);
            toast.info("Payment was cancelled");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      
      rzp.on("payment.failed", function (response: any) {
        console.error("❌ Razorpay payment failed:", response);
        const error = response.error?.description || response.error?.reason || "Payment failed";
        toast.error(`Payment failed: ${error}`);
        setLoading(false);
        // Redirect to failure page
        window.location.href = `/public/payment/failed?order_id=${encodeURIComponent(orderData.orderId)}&error=${encodeURIComponent(error)}`;
      });

      rzp.open();
    } catch (e: any) {
      console.error("💥 Razorpay payment error:", e);
      toast.error(`Unable to start payment: ${e?.message || e}`);
      setLoading(false);
    }
  };

  // Helper function to determine service type for promo
  const getServiceTypeForPromo = (): 'ps5' | '8ball' | null => {
    if (selectedStations.length === 0) return null;
    
    // Find the first non-VR station type
    const selectedStationTypes = selectedStations
      .map(id => stations.find(s => s.id === id))
      .filter(s => s && s.type !== 'vr')
      .map(s => s!.type);
    
    if (selectedStationTypes.length === 0) return null;
    
    // Prioritize PS5, then 8-ball
    if (selectedStationTypes.includes('ps5')) return 'ps5';
    if (selectedStationTypes.includes('8ball')) return '8ball';
    
    return null;
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
    const slotsToBook = selectedSlots.length > 0 ? selectedSlots : (selectedSlot ? [selectedSlot] : []);
    if (slotsToBook.length === 0) {
      toast.error("Please select at least one time slot");
      return;
    }
    if (!customerInfo.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    // Show promotional popup if paying at venue and service type is PS5 or 8-ball
    if (paymentMethod === "venue") {
      // Don't show online payment promo if Instagram pop-up is open
      if (showInstagramFollowDialog || showFollowConfirmation) {
        // If Instagram pop-up is open, proceed directly with venue booking
        await createVenueBooking();
        return;
      }
      
      const serviceType = getServiceTypeForPromo();
      if (serviceType) {
        setShowOnlinePaymentPromo(true);
        return;
      } else {
        // If no eligible service type, proceed directly with venue booking
        await createVenueBooking();
      }
    } else {
      // Don't show payment warning if Instagram pop-up is open
      if (showInstagramFollowDialog || showFollowConfirmation) {
        // If Instagram pop-up is open, proceed directly with online booking
        return;
      }
      // Show warning modal before opening payment gateway
      setShowPaymentWarning(true);
    }
  }

  const handlePromoAccept = async () => {
    setShowOnlinePaymentPromo(false);
    // Switch to online payment and show warning modal
    setPaymentMethod("razorpay");
    setShowPaymentWarning(true);
  };

  const handlePromoDecline = async () => {
    setShowOnlinePaymentPromo(false);
    // Proceed with venue booking
    await createVenueBooking();
  };

  // Auto-close payment warning modal and proceed with payment after 3 seconds
  useEffect(() => {
    if (showPaymentWarning) {
      const timer = setTimeout(async () => {
        setShowPaymentWarning(false);
        await initiateRazorpay();
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaymentWarning]);

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

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cuephoria-purple/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-cuephoria-blue/20 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cuephoria-lightpurple/20 blur-3xl" />
      </div>

      <CouponPromotionalPopup 
        onCouponSelect={applyCoupon} 
        blockWhenOpen={showOnlinePaymentPromo || showInstagramFollowDialog || showFollowConfirmation}
      />

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
              Reserve PlayStation 5, Pool Table, or VR Gaming sessions at Cuephoria
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300 backdrop-blur-md">
              <span className="font-semibold tracking-wide">Line of Business:</span>
              <span>
                Amusement & Gaming Lounge Services (time-based PS5, 8-Ball & VR rentals)
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-14 relative z-10">
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-300">
          <h2 className="mb-1 text-base font-semibold text-white">About Cuephoria</h2>
          <p>
            Cuephoria offers <span className="font-medium">time-based rentals</span> of
            PlayStation 5 stations, 8-Ball pool tables, and VR Gaming stations. Book 
            60-minute sessions for PS5/Pool or 15-minute sessions for VR Gaming.
          </p>
          <p className="mt-2 text-gray-400">
            <span className="font-medium text-gray-200">Pricing:</span> All prices are
            displayed in <span className="ml-1 font-semibold">INR (₹)</span>.
          </p>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
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
                      const value = e.target.value;
                      const normalized = normalizePhoneNumber(value);
                      
                      if (normalized.length <= 10) {
                        setCustomerNumber(normalized);
                        // Don't reset hasSearched here - let auto-search handle it
                        if (normalized.length < 10) {
                          setHasSearched(false);
                          setIsReturningCustomer(false);
                          setCustomerInfo((prev) => ({
                            ...prev,
                            name: "",
                            email: "",
                            phone: normalized,
                          }));
                        }
                      }
                    }}
                    placeholder="Enter 10-digit phone number (auto-searches)"
                    className="bg-black/30 border-white/10 text-white placeholder:text-gray-400 rounded-xl flex-1"
                    maxLength={10}
                  />
                  <Button
                    onClick={searchCustomer}
                    disabled={searchingCustomer}
                    className="rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple"
                  >
                    {searchingCustomer ? "Searching..." : "Search"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 italic">
                  💡 Phone number will be automatically searched when you enter 10 digits
                </p>

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
                    "grid grid-cols-4 gap-2 sm:gap-3 mb-4",
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStationType("vr")}
                    className={cn(
                      "h-9 rounded-full border-white/15 text-[12px]",
                      stationType === "vr"
                        ? "bg-blue-400/15 text-blue-300"
                        : "bg-transparent text-blue-300"
                    )}
                  >
                    VR
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
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const compareDate = new Date(date);
                            compareDate.setHours(0, 0, 0, 0);
                            
                            return compareDate < today;
                          }}
                          className={cn(
                            "rounded-xl border bg-black/30 border-white/10 pointer-events-auto"
                          )}
                        />
                      </div>
                    </div>
                    {selectedStations.length > 0 && (
                      <div>
                        <div className="mb-3 bg-cuephoria-blue/10 border border-cuephoria-blue/20 rounded-lg p-2.5">
                          <p className="text-xs text-cuephoria-blue flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                            <span><span className="font-medium">Multiple Slot Selection:</span> Click multiple time slots to book consecutive sessions. Click again to deselect.</span>
                          </p>
                        </div>
                        <Label className="text-base font-medium text-gray-200">
                          Available Time Slots
                        </Label>
                        <div className="mt-2">
                          <TimeSlotPicker
                            slots={availableSlots}
                            selectedSlot={selectedSlot}
                            selectedSlots={selectedSlots}
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
                              ) : s.type === "vr" ? (
                                <Headset className="h-3.5 w-3.5 text-blue-400" />
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

                {(selectedSlot || selectedSlots.length > 0) && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-400 uppercase">
                      Session Duration & Time
                    </Label>
                    <p className="mt-1 text-sm text-gray-200">
                      {selectedStations.some(id => stations.find(s => s.id === id && s.type === 'vr')) 
                        ? '15 minutes' : '60 minutes'}
                    </p>
                    {selectedSlots.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {selectedSlots.map((slot, idx) => (
                          <p key={idx} className="text-sm text-gray-200">
                            {new Date(`2000-01-01T${slot.start_time}`).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit", hour12: true }
                            )}{" "}
                            —{" "}
                            {new Date(`2000-01-01T${slot.end_time}`).toLocaleTimeString(
                              "en-US",
                              { hour: "numeric", minute: "2-digit", hour12: true }
                            )}
                          </p>
                        ))}
                        <p className="text-xs text-cuephoria-lightpurple mt-1">
                          {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    ) : selectedSlot ? (
                      <p className="text-sm text-gray-200">
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
                    ) : null}
                  </div>
                )}

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
                  
                  {/* Coupon Rules - Redesigned with Apply Buttons and Expandable */}
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs font-semibold text-gray-400 uppercase mb-2 block">
                      📝 Available Coupons
                    </Label>
                    
                    <div className="space-y-2.5">
                      {/* NIT35 - Expandable */}
                      <div className="rounded-lg bg-gray-800/30 border border-gray-700/50 overflow-hidden">
                        <div 
                          className="p-2 cursor-pointer flex items-center justify-between"
                          onClick={() => setExpandedCoupons(prev => ({ ...prev, NIT35: !prev.NIT35 }))}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-sm">🎓</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-200 text-xs">NIT35</span>
                              {!expandedCoupons.NIT35 && (
                                <span className="text-xs text-gray-400 ml-1.5">• 35% off for NIT Students</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                applyCoupon("NIT35");
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                            >
                              Apply
                            </Button>
                            {expandedCoupons.NIT35 ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {expandedCoupons.NIT35 && (
                          <div className="px-2 pb-2 pt-0 border-t border-gray-700/50">
                            <p className="text-xs text-gray-400 mt-2">35% off for NIT Students</p>
                          </div>
                        )}
                      </div>

                      {/* HH99 - Expandable */}
                      <div className="rounded-lg bg-gray-800/30 border border-gray-700/50 overflow-hidden">
                        <div 
                          className="p-2 cursor-pointer flex items-center justify-between"
                          onClick={() => setExpandedCoupons(prev => ({ ...prev, HH99: !prev.HH99 }))}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-sm">⏰</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-200 text-xs">HH99</span>
                              {!expandedCoupons.HH99 && (
                                <span className="text-xs text-gray-400 ml-1.5">• PS5 & 8-Ball @ ₹99/hr (Mon–Fri 11 AM–4 PM, not VR)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                applyCoupon("HH99");
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                            >
                              Apply
                            </Button>
                            {expandedCoupons.HH99 ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {expandedCoupons.HH99 && (
                          <div className="px-2 pb-2 pt-0 border-t border-gray-700/50">
                            <p className="text-xs text-gray-400 mt-2">PS5 & 8-Ball @ ₹99/hr only Mon–Fri 11 AM–4 PM (not VR)</p>
                          </div>
                        )}
                      </div>

                      {/* CUEPHORIA35 - Expandable */}
                      <div className="rounded-lg bg-gray-800/30 border border-gray-700/50 overflow-hidden">
                        <div 
                          className="p-2 cursor-pointer flex items-center justify-between"
                          onClick={() => setExpandedCoupons(prev => ({ ...prev, CUEPHORIA35: !prev.CUEPHORIA35 }))}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-sm">📚</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-200 text-xs">CUEPHORIA35</span>
                              {!expandedCoupons.CUEPHORIA35 && (
                                <span className="text-xs text-gray-400 ml-1.5">• 35% off for students (ID required)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                applyCoupon("CUEPHORIA35");
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                            >
                              Apply
                            </Button>
                            {expandedCoupons.CUEPHORIA35 ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {expandedCoupons.CUEPHORIA35 && (
                          <div className="px-2 pb-2 pt-0 border-t border-gray-700/50">
                            <p className="text-xs text-gray-400 mt-2">35% off for students (ID required)</p>
                          </div>
                        )}
                      </div>

                      {/* CUEPHORIA20 - Expandable */}
                      <div className="rounded-lg bg-gray-800/30 border border-gray-700/50 overflow-hidden">
                        <div 
                          className="p-2 cursor-pointer flex items-center justify-between"
                          onClick={() => setExpandedCoupons(prev => ({ ...prev, CUEPHORIA20: !prev.CUEPHORIA20 }))}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-sm">🎉</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-200 text-xs">CUEPHORIA20</span>
                              {!expandedCoupons.CUEPHORIA20 && (
                                <span className="text-xs text-gray-400 ml-1.5">• 20% off for everyone!</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                applyCoupon("CUEPHORIA20");
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                            >
                              Apply
                            </Button>
                            {expandedCoupons.CUEPHORIA20 ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        {expandedCoupons.CUEPHORIA20 && (
                          <div className="px-2 pb-2 pt-0 border-t border-gray-700/50">
                            <p className="text-xs text-gray-400 mt-2">20% off for everyone!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {Object.entries(appliedCoupons).length > 0 && (
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs font-semibold text-gray-400 uppercase mb-1 block">
                        ✅ Applied Coupons
                      </Label>
                      {Object.entries(appliedCoupons).map(([key, val]) => {
                        let emoji = "🏷️";
                        if (val === "HH99") emoji = "⏰";
                        else if (val === "NIT35") emoji = "🎓";
                        else if (val === "CUEPHORIA20") emoji = "🎉";
                        else if (val === "CUEPHORIA35") emoji = "📚";
                        else if (val === "AAVEG50") emoji = "🏫";
                        else if (val === "AXEIST") emoji = "🥷";
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg shadow-md font-semibold bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-400/50"
                          >
                            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                              <span className="text-lg flex-shrink-0">{emoji}</span>
                              <span className="font-extrabold uppercase tracking-wider text-purple-200 flex-shrink-0">
                                {val}
                              </span>
                              <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded text-green-400">
                                ✓ Applied
                              </span>
                            </div>
                            <button
                              onClick={() => removeCoupon(key)}
                              aria-label="Remove coupon"
                              className="ml-2 p-1.5 hover:bg-black/20 rounded-full transition-colors flex-shrink-0 hover:bg-purple-500/20"
                            >
                              <X className="h-4 w-4 text-purple-200" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <Label className="text-xs font-semibold text-gray-400 uppercase">
                    Payment Method
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPaymentMethod("venue")}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm border transition-all",
                        paymentMethod === "venue"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-black/20 border-white/10 text-gray-300 hover:bg-black/30"
                      )}
                    >
                      Pay at Venue
                    </button>
                    <button
                      onClick={() => setPaymentMethod("razorpay")}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-sm border transition-all relative overflow-hidden",
                        paymentMethod === "razorpay"
                          ? "bg-gradient-to-r from-[#3395FF] to-[#2563EB] border-[#3395FF]/50 text-white shadow-lg shadow-[#3395FF]/20"
                          : "bg-black/20 border-white/10 text-gray-300 hover:bg-black/30 hover:border-[#3395FF]/30"
                      )}
                    >
                      <div className="inline-flex items-center justify-center gap-2 relative z-10">
                        {paymentMethod === "razorpay" ? (
                          <>
                            <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-semibold">Razorpay</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            <span>Pay Online</span>
                          </>
                        )}
                      </div>
                      {paymentMethod === "razorpay" && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                      )}
                    </button>
                  </div>
                  {paymentMethod === "razorpay" && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                      {/* Razorpay Branding Card */}
                      <div className="rounded-xl border border-[#3395FF]/30 bg-gradient-to-br from-[#3395FF]/10 via-[#2563EB]/10 to-[#1E40AF]/10 p-4 backdrop-blur-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#3395FF] to-[#2563EB] flex items-center justify-center shadow-lg shadow-[#3395FF]/30">
                              <Shield className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>Powered by Razorpay</span>
                                <BadgeCheck className="h-4 w-4 text-[#3395FF]" />
                              </h4>
                              <p className="text-xs text-gray-300 mt-1">
                                India's most trusted payment gateway trusted by 8M+ businesses
                              </p>
                            </div>
                            
                            {/* Security Features */}
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <div className="flex items-center gap-1.5 text-[10px] text-[#3395FF]/90">
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                <span>PCI-DSS Compliant</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#3395FF]/90">
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                <span>256-bit SSL Encryption</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#3395FF]/90">
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                <span>Bank-level Security</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#3395FF]/90">
                                <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                <span>Instant Confirmation</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Trust Indicators */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-white/5">
                        <div className="flex items-center gap-2 text-[10px] text-gray-300">
                          <Lock className="h-3 w-3 text-green-400" />
                          <span>Your payment data is encrypted and secure</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-[#3395FF]/70">
                          <Zap className="h-3 w-3" />
                          <span>Fast & Secure</span>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-gray-300">
                          Why pay online?
                        </p>
                        <ul className="space-y-1 text-[10px] text-gray-400 ml-4">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0 mt-0.5" />
                            <span>Instant booking confirmation - no waiting at venue</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0 mt-0.5" />
                            <span>Multiple payment options: Cards, UPI, Netbanking, Wallets</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0 mt-0.5" />
                            <span>Your booking is created only after successful payment</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {originalPrice > 0 && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="space-y-2">
                      {(() => {
                        const slotsCount = selectedSlots.length > 0 ? selectedSlots.length : (selectedSlot ? 1 : 0);
                        const totalOriginal = originalPrice * slotsCount;
                        const totalDiscount = discount * slotsCount;
                        const totalFinal = finalPrice * slotsCount;
                        
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <Label className="text-sm text-gray-300">Price per slot</Label>
                              <span className="text-sm text-gray-200">
                                {INR(originalPrice)}
                              </span>
                            </div>
                            {slotsCount > 1 && (
                              <div className="flex justify-between items-center text-xs text-gray-400">
                                <Label>× {slotsCount} slot{slotsCount !== 1 ? 's' : ''}</Label>
                                <span>{INR(totalOriginal)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <Label className="text-sm text-gray-300">Subtotal</Label>
                              <span className="text-sm text-gray-200">
                                {INR(totalOriginal)}
                              </span>
                            </div>
                          </>
                        );
                      })()}

                      {(() => {
                        const slotsCount = selectedSlots.length > 0 ? selectedSlots.length : (selectedSlot ? 1 : 0);
                        const totalOriginal = originalPrice * slotsCount;
                        const totalDiscount = discount * slotsCount;
                        const totalFinal = finalPrice * slotsCount;
                        
                        return (
                          <>
                            {discount > 0 && (
                              <>
                                <div className="border p-2 rounded bg-black/10 text-green-400">
                                  <Label className="font-semibold text-xs uppercase">
                                    Discount Breakdown (per slot)
                                  </Label>
                                  <ul className="list-disc ml-5 mt-1 text-sm">
                                    {Object.entries(discountBreakdown).map(([k, v]) => (
                                      <li key={k}>
                                        {k}: -{INR(v)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {slotsCount > 1 && (
                                  <div className="flex justify-between items-center text-xs text-gray-400">
                                    <Label>× {slotsCount} slot{slotsCount !== 1 ? 's' : ''}</Label>
                                    <span>-{INR(totalDiscount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <Label className="text-sm text-green-400">
                                    Total Discount
                                  </Label>
                                  <span className="text-sm text-green-400">-{INR(totalDiscount)}</span>
                                </div>
                              </>
                            )}

                            <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            <div className="flex justify-between items-center">
                              <Label className="text-base font-semibold text-gray-100">
                                Total Amount
                              </Label>
                              <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">
                                {INR(totalFinal)}
                              </span>
                            </div>

                            {paymentMethod === "razorpay" && (
                              <>
                                <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                      <Label className="text-gray-300">
                                        Online Payment Transaction Fee
                                      </Label>
                                      <span className="text-xs text-gray-400 mt-0.5">
                                        (2.5% of total) • Includes 15 mins free gameplay
                                      </span>
                                    </div>
                                    <span className="text-sm text-gray-200 font-medium">
                                      +{INR(Math.round((totalFinal * 0.025) * 100) / 100)}
                                    </span>
                                  </div>
                                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-2.5">
                                    <p className="text-xs text-blue-300/90 leading-relaxed">
                                      💡 <strong>Good news!</strong> All online payments include <strong>15 minutes of free gameplay</strong> as a bonus. The small transaction fee helps us provide secure payment processing.
                                    </p>
                                  </div>
                                  <div className="flex justify-between items-center pt-1 border-t border-white/10">
                                    <Label className="text-base font-semibold text-gray-100">
                                      Amount to Pay
                                    </Label>
                                    <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                      {INR(Math.round((totalFinal + (totalFinal * 0.025)) * 100) / 100)}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}

                <Button
                  onClick={handleConfirm}
                  disabled={
                    (selectedSlots.length === 0 && !selectedSlot) || selectedStations.length === 0 || !customerNumber || loading
                  }
                  className={cn(
                    "w-full rounded-xl relative overflow-hidden transition-all",
                    paymentMethod === "razorpay"
                      ? "bg-gradient-to-r from-[#3395FF] to-[#2563EB] hover:from-[#2B85E6] hover:to-[#1E50D9] shadow-lg shadow-[#3395FF]/30 border border-[#3395FF]/30"
                      : "bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple"
                  )}
                  size="lg"
                >
                  <div className="inline-flex items-center justify-center gap-2 relative z-10">
                    {paymentMethod === "razorpay" && !loading && (
                      <Shield className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="font-semibold">
                      {loading
                        ? paymentMethod === "razorpay"
                          ? "Starting Payment..."
                          : "Creating Booking..."
                        : paymentMethod === "razorpay"
                        ? "Confirm & Pay with Razorpay"
                        : "Confirm Booking"}
                    </span>
                  </div>
                  {paymentMethod === "razorpay" && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent opacity-60"></div>
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-xs text-gray-400">
                    All prices are shown in <span className="font-semibold">INR (₹)</span>.{" "}
                    {paymentMethod === "razorpay"
                      ? "You will complete payment securely via Razorpay."
                      : "Payment will be collected at the venue."}
                  </p>
                  {paymentMethod === "razorpay" && (
                    <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-[9px] text-[#3395FF]/70">
                        <Shield className="h-3 w-3" />
                        <span>Secured by Razorpay</span>
                      </div>
                      <div className="h-3 w-px bg-white/10"></div>
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                        <Lock className="h-3 w-3" />
                        <span>100% Secure Payment</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold mb-2">
              Terms & Conditions (Summary)
            </h3>
            <ul className="ml-5 list-disc text-sm text-gray-300 space-y-1.5">
              <li>Bookings are for specified time slots (60 min for PS5/Pool, 15 min for VR); extensions subject to availability.</li>
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-white font-semibold mb-2">Shipping & Delivery (Summary)</h3>
            <ul className="ml-5 list-disc text-sm text-gray-300 space-y-1.5">
              <li>All services are delivered on-site at our physical location.</li>
              <li>We do not ship physical products or equipment to addresses.</li>
              <li>Bookings are confirmed immediately upon successful payment.</li>
              <li>You must arrive at our premises to access your booked services.</li>
              <li>Equipment is available on-site only during your scheduled time slot.</li>
            </ul>
            <button
              onClick={() => {
                setLegalDialogType("shipping");
                setShowLegalDialog(true);
              }}
              className="mt-3 text-sm text-cuephoria-lightpurple hover:underline"
            >
              View full Shipping & Delivery Policy
            </button>
          </div>
        </section>

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
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 overflow-x-auto -mx-3 sm:-mx-4 sm:mx-0">
                      <table className="min-w-full sm:min-w-[520px] w-full text-sm">
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
                onClick={() => {
                  setLegalDialogType("terms");
                  setShowLegalDialog(true);
                }}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Terms & Conditions
              </button>
              <button
                onClick={() => {
                  setLegalDialogType("privacy");
                  setShowLegalDialog(true);
                }}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => {
                  setLegalDialogType("contact");
                  setShowLegalDialog(true);
                }}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Contact Us
              </button>
              <button
                onClick={() => setShowRefundDialog(true)}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Refund Policy
              </button>
              <button
                onClick={() => {
                  setLegalDialogType("shipping");
                  setShowLegalDialog(true);
                }}
                className="text-gray-400 hover:text-white hover:underline text-sm flex items-center gap-1 transition"
              >
                Shipping & Delivery
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <a href="tel:918637625155" className="hover:text-white transition-colors">
                  +91 86376 25155
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <a href="mailto:contact@cuephoria.in" className="hover:text-white transition-colors">
                  contact@cuephoria.in
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {bookingConfirmationData && (
        <BookingConfirmationDialog 
          isOpen={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          bookingData={bookingConfirmationData}
        />
      )}

      <OnlinePaymentPromoDialog
        isOpen={showOnlinePaymentPromo}
        onClose={() => setShowOnlinePaymentPromo(false)}
        onAccept={handlePromoAccept}
        onDecline={handlePromoDecline}
        serviceType={getServiceTypeForPromo()}
      />

      {/* Instagram Follow Dialog for New Customers */}
      <Dialog open={showInstagramFollowDialog} onOpenChange={setShowInstagramFollowDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-pink-900/95 via-purple-900/95 to-indigo-900/95 border-2 border-pink-400/50 text-white"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          margin: 0
        }}>
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
              ✨ Follow Us on Instagram ✨
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-3">
              <p className="text-sm sm:text-base text-gray-200">
                To apply the <span className="font-bold text-pink-300">{pendingCoupon?.code || "coupon"}</span> coupon, please follow our Instagram profile first!
              </p>
              <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 rounded-lg border border-pink-400/30">
                <Instagram className="h-5 w-5 text-pink-400" />
                <a 
                  href="https://www.instagram.com/cuephoriaclub/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => setInstagramLinkClicked(true)}
                  className="text-base sm:text-lg font-bold text-pink-300 hover:text-pink-200 transition-colors underline flex items-center gap-2"
                >
                  @cuephoriaclub
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {instagramLinkClicked && (
                <div className="mt-3 p-3 bg-green-500/20 border border-green-400/50 rounded-lg">
                  <p className="text-sm text-green-300 flex items-center gap-2 justify-center">
                    <CheckCircle className="h-4 w-4" />
                    Link opened! Please follow us and come back.
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={() => {
                  if (instagramLinkClicked) {
                    setShowFollowConfirmation(true);
                  } else {
                    toast.error("Please click the Instagram link first!");
                  }
                }}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold"
                disabled={!instagramLinkClicked}
              >
                {instagramLinkClicked ? "Yes, I've Followed - Apply Coupon" : "Click Instagram Link First"}
              </Button>
              <Button
                onClick={() => {
                  setShowInstagramFollowDialog(false);
                  setInstagramLinkClicked(false);
                }}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow Confirmation Dialog */}
      <Dialog open={showFollowConfirmation} onOpenChange={setShowFollowConfirmation}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12] border-white/10 text-white"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          margin: 0
        }}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-center">
              Have you followed us on Instagram?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-300 text-center">
              Please confirm that you have followed <span className="font-bold text-pink-300">@cuephoriaclub</span> on Instagram to proceed with applying the {pendingCoupon?.code || "coupon"} coupon.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  if (pendingCoupon) {
                    if (pendingCoupon.type === "all") {
                      setAppliedCoupons({ all: pendingCoupon.code });
                    } else if (pendingCoupon.stationTypes) {
                      setAppliedCoupons((prev) => {
                        let updated = { ...prev };
                        if (pendingCoupon.stationTypes?.ps5) updated["ps5"] = pendingCoupon.stationTypes.ps5;
                        if (pendingCoupon.stationTypes?.["8ball"]) updated["8ball"] = pendingCoupon.stationTypes["8ball"];
                        if (pendingCoupon.stationTypes?.vr) updated["vr"] = pendingCoupon.stationTypes.vr;
                        return updated;
                      });
                    }
                    
                    // Show success message based on coupon
                    let successMsg = "";
                    if (pendingCoupon.code === "CUEPHORIA35") {
                      successMsg = "📚 CUEPHORIA35 applied: 35% OFF for students with valid ID!\nShow your student ID when you visit! 🤝";
                    } else if (pendingCoupon.code === "CUEPHORIA20") {
                      successMsg = "🎉 CUEPHORIA20 applied: 20% OFF! Book more, play more! 🕹️";
                    } else if (pendingCoupon.code === "NIT35") {
                      const types = [];
                      if (pendingCoupon.stationTypes?.ps5) types.push("PS5");
                      if (pendingCoupon.stationTypes?.["8ball"]) types.push("8-Ball");
                      if (pendingCoupon.stationTypes?.vr) types.push("VR");
                      successMsg = `🎓 NIT35 applied! 35% OFF for ${types.join(" & ")} stations!`;
                    } else {
                      successMsg = `🎉 ${pendingCoupon.code} applied!`;
                    }
                    toast.success(successMsg);
                  }
                  setShowInstagramFollowDialog(false);
                  setShowFollowConfirmation(false);
                  setInstagramLinkClicked(false);
                  setPendingCoupon(null);
                }}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold"
              >
                Yes, I've Followed
              </Button>
              <Button
                onClick={() => {
                  setShowFollowConfirmation(false);
                }}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Not Yet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Warning Modal */}
      <Dialog open={showPaymentWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping"></div>
                <AlertTriangle className="h-6 w-6 text-yellow-400 relative z-10" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-400">
                Important: Don't Close or Refresh
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/40 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-yellow-300">
                    ⚠️ Please Keep This Window Open
                  </p>
                  <p className="text-xs text-yellow-200/90 leading-relaxed">
                    Your booking will be created automatically after successful payment. 
                    <strong className="text-yellow-300"> Do not close or refresh this browser window</strong> until you receive the booking confirmation.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300/90 leading-relaxed">
                  The payment gateway will open in a moment. After completing payment, you'll be redirected back here to see your booking confirmation.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Loader2 className="h-4 w-4 text-cuephoria-lightpurple animate-spin" />
              <span className="text-xs text-gray-400">
                Opening payment gateway...
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LegalDialog 
        isOpen={showLegalDialog}
        onClose={() => setShowLegalDialog(false)}
        type={legalDialogType}
      />

      {showRefundDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c13] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Refund & Cancellation Policy</h3>
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
                This policy outlines how a booking for a gaming service made through the Platform can be canceled or refunded.
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
                Need help? Call{' '}
                <a className="underline hover:text-white" href="tel:918637625155">
                  +91 86376 25155
                </a>{' '}
                or email{' '}
                <a className="ml-1 underline hover:text-white" href="mailto:contact@cuephoria.in">
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
