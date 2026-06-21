import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { hapticImpact } from "@/utils/capacitor";
import { fetchPublicLocation } from "@/utils/publicLocationResolve";
import { supabase } from "@/integrations/supabase/client";
import { StationSelector } from "@/components/booking/StationSelector";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { BookingStationTypeChips } from "@/components/booking/BookingStationTypeChips";
import { getRateForPlayerCount } from "@/utils/stationPricing";
import { getHh99FinalRate } from "@/utils/sessionCoupon.utils";
import { isStationPublicBookable } from "@/utils/stationTransform";
import { usePublicBookingBrand } from "@/hooks/usePublicBookingBrand";
import { usePublicBookingPopups } from "@/hooks/usePublicBookingPopups";
import {
  buildPublicBookingSlots,
  type DayOccupancyRow,
  fetchDayOccupancy,
  getPublicSlotDurationMinutes,
  stationsAvailableForSlot,
  vrPassesLeftForSlot,
  VR_HOURLY_PASSES,
  VR_PASS_DURATION_MINUTES,
  canMixPublicBookingStations,
} from "@/utils/publicBookingAvailability";
import {
  fetchRazorpayKeyId,
  loadRazorpayScript,
  primeRazorpayCheckout,
} from "@/utils/razorpayCheckout";
import { paymentCallbackQuery, type PublicBookingReturnContext } from "@/utils/publicBookingUrl";
import { usePublicBookingSlotConfig } from "@/hooks/usePublicBookingSlotConfig";
import {
  bookingSlotConfigLabel,
  expandGridSlotsToContiguousRange,
  getGridSelectionSpanMinutes,
  validateAndMergeGridSlots,
} from "@/utils/bookingSlotConfig";
import CouponPromotionalPopup from "@/components/CouponPromotionalPopup";
import BookingConfirmationDialog from "@/components/BookingConfirmationDialog";
import CuephoriaTechAttribution from "@/components/branding/CuephoriaTechAttribution";
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
import { getCustomerSession, clearCustomerSession } from "@/utils/customerAuth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/customer/BottomNav";
import { useViewMode } from "@/context/ViewModeContext";
import StickyMobileActionBar from "@/components/ui/sticky-mobile-action-bar";
import {
  BOOKING_ACCESS_KEYS,
  parseBookingSettingBool,
} from "@/utils/bookingAccessSettings";
import PoolBookingAddonsPanel from "@/components/booking/PoolBookingAddonsPanel";
import {
  POOL_BOOKING_ADDONS_SETTING_KEY,
  type PoolBookingAddon,
} from "@/types/bookingAddons";
import {
  buildBookingAddonsSnapshot,
  calculatePoolAddonTotal,
  mergePoolBookingAddons,
} from "@/utils/bookingAddons.utils";

/* =========================
   Types
   ========================= */
type StationType = "ps5" | "8ball" | "vr";
interface Station {
  id: string;
  name: string;
  type: StationType;
  hourly_rate: number;
  team_name?: string | null;
  team_color?: string | null;
  max_capacity?: number | null;
  single_rate?: number | null;
  max_players?: number;
  occupancy_rates?: Record<string, number>;
  pricing_mode?: 'static' | 'per_player';
  category?: string | null;
  event_enabled?: boolean | null;
  slot_duration?: number | null;
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

/** Enabled coupons from booking_settings — drives public list + generic %/fixed discounts */
interface BookingCouponMeta {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
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

/** HH99 requires every selected slot to fall inside Mon–Fri 11 AM–4 PM. */
const isHappyHourSelection = (date: Date, slots: TimeSlot[]) => {
  if (slots.length === 0) return false;
  return slots.every((slot) => isHappyHour(date, slot));
};

const couponRowEmoji = (code: string) => {
  switch (code) {
    case "NIT35":
      return "🎓";
    case "HH99":
      return "⏰";
    case "CUEPHORIA35":
      return "📚";
    case "CUEPHORIA20":
      return "🎉";
    default:
      return "🏷️";
  }
};

/** Hidden on public booking only (still in DB / admin; not accepted here). */
const PUBLIC_BOOKING_EXCLUDED_COUPON_CODES = new Set([
  "AXEIST",
  "TEST210198$",
  "GAMEINSIDER50",
]);

const FALLBACK_ALLOWED_COUPON_CODES = [
  "CUEPHORIA20",
  "CUEPHORIA35",
  "HH99",
  "NIT35",
  "AAVEG50",
];

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

const getSlotDuration = (station: Station) => getPublicSlotDurationMinutes(station);

const getSlotDurationMinutesFromTime = (startTime: string, endTime: string): number => {
  const parseT = (t: string) => {
    const [h, m, s] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0) + (s ? 0 : 0);
  };
  let mins = parseT(endTime) - parseT(startTime);
  if (mins <= 0) mins += 24 * 60;
  return mins;
};

const BOOKING_STEP_CARD =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f0a1a] via-[#120818] to-[#0a0612] backdrop-blur-xl shadow-[0_8px_40px_rgba(139,92,246,0.08)]";

type PreparedRazorpayCheckout = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  txnId: string;
  slotsCount: number;
};

const regularStations = (stations: Station[]) =>
  stations.filter((s) => !s.category || s.category !== 'nit_event');

const stationsForTypeFilter = (stations: Station[], stationType: 'all' | StationType) => {
  const base = regularStations(stations);
  if (stationType === 'all') return base;
  return base.filter((s) => s.type === stationType);
};

/** Map DB station.type values to booking UI types */
const normalizeStationType = (raw: string | null | undefined): StationType => {
  const t = String(raw ?? '').toLowerCase().trim();
  if (t === 'vr') return 'vr';
  if (t === '8ball' || t === '8-ball' || t === '8_ball' || t === 'snooker') return '8ball';
  return 'ps5';
};

const getBookingDuration = (stationIds: string[], stations: Station[]) => {
  const selected = stations.filter((s) => stationIds.includes(s.id));
  if (selected.length === 0) return 60;
  // Mixed cart always books against 1-hour public slots.
  if (selected.some((s) => s.type === 'vr') && selected.some((s) => s.type !== 'vr')) {
    return 60;
  }
  if (selected.length > 0 && selected.every((s) => s.type === 'vr')) {
    return VR_PASS_DURATION_MINUTES;
  }
  return getSlotDuration(selected[0]);
};

/* =========================
   Component
   ========================= */
export default function PublicBooking({ branchSlug = "main" }: { branchSlug?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isMobile: viewIsMobile } = useViewMode();

  const [publicLocationId, setPublicLocationId] = useState<string | null>(null);
  const [branchLocationLoading, setBranchLocationLoading] = useState(true);
  const [accessSettingsLoading, setAccessSettingsLoading] = useState(false);
  const [publicBookingEnabled, setPublicBookingEnabled] = useState(true);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(true);

  const {
    displayName: tenantDisplayName,
    tagline: tenantTagline,
    logoUrl: tenantLogoUrl,
    locationName: tenantLocationName,
    primaryHex: tenantPrimaryHex,
    isLiteBranch,
    hidePoweredBy,
    workspaceSlug,
    loading: brandLoading,
  } = usePublicBookingBrand(publicLocationId, branchSlug);

  const { config: slotConfig } = usePublicBookingSlotConfig(publicLocationId);

  const isCuephoriaWorkspace = workspaceSlug === "cuephoria";
  const orgSlugParam = searchParams.get("org")?.trim() || undefined;
  const paymentReturnCtx = useMemo<PublicBookingReturnContext>(
    () => ({
      branchSlug,
      locationId: publicLocationId,
      orgSlug:
        orgSlugParam || (workspaceSlug && workspaceSlug !== "cuephoria" ? workspaceSlug : undefined),
    }),
    [branchSlug, publicLocationId, orgSlugParam, workspaceSlug],
  );
  const { config: popupConfig } = usePublicBookingPopups(publicLocationId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBranchLocationLoading(true);
      const locationIdParam = searchParams.get("location")?.trim() || null;
      const orgSlugParam = searchParams.get("org")?.trim() || undefined;

      try {
        const row = await fetchPublicLocation({
          locationId: locationIdParam,
          branchSlug,
          orgSlug: orgSlugParam,
        });
        if (cancelled) return;
        if (row?.id) setPublicLocationId(row.id);
        else {
          console.warn("Branch not found or inactive:", branchSlug, locationIdParam);
          setPublicLocationId(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to resolve public branch:", err);
          setPublicLocationId(null);
        }
      } finally {
        if (!cancelled) setBranchLocationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchSlug, searchParams]);

  useEffect(() => {
    if (!publicLocationId) {
      setAccessSettingsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setAccessSettingsLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from("booking_settings")
          .select("setting_key, setting_value")
          .eq("location_id", publicLocationId)
          .in("setting_key", [
            BOOKING_ACCESS_KEYS.publicBooking,
            BOOKING_ACCESS_KEYS.onlinePayment,
          ]);
        if (cancelled) return;
        if (error) throw error;
        let pub = true;
        let online = true;
        for (const r of rows || []) {
          if (r.setting_key === BOOKING_ACCESS_KEYS.publicBooking) {
            pub = parseBookingSettingBool(r.setting_value);
          }
          if (r.setting_key === BOOKING_ACCESS_KEYS.onlinePayment) {
            online = parseBookingSettingBool(r.setting_value);
          }
        }
        setPublicBookingEnabled(pub);
        setOnlinePaymentEnabled(online);
      } catch (e) {
        console.error("booking access settings:", e);
        setPublicBookingEnabled(true);
        setOnlinePaymentEnabled(true);
      } finally {
        if (!cancelled) setAccessSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicLocationId]);

  // Razorpay keys differ per branch (lite uses RAZORPAY_*_LITE env vars)
  useEffect(() => {
    setRazorpayKeyId("");
  }, [branchSlug, publicLocationId]);

  // Check if user is logged in as customer (for bottom nav)
  const customerSession = getCustomerSession();
  
  const [stations, setStations] = useState<Station[]>([]);
  const [stationType, setStationType] = useState<'all' | StationType>('all');
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [stationPlayerCounts, setStationPlayerCounts] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [availableStationIds, setAvailableStationIds] = useState<string[]>([]); // NEW: Track which stations are available for selected time
  const [checkingStationAvailability, setCheckingStationAvailability] = useState(false); // NEW: Loading state for station availability check
  // Generate a unique session ID for this booking session
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const dayOccupancyRef = useRef<{
    dateStr: string;
    bookings: DayOccupancyRow[];
    sessionBlocks: DayOccupancyRow[];
  } | null>(null);
  const slotsFetchGenRef = useRef(0);
  const todayBookingsRef = useRef<HTMLDivElement>(null);

  const scrollToTodayBookings = () => {
    todayBookingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    hapticImpact("light").catch(() => {});
  };

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
  const [memberVenueCouponValid, setMemberVenueCouponValid] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"venue" | "razorpay">("venue");
  const [loading, setLoading] = useState(false);

  const hasAppliedCoupons = useMemo(
    () => Object.keys(appliedCoupons).length > 0,
    [appliedCoupons]
  );

  useEffect(() => {
    if (!onlinePaymentEnabled && paymentMethod === "razorpay") {
      setPaymentMethod("venue");
    }
  }, [onlinePaymentEnabled, paymentMethod]);

  // Discount coupons require online payment (Razorpay) unless member venue coupon
  useEffect(() => {
    if (hasAppliedCoupons && onlinePaymentEnabled && !memberVenueCouponValid) {
      setPaymentMethod("razorpay");
    }
  }, [hasAppliedCoupons, onlinePaymentEnabled, memberVenueCouponValid]);

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
  const [paymentWarningSeconds, setPaymentWarningSeconds] = useState(3);
  const [paymentPrepReady, setPaymentPrepReady] = useState(false);
  const paymentPrepRef = useRef<Promise<PreparedRazorpayCheckout | null> | null>(null);
  const [showInstagramFollowDialog, setShowInstagramFollowDialog] = useState(false);
  const [instagramLinkClicked, setInstagramLinkClicked] = useState(false);
  const [showFollowConfirmation, setShowFollowConfirmation] = useState(false);
  const [expandedCoupons, setExpandedCoupons] = useState<Record<string, boolean>>({});
  const [pendingCoupon, setPendingCoupon] = useState<{ code: string; type: "all" | "per-station"; stationTypes?: { ps5?: string; "8ball"?: string; vr?: string } } | null>(null);
  
  const [, setSearchParams] = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<"processing" | "success" | "failed" | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>("");
  const [loggedInCustomer, setLoggedInCustomer] = useState<any>(null);

  // Dynamic settings from database
  const [eventName, setEventName] = useState("IIM Event");
  const [eventDescription, setEventDescription] = useState("Choose VR (15m) or PS5 Gaming (30m)");
  const [bookingCouponsFromDB, setBookingCouponsFromDB] = useState<BookingCouponMeta[]>([]);
  const [poolAddonsConfig, setPoolAddonsConfig] = useState<PoolBookingAddon[]>(
    mergePoolBookingAddons(null),
  );
  const [selectedPoolAddonIds, setSelectedPoolAddonIds] = useState<Set<string>>(new Set());
  const hadPoolTableSelectedRef = useRef(false);
  const bookingGroupIdRef = useRef<string>(crypto.randomUUID());

  // Check if customer info is complete (using useMemo to avoid initialization issues)
  const isCustomerInfoComplete = useMemo(() => 
    hasSearched && customerNumber.trim() !== "" && customerInfo.name.trim() !== "",
    [hasSearched, customerNumber, customerInfo]
  );

  const vrPassesLeftByStationId = useMemo(() => {
    const slotsToCheck =
      selectedSlots.length > 0 ? selectedSlots : selectedSlot ? [selectedSlot] : [];
    if (slotsToCheck.length === 0 || !dayOccupancyRef.current) return {};
    const slot = slotsToCheck[0];
    const occ = dayOccupancyRef.current;
    const map: Record<string, number> = {};
    for (const s of stations) {
      if (s.type !== "vr") continue;
      map[s.id] = vrPassesLeftForSlot(
        s.id,
        slot,
        occ.bookings,
        occ.sessionBlocks
      );
    }
    return map;
  }, [selectedSlot, selectedSlots, stations, selectedDate]);

  // Fetch booking settings from database (per branch)
  useEffect(() => {
    if (!publicLocationId) return;

    const fetchBookingSettings = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('booking_settings')
          .select('setting_value')
          .eq('setting_key', 'event_name')
          .eq('location_id', publicLocationId)
          .maybeSingle();

        if (!eventError && eventData) {
          const eventSettings = eventData.setting_value as { name: string; description: string };
          setEventName(eventSettings.name || "IIM Event");
          setEventDescription(eventSettings.description || "Choose VR (15m) or PS5 Gaming (30m)");
        }

        const { data: couponsData, error: couponsError } = await supabase
          .from('booking_settings')
          .select('setting_value')
          .eq('setting_key', 'booking_coupons')
          .eq('location_id', publicLocationId)
          .maybeSingle();

        if (!couponsError && couponsData) {
          const couponsArray = couponsData.setting_value as Array<{
            code: string;
            description?: string;
            discount_type?: string;
            discount_value?: number;
            enabled?: boolean;
          }>;
          const enabled: BookingCouponMeta[] = couponsArray
            .filter((c) => c.enabled !== false && String(c.code || "").trim())
            .map((c) => {
              const code = String(c.code).trim().toUpperCase();
              const dv = c.discount_value;
              const num =
                typeof dv === "number" && Number.isFinite(dv) ? dv : Number(dv) || 0;
              return {
                code,
                description:
                  String(c.description ?? "").trim() || `Discount — ${code}`,
                discount_type: c.discount_type === "fixed" ? "fixed" : "percentage",
                discount_value: Number.isFinite(num) ? num : 0,
              };
            })
            .filter((c) => !PUBLIC_BOOKING_EXCLUDED_COUPON_CODES.has(c.code));
          setBookingCouponsFromDB(enabled);
        }

        const { data: addonsData, error: addonsError } = await supabase
          .from('booking_settings')
          .select('setting_value')
          .eq('setting_key', POOL_BOOKING_ADDONS_SETTING_KEY)
          .eq('location_id', publicLocationId)
          .maybeSingle();

        if (!addonsError) {
          setPoolAddonsConfig(mergePoolBookingAddons(addonsData?.setting_value ?? null));
        }
      } catch (error) {
        console.error('Error fetching booking settings:', error);
        // Fallback to default values already set in state
      }
    };

    fetchBookingSettings();
  }, [publicLocationId]);

  const hasPoolTableSelected = useMemo(
    () =>
      selectedStations.some((id) => {
        const s = stations.find((st) => st.id === id);
        const t = String(s?.type ?? '').toLowerCase();
        return t === '8ball' || t === 'snooker' || t === '8-ball' || t === '8_ball';
      }),
    [selectedStations, stations],
  );

  useEffect(() => {
    if (hasPoolTableSelected && !hadPoolTableSelectedRef.current) {
      const defaults = poolAddonsConfig
        .filter((a) => a.enabled && a.default_selected)
        .map((a) => a.id);
      setSelectedPoolAddonIds(new Set(defaults));
    }
    if (!hasPoolTableSelected) {
      setSelectedPoolAddonIds(new Set());
    }
    hadPoolTableSelectedRef.current = hasPoolTableSelected;
  }, [hasPoolTableSelected, poolAddonsConfig]);

  const togglePoolAddon = (id: string) => {
    setSelectedPoolAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  // Check if customer info is complete (using useMemo to avoid initialization issues)
  useEffect(() => {
    const customerSession = getCustomerSession();
    if (customerSession) {
      setLoggedInCustomer(customerSession);
      setCustomerInfo({
        id: customerSession.id,
        name: customerSession.name,
        phone: customerSession.phone,
        email: customerSession.email || ""
      });
      setCustomerNumber(customerSession.phone);
      setIsReturningCustomer(true);
      setHasSearched(true);
      toast.success(`Welcome back, ${customerSession.name}! 👋 Your information has been pre-filled.`, {
        duration: 3000
      });
    }
  }, []);

  useEffect(() => {
    if (!publicLocationId) return;
    fetchStations();
    fetchTodaysBookings();
  }, [publicLocationId]);


  // Reset selections when customer info is cleared
  useEffect(() => {
    if (!isCustomerInfoComplete) {
      setSelectedStations([]);
      setSelectedSlot(null);
      setSelectedSlots([]);
      setSelectedDate(new Date());
      setStationType('all');
    }
  }, [isCustomerInfoComplete]);

  const handleStationTypeChange = (type: 'all' | StationType) => {
    setStationType(type);
    setSelectedStations((prev) =>
      prev.filter((id) => {
        const s = stations.find((x) => x.id === id);
        if (!s) return false;
        if (type === 'all') return true;
        return s.type === type;
      })
    );
  };

  const clearStep3Selection = () => {
    setSelectedStations([]);
    setStationPlayerCounts({});
  };

  // Changing the date invalidates the selected hour — clear time & stations.
  useEffect(() => {
    clearStep3Selection();
    setSelectedSlot(null);
    setSelectedSlots([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // No time selected — stations in Step 3 are not valid.
  useEffect(() => {
    if (!selectedSlot && selectedSlots.length === 0) {
      clearStep3Selection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot, selectedSlots.length]);

  useEffect(() => {
    const slots =
      selectedSlots.length > 0
        ? selectedSlots
        : selectedSlot
          ? [selectedSlot]
          : [];
    const happyHourOk = isHappyHourSelection(selectedDate, slots);
    if (!happyHourOk && (appliedCoupons["8ball"] === "HH99" || appliedCoupons["ps5"] === "HH99")) {
      setAppliedCoupons((prev) => {
        const copy = { ...prev };
        let removed = false;
        if (copy["8ball"] === "HH99") {
          delete copy["8ball"];
          removed = true;
        }
        if (copy["ps5"] === "HH99") {
          delete copy["ps5"];
          removed = true;
        }
        if (removed) {
          toast.error("❌ HH99 removed: valid only Mon–Fri 11 AM–4 PM");
        }
        return copy;
      });
    }
  }, [selectedDate, selectedSlot, selectedSlots, appliedCoupons]);

  useEffect(() => {
    const ch = supabase
      .channel("booking-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          // NEW FLOW: Refresh slots if date is selected and customer info is complete
          if (isCustomerInfoComplete && selectedDate) fetchAvailableSlots();
          fetchTodaysBookings();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [selectedDate, hasSearched, customerInfo]);

  // Fetch slots when date/type/stations change (single effect — avoids double fetch flicker)
  useEffect(() => {
    if (isCustomerInfoComplete && selectedDate && stations.length > 0 && publicLocationId) {
      fetchAvailableSlots();
    } else if (!isCustomerInfoComplete || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      setSelectedSlots([]);
    }
  }, [selectedDate, selectedStations, isCustomerInfoComplete, stations.length, publicLocationId, slotConfig.slot_interval_minutes]);
  
  // NEW: Update available stations when a time slot is selected
  useEffect(() => {
    const updateAvailableStations = async () => {
      if ((selectedSlot || selectedSlots.length > 0) && stations.length > 0 && selectedDate) {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const hasCache = dayOccupancyRef.current?.dateStr === dateStr;
        if (!hasCache) setCheckingStationAvailability(true);
        try {
          const available = await getAvailableStationsForSlot();
          setAvailableStationIds(available);
        } catch (e) {
          console.error("Error updating available stations:", e);
          setAvailableStationIds([]);
        } finally {
          setCheckingStationAvailability(false);
        }
      } else {
        setAvailableStationIds([]);
        setCheckingStationAvailability(false);
      }
    };

    updateAvailableStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot, selectedSlots, selectedDate, stations.length, stationType]);

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
          hapticImpact("heavy").catch(() => {});
        } catch (e) {
          console.error("Error parsing booking confirmation:", e);
        }
      }
    }
  }, [searchParams]);

   // NOTE: Slot blocks auto-expire server-side; we do not attempt client-side cleanup.

  const mapPublicStationRows = (raw: any[]) =>
    raw
      .filter((s) => isStationPublicBookable(s))
      .map((station) => ({
        ...station,
        type: normalizeStationType(station.type),
        max_players: station.max_players ?? station.max_capacity ?? 1,
        occupancy_rates: station.occupancy_rates ?? {},
        pricing_mode: station.pricing_mode ?? undefined,
      }));

  async function fetchStations() {
    if (!publicLocationId) return;
    try {
      let rawRows: any[] | null = null;

      try {
        const res = await fetch(
          `/api/public/bookable-stations?location=${encodeURIComponent(publicLocationId)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json?.ok && Array.isArray(json.stations)) {
            rawRows = json.stations;
            if (json.location_id && json.location_id !== publicLocationId) {
              console.warn("Public booking: branch location id mismatch", {
                api: json.location_id,
                client: publicLocationId,
              });
            }
          }
        }
      } catch (apiErr) {
        console.warn("Public booking: API station fetch failed, using client", apiErr);
      }

      if (!rawRows) {
        const { data, error } = await (supabase as any)
          .from("stations")
          .select(
            "id, name, type, hourly_rate, team_name, team_color, max_capacity, single_rate, category, event_enabled, slot_duration, max_players, occupancy_rates, pricing_mode"
          )
          .eq("location_id", publicLocationId)
          .order("name");
        if (error) throw error;
        rawRows = data || [];
      }

      const rows = mapPublicStationRows(rawRows);
      setStations(rows);

      if (rows.length === 0 && rawRows.length > 0) {
        console.warn(
          "Public booking: stations exist for branch but none are public (enable On booking page per station)."
        );
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load stations");
    }
  }

  async function fetchAvailableSlots() {
    const gen = ++slotsFetchGenRef.current;
    setSlotsLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

      if (stations.length === 0 || !publicLocationId) {
        setAvailableSlots([]);
        return;
      }

      const pool = regularStations(stations);
      const stationIds = pool.map((s) => s.id);
      const occupancy = await fetchDayOccupancy(dateStr, publicLocationId, stationIds);
      if (gen !== slotsFetchGenRef.current) return;

      dayOccupancyRef.current = {
        dateStr,
        bookings: occupancy.bookings,
        sessionBlocks: occupancy.sessionBlocks,
      };

      const builtSlots = buildPublicBookingSlots({
        stations: pool,
        stationType: 'all',
        selectedStationIds: selectedStations,
        bookings: occupancy.bookings,
        sessionBlocks: occupancy.sessionBlocks,
        isToday,
        slotIntervalMinutes: slotConfig.slot_interval_minutes,
      });

      if (gen !== slotsFetchGenRef.current) return;
      setAvailableSlots(builtSlots);

      if (
        selectedSlot &&
        !builtSlots.some(
          (s) =>
            s.start_time === selectedSlot.start_time &&
            s.end_time === selectedSlot.end_time &&
            s.is_available
        )
      ) {
        setSelectedSlot(null);
        setSelectedSlots([]);
      }
      
      setSelectedSlots(prev => prev.filter(slot =>
        builtSlots.some(
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

    if (!publicLocationId) {
      toast.error("Loading branch… please try again in a moment.");
      return;
    }

    setSearchingCustomer(true);
    try {
      const res = await fetch("/api/webhooks/get-customer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer_phone: normalizedPhone, location_id: publicLocationId }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Failed to fetch customer");

      const data = json?.customer;
      if (json?.found && data) {
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
      const alreadySelected = selectedStations
        .map((sid) => stations.find((s) => s.id === sid))
        .filter((s): s is Station => Boolean(s));

      if (!canMixPublicBookingStations(alreadySelected, station)) {
        const nonVr = alreadySelected.filter((s) => s.type !== 'vr');
        const refDur = nonVr.length > 0 ? getSlotDuration(nonVr[0]) : getSlotDuration(station);
        const newDur = getSlotDuration(station);
        toast.error(
          `Cannot mix stations with different session lengths (${refDur} min vs ${newDur} min)`,
        );
        return;
      }
    }
    
    // Update selected stations without clearing slot selection
    setSelectedStations((prev) => {
      if (prev.includes(id)) {
        setStationPlayerCounts((counts) => {
          const next = { ...counts };
          delete next[id];
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      setStationPlayerCounts((counts) => ({ ...counts, [id]: counts[id] ?? 1 }));
      return [...prev, id];
    });
    // DON'T reset slots - keep the selected time
  };

  const handlePlayerCountChange = (stationId: string, count: number) => {
    const station = stations.find((s) => s.id === stationId);
    if (station?.type === 'vr') {
      const passesLeft = vrPassesLeftByStationId[stationId] ?? VR_HOURLY_PASSES;
      const maxPasses = Math.max(1, Math.min(VR_HOURLY_PASSES, passesLeft));
      setStationPlayerCounts((prev) => ({
        ...prev,
        [stationId]: Math.min(maxPasses, Math.max(1, count)),
      }));
      return;
    }
    setStationPlayerCounts((prev) => ({ ...prev, [stationId]: count }));
  };

  function handleSlotSelect(slot: TimeSlot) {
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
      clearStep3Selection();
      return;
    }
    
    if (selectedSlots.length > 0 || selectedSlot) {
      const ref = selectedSlot ?? selectedSlots[0];
      const refDur = getSlotDurationMinutesFromTime(ref.start_time, ref.end_time);
      const newDur = getSlotDurationMinutesFromTime(slot.start_time, slot.end_time);
      if (refDur !== newDur) {
        toast.error('Cannot mix different session lengths. Deselect other slots first.');
        return;
      }
    }

    // Time changed — station availability is hour-specific; reset Step 3.
    clearStep3Selection();

    const nextSlots = [...selectedSlots, slot];
    let slotsToSet = nextSlots;

    if (nextSlots.length >= 2) {
      const expanded = expandGridSlotsToContiguousRange(
        nextSlots.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
        availableSlots,
        slotConfig.slot_interval_minutes,
      );
      if (!expanded.ok) {
        toast.error(expanded.error);
        return;
      }
      slotsToSet = expanded.slots.map((gs) => {
        const found = availableSlots.find(
          (a) => a.start_time === gs.start_time && a.end_time === gs.end_time,
        );
        return found ?? { ...gs, is_available: true };
      });
    }

    setSelectedSlots(slotsToSet);
    setSelectedSlot(slotsToSet[slotsToSet.length - 1]);
  }

  // Use dynamic coupons from database, fallback to defaults if not loaded yet
  const allowedCoupons =
    bookingCouponsFromDB.length > 0
      ? bookingCouponsFromDB.map((c) => c.code)
      : FALLBACK_ALLOWED_COUPON_CODES;

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
    setMemberVenueCouponValid(false);
  }

  async function tryMemberVenueCoupon(code: string): Promise<boolean> {
    if (!publicLocationId || !customerInfo.phone?.trim()) return false;
    try {
      const res = await fetch("/api/tenant/membership-coupon-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: publicLocationId,
          phone: customerInfo.phone.trim(),
          code: code.toUpperCase().trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.ok) {
        setMemberVenueCouponValid(true);
        setAppliedCoupons({ all: code.toUpperCase().trim() });
        setPaymentMethod("venue");
        toast.success("Member coupon applied — you can pay at the venue.");
        return true;
      }
    } catch {
      /* fall through to standard coupons */
    }
    return false;
  }

  async function applyCoupon(raw: string) {
    const code = (raw || "").toUpperCase().trim();
    if (!code) return;

    if (await tryMemberVenueCoupon(code)) return;

    if (!onlinePaymentEnabled) {
      toast.error("Online payment is unavailable. Coupons cannot be applied — pay at venue without a coupon or call us.");
      return;
    }

    setMemberVenueCouponValid(false);
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
    const slotsForCoupon =
      selectedSlots.length > 0
        ? selectedSlots
        : selectedSlot
          ? [selectedSlot]
          : [];
    const happyHourActive = isHappyHourSelection(selectedDate, slotsForCoupon);

    // Check if customer is new (no customerInfo.id means new customer)
    const isNewCustomer = !customerInfo.id;
    
    // Helper function to check if Instagram follow dialog should be shown
    const shouldShowInstagramDialog = (couponCode: string) => {
      const gate = popupConfig.instagram_gate;
      if (!gate.enabled) return false;
      if (!gate.require_for_coupon_codes.includes(couponCode.toUpperCase().trim())) return false;
      if (!isNewCustomer) return false;
      
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

    // Configured in Settings → Booking: generic % or fixed off entire selection
    const dbMeta = bookingCouponsFromDB.find((c) => c.code === code);
    if (dbMeta) {
      setAppliedCoupons({ all: dbMeta.code });
      if (dbMeta.discount_type === "percentage") {
        toast.success(
          `🎟️ ${dbMeta.code} applied: ${dbMeta.discount_value}% off your booking!`
        );
      } else {
        toast.success(
          `🎟️ ${dbMeta.code} applied: ${INR(dbMeta.discount_value)} off your booking!`
        );
      }
      return;
    }
  }

  const handleCouponApply = () => {
    applyCoupon(couponCode);
    setCouponCode("");
  };

  // NEW: Filter stations to show only those available for the selected time slot
  // IMPORTANT: For PS5 teams, if ANY controller from a team is booked, hide ALL controllers from that team
  const getAvailableStationsForSlot = async (): Promise<string[]> => {
    if (!selectedSlot && selectedSlots.length === 0) return [];
    if (stations.length === 0 || !publicLocationId) return [];

    const slotsToCheck =
      selectedSlots.length > 0 ? selectedSlots : selectedSlot ? [selectedSlot] : [];
    if (slotsToCheck.length === 0) return [];

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const pool = regularStations(stations);

    try {
      let occupancy = dayOccupancyRef.current;
      if (!occupancy || occupancy.dateStr !== dateStr) {
        occupancy = await fetchDayOccupancy(
          dateStr,
          publicLocationId,
          pool.map((s) => s.id)
        );
        dayOccupancyRef.current = { dateStr, ...occupancy };
      }

      let result: string[] | null = null;
      for (const slot of slotsToCheck) {
        const forSlot = stationsAvailableForSlot(
          pool,
          slot,
          occupancy.bookings,
          occupancy.sessionBlocks,
          stationType
        );
        if (result === null) {
          result = forSlot;
        } else {
          const set = new Set(forSlot);
          result = result.filter((id) => set.has(id));
        }
      }
      return result ?? [];
    } catch (e) {
      console.error("Error getting available stations:", e);
      return [];
    }
  };

  const calculateOriginalPrice = () => {
    if (selectedStations.length === 0) return 0;
    if (!selectedSlot && selectedSlots.length === 0) return 0;

    const selectedStationObjects = stations.filter((s) => selectedStations.includes(s.id));

    return selectedStationObjects.reduce((sum, s) => {
      return sum + getStationSessionPrice(s);
    }, 0);
  };

  const toStationPricingInput = (s: Station) => ({
    hourlyRate: s.hourly_rate,
    maxPlayers: s.max_players ?? s.max_capacity ?? 1,
    occupancyRates: s.occupancy_rates ?? {},
    type: s.type,
    slotDuration: s.slot_duration,
    category: s.category,
    teamName: s.team_name,
    singleRate: s.single_rate,
    maxCapacity: s.max_capacity,
    pricingMode: s.pricing_mode,
  });

  const getStationSessionPrice = (s: Station) => {
    const count = stationPlayerCounts[s.id] ?? 1;
    if (s.type === "vr") {
      return s.hourly_rate * count;
    }
    return getRateForPlayerCount(toStationPricingInput(s), count).totalRate;
  };

  const sumStationSessionPrices = (stationList: Station[]) =>
    stationList.reduce((sum, s) => sum + getStationSessionPrice(s), 0);

  const computeHh99Discount = (stationList: Station[]) =>
    stationList.reduce((discount, s) => {
      const undiscounted = getStationSessionPrice(s);
      const count = stationPlayerCounts[s.id] ?? 1;
      const finalRate = getHh99FinalRate(toStationPricingInput(s), count);
      return discount + Math.max(0, undiscounted - finalRate);
    }, 0);

  const getLegacyPercentRate = (couponCode: string): number | null => {
    const dbCoupon = bookingCouponsFromDB.find((c) => c.code === couponCode);
    if (dbCoupon?.discount_type === "percentage") {
      return Math.min(100, Math.max(0, dbCoupon.discount_value)) / 100;
    }
    if (couponCode === "NIT35") return 0.35;
    if (couponCode === "AAVEG50") return 0.5;
    return null;
  };

  const computePercentDiscount = (stationList: Station[], couponCode: string) => {
    const rate = getLegacyPercentRate(couponCode);
    if (rate == null) return 0;
    return sumStationSessionPrices(stationList) * rate;
  };

  const calculateDiscount = () => {
    const original = calculateOriginalPrice();
    if (original === 0) return { total: 0, breakdown: {} as Record<string, number> };
    if (!Object.keys(appliedCoupons).length)
      return { total: 0, breakdown: {} as Record<string, number> };

    if (appliedCoupons["all"]) {
      if (appliedCoupons["all"] === "CUEPHORIA20") {
        const disc = original * 0.20;
        return { total: disc, breakdown: { all: disc } };
      }
      if (appliedCoupons["all"] === "CUEPHORIA35") {
        const disc = original * 0.35;
        return { total: disc, breakdown: { all: disc } };
      }
      const dbAll = bookingCouponsFromDB.find(
        (c) => c.code === appliedCoupons["all"]
      );
      if (dbAll) {
        if (dbAll.discount_type === "percentage") {
          const rate = Math.min(100, Math.max(0, dbAll.discount_value)) / 100;
          const disc = original * rate;
          return { total: disc, breakdown: { [dbAll.code]: disc } };
        }
        const disc = Math.min(original, Math.max(0, dbAll.discount_value));
        return { total: disc, breakdown: { [dbAll.code]: disc } };
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
      const d = computeHh99Discount(eightBalls);
      if (d > 0) {
        totalDiscount += d;
        breakdown["8-Ball (HH99)"] = d;
      }
      const ps5s = stations.filter(
        (s) => selectedStations.includes(s.id) && s.type === "ps5"
      );
      const d2 = computePercentDiscount(ps5s, "NIT35");
      totalDiscount += d2;
      breakdown["PS5 (HH99+NIT35)"] = d2;
    } else {
      if (appliedCoupons["8ball"] === "HH99") {
        const eightBalls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const d = computeHh99Discount(eightBalls);
        if (d > 0) {
          totalDiscount += d;
          breakdown["8-Ball (HH99)"] = d;
        }
      }

      if (appliedCoupons["ps5"] === "HH99") {
        const ps5s = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "ps5"
        );
        const d = computeHh99Discount(ps5s);
        if (d > 0) {
          totalDiscount += d;
          breakdown["PS5 (HH99)"] = d;
        }
      }

      if (appliedCoupons["8ball"] === "NIT35" || appliedCoupons["8ball"] === "AAVEG50") {
        const balls = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "8ball"
        );
        const code = appliedCoupons["8ball"];
        const d = computePercentDiscount(balls, code);
        totalDiscount += d;
        breakdown[`8-Ball (${code})`] = d;
      }

      if (appliedCoupons["ps5"] === "NIT35" || appliedCoupons["ps5"] === "AAVEG50") {
        const ps5s = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "ps5"
        );
        const code = appliedCoupons["ps5"];
        const d = computePercentDiscount(ps5s, code);
        totalDiscount += d;
        breakdown[`PS5 (${code})`] = d;
      }

      if (appliedCoupons["vr"] === "NIT35" || appliedCoupons["vr"] === "AAVEG50") {
        const vrStations = stations.filter(
          (s) => selectedStations.includes(s.id) && s.type === "vr"
        );
        const code = appliedCoupons["vr"];
        const d = computePercentDiscount(vrStations, code);
        totalDiscount += d;
        breakdown[`VR (${code})`] = d;
      }
    }

    return { total: totalDiscount, breakdown };
  };

  const originalPrice = calculateOriginalPrice();
  const discountObj = calculateDiscount();
  const discount = discountObj.total;
  const discountBreakdown = discountObj.breakdown;
  const finalPrice = Math.max(originalPrice - discount, 0);
  const poolAddonTotal = hasPoolTableSelected
    ? calculatePoolAddonTotal(poolAddonsConfig, selectedPoolAddonIds)
    : 0;
  const bookingAddonsSnapshot = hasPoolTableSelected
    ? buildBookingAddonsSnapshot(poolAddonsConfig, selectedPoolAddonIds)
    : null;

  const selectedGridSlots = useMemo(
    () => (selectedSlots.length > 0 ? selectedSlots : selectedSlot ? [selectedSlot] : []),
    [selectedSlots, selectedSlot],
  );

  const mergedSlotSelection = useMemo(() => {
    if (selectedGridSlots.length === 0) return null;
    return validateAndMergeGridSlots(
      selectedGridSlots.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
      slotConfig,
    );
  }, [selectedGridSlots, slotConfig]);

  /** Billable session blocks (0 until minimum contiguous slots are selected). */
  const bookingSessionCount = mergedSlotSelection?.ok ? mergedSlotSelection.sessionBlocks : 0;

  const selectedDurationMinutes = useMemo(() => {
    if (mergedSlotSelection?.ok) {
      return mergedSlotSelection.sessions.reduce((sum, session) => sum + session.duration, 0);
    }
    if (selectedGridSlots.length > 0) {
      return getGridSelectionSpanMinutes(
        selectedGridSlots.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
      );
    }
    return 0;
  }, [mergedSlotSelection, selectedGridSlots]);

  const slotSelectionHint =
    selectedGridSlots.length > 0 && mergedSlotSelection && !mergedSlotSelection.ok
      ? mergedSlotSelection.error
      : slotConfig.slots_per_minimum > 1
        ? `Minimum ${slotConfig.minimum_booking_minutes} minutes — select ${slotConfig.slots_per_minimum} consecutive ${slotConfig.slot_interval_minutes}-minute slots.`
        : null;

  const slotSelectionSummary =
    selectedGridSlots.length === 0
      ? null
      : mergedSlotSelection?.ok
        ? `${slotConfig.minimum_booking_minutes}-minute session ready — choose stations in Step 3`
        : `${selectedGridSlots.length} of ${slotConfig.slots_per_minimum} slots selected`;

  const isStationSelectionAvailable = () => isCustomerInfoComplete;
  const isTimeSelectionAvailable = () =>
    isStationSelectionAvailable() && selectedStations.length > 0;

  // ✅ UPDATED: createVenueBooking with duplicate check and Customer ID
  async function createVenueBooking() {
    setLoading(true);
    try {
      const couponCodes = Object.values(appliedCoupons).join(",");
      
      const slotsToBook = selectedGridSlots;

      if (slotsToBook.length === 0) {
        toast.error("Please select at least one time slot");
        return;
      }

      const merged = validateAndMergeGridSlots(
        slotsToBook.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
        slotConfig,
      );
      if (!merged.ok) {
        toast.error(merged.error);
        return;
      }

      const normalizedPhone = normalizePhoneNumber(customerInfo.phone);
      const validation = validatePhoneNumber(normalizedPhone);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid phone number");
        return;
      }
      
      // Price per minimum session block × number of merged sessions
      const sessionBlocks = merged.sessionBlocks;
      const totalOriginalPrice = originalPrice * sessionBlocks;
      const totalDiscountAmount = discount * sessionBlocks;
      const totalFinalPrice = finalPrice * sessionBlocks + poolAddonTotal;

      if (!publicLocationId) {
        toast.error("Branch not ready. Please refresh the page.");
        return;
      }

      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerInfo: {
            ...customerInfo,
            phone: normalizedPhone,
          },
          selectedStations,
          selectedDate: format(selectedDate, "yyyy-MM-dd"),
          selectedSlot: selectedSlot ?? slotsToBook[0],
          selectedSlots: slotsToBook,
          bookingSessions: merged.sessions,
          originalPrice,
          discount,
          finalPrice,
          appliedCoupons,
          payment_mode: "venue",
          sessionId,
          location_id: publicLocationId,
          stationPlayerCounts,
          bookingAddons: bookingAddonsSnapshot,
          booking_group_id: bookingGroupIdRef.current,
        }),
      });

      const responseText = await res.text();
      let json: { ok?: boolean; error?: string; details?: string; conflict?: boolean; bookingId?: string } | null = null;
      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        console.error("Booking API non-JSON response:", res.status, responseText.slice(0, 200));
        throw new Error(
          res.ok
            ? "Invalid response from booking server"
            : "Booking server error. Please try again or contact the venue.",
        );
      }
      if (!json?.ok) {
        if (json?.conflict) {
          toast.error(json?.error || "Selected slot is no longer available. Please select another time slot.");
          return;
        }
        const errMsg = json?.error || "Failed to create booking";
        console.error("Booking API error:", errMsg, json?.details);
        throw new Error(errMsg);
      }

      const stationObjects = stations.filter((s) =>
        selectedStations.includes(s.id)
      );
      
      const hasVR = selectedStations.some(id => 
        stations.find(s => s.id === id && s.type === 'vr')
      );
      const firstSession = merged.sessions[0];
      const sessionDuration = hasVR
        ? `60 minutes (${VR_HOURLY_PASSES} VR passes per hour)`
        : `${firstSession?.duration ?? slotConfig.minimum_booking_minutes} minutes`;
      
      const displaySlot = firstSession ?? selectedSlot ?? slotsToBook[0];
      const displayEndSlot = merged.sessions[merged.sessions.length - 1] ?? displaySlot;
      
      setBookingConfirmationData({
        bookingId: String(json.bookingId || "").slice(0, 8).toUpperCase(),
        customerName: customerInfo.name,
        stationNames: stationObjects.map((s) => s.name),
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: new Date(`2000-01-01T${displaySlot.start_time}`).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        ),
        endTime: new Date(`2000-01-01T${displayEndSlot.end_time}`).toLocaleTimeString(
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
      hapticImpact("heavy").catch(() => {});

      setSelectedStations([]);
      setSelectedSlot(null);
      setSelectedSlots([]);
      setCustomerNumber("");
      setCustomerInfo({ name: "", phone: "", email: "" });
      setIsReturningCustomer(false);
      setHasSearched(false);
      setCouponCode("");
      setAppliedCoupons({});
      setSelectedPoolAddonIds(new Set());
      bookingGroupIdRef.current = crypto.randomUUID();
      setAvailableSlots([]);
    } catch (e) {
      console.error(e);
      const msg = (e as any)?.message;
      toast.error(msg && msg !== "Failed to create booking" ? msg : "Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Warm Razorpay script + key as soon as online pay is available (and when selected).
  useEffect(() => {
    if (!onlinePaymentEnabled || !publicLocationId) return;
    let cancelled = false;
    primeRazorpayCheckout(isLiteBranch, publicLocationId);
    fetchRazorpayKeyId(isLiteBranch, publicLocationId)
      .then((keyId) => {
        if (!cancelled) setRazorpayKeyId(keyId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onlinePaymentEnabled, isLiteBranch, publicLocationId]);

  useEffect(() => {
    if (paymentMethod === "razorpay" && onlinePaymentEnabled && publicLocationId) {
      primeRazorpayCheckout(isLiteBranch, publicLocationId);
    }
  }, [paymentMethod, onlinePaymentEnabled, isLiteBranch, publicLocationId]);

  const prepareRazorpayPayment = async (): Promise<PreparedRazorpayCheckout | null> => {
    if (!onlinePaymentEnabled) {
      toast.error("Online payment is unavailable right now. Please pay at the venue or call us to book.");
      return null;
    }

    const slotsToBook = selectedGridSlots;

    if (slotsToBook.length === 0) {
      toast.error("Please select at least one time slot");
      return null;
    }

    const merged = validateAndMergeGridSlots(
      slotsToBook.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
      slotConfig,
    );
    if (!merged.ok) {
      toast.error(merged.error);
      return null;
    }

    const sessionBlocks = merged.sessionBlocks;
    const totalPrice = finalPrice * sessionBlocks + poolAddonTotal;

    if (totalPrice <= 0) {
      toast.error("Amount must be greater than 0 for online payment.");
      return null;
    }
    if (!customerInfo.phone) {
      toast.error("Customer phone is required for payment.");
      return null;
    }

    const transactionFee = Math.round(totalPrice * 0.025 * 100) / 100;
    const totalWithFee = totalPrice + transactionFee;
    const txnId = genTxnId();
    const bookingDuration = merged.sessions[0]?.duration ?? getBookingDuration(selectedStations, stations);

    const pendingBooking = {
      selectedStations,
      stationPlayerCounts,
      selectedDateISO: format(selectedDate, "yyyy-MM-dd"),
      slots: merged.sessions.map((slot) => ({
        start_time: slot.start_time,
        end_time: slot.end_time,
      })),
      gridSlots: merged.gridSlots,
      duration: bookingDuration,
      customer: customerInfo,
      locationId: publicLocationId,
      pricing: {
        original: originalPrice * sessionBlocks,
        discount: discount * sessionBlocks,
        final: totalPrice,
        transactionFee,
        totalWithFee,
        coupons: Object.values(appliedCoupons).join(","),
        addonTotal: poolAddonTotal,
      },
      bookingAddons: bookingAddonsSnapshot,
      booking_group_id: bookingGroupIdRef.current,
      returnContext: paymentReturnCtx,
    };
    localStorage.setItem("pendingBooking", JSON.stringify(pendingBooking));

    const bookingDataCompact = JSON.stringify({
      s: selectedStations,
      d: format(selectedDate, "yyyy-MM-dd"),
      t: merged.sessions.map((s) => ({ s: s.start_time, e: s.end_time })),
      du: bookingDuration,
      pc: selectedStations.map((id) => stationPlayerCounts[id] ?? 1),
      c: {
        n: customerInfo.name,
        p: customerInfo.phone,
        e: customerInfo.email || "",
        i: customerInfo.id || "",
      },
      p: {
        o: originalPrice * sessionBlocks,
        d: discount * sessionBlocks,
        f: totalPrice,
        tf: transactionFee,
        twf: totalWithFee,
      },
      cp: Object.values(appliedCoupons).join(","),
      ...(bookingAddonsSnapshot
        ? {
            ba: {
              items: bookingAddonsSnapshot.items,
              t: bookingAddonsSnapshot.total,
            },
            bg: bookingGroupIdRef.current,
          }
        : {}),
    });

    const notes: Record<string, string> = {
      customer_name: customerInfo.name,
      customer_phone: customerInfo.phone,
      customer_email: customerInfo.email || "",
      booking_date: format(selectedDate, "yyyy-MM-dd"),
      stations: selectedStations.join(","),
    };

    if (bookingDataCompact.length <= 256) {
      notes.booking_data = bookingDataCompact;
    } else {
      notes.booking_data_1 = bookingDataCompact.substring(0, 256);
      if (bookingDataCompact.length > 256) {
        notes.booking_data_2 = bookingDataCompact.substring(256, 512);
      }
    }

    await loadRazorpayScript();

    const keyPromise = fetchRazorpayKeyId(isLiteBranch, publicLocationId);

    const orderPromise = fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "razorpay",
        currency: "INR",
        amount: totalWithFee,
        receipt: txnId,
        notes,
        location_id: publicLocationId || undefined,
        customer: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email || "",
        },
        booking_payload: pendingBooking,
        kind: "booking",
        ...(isLiteBranch ? { profile: "lite" } : {}),
      }),
    });

    const [orderRes, keyId] = await Promise.all([orderPromise, keyPromise]);
    const orderData = await orderRes.json().catch(() => null);

    if (!orderRes.ok || !orderData?.ok || !orderData?.orderId) {
      const error = orderData?.error || "Failed to create payment order";
      if (orderData?.conflict || orderRes.status === 409) {
        toast.error(error);
      } else {
        toast.error(`Payment setup failed: ${error}`);
      }
      return null;
    }

    const resolvedKeyId = orderData.keyId || keyId;
    if (resolvedKeyId) {
      setRazorpayKeyId(resolvedKeyId);
    }

    return {
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      keyId: resolvedKeyId,
      txnId,
      slotsCount: sessionBlocks,
    };
  };

  const openRazorpayCheckout = (prepared: PreparedRazorpayCheckout) => {
    if (!(window as Window & { Razorpay?: new (opts: unknown) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }).Razorpay) {
      toast.error("Payment gateway is still loading. Please try again.");
      setLoading(false);
      return;
    }

    const options = {
      key: prepared.keyId,
      amount: prepared.amount,
      currency: prepared.currency,
      name: tenantDisplayName,
      description: `Booking for ${prepared.slotsCount} slot(s)`,
      order_id: prepared.orderId,
      handler: function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        const returnQs = paymentCallbackQuery(paymentReturnCtx);
        window.location.href = `/public/payment/success?payment_id=${encodeURIComponent(response.razorpay_payment_id)}&order_id=${encodeURIComponent(response.razorpay_order_id)}&signature=${encodeURIComponent(response.razorpay_signature)}${returnQs}`;
      },
      prefill: {
        name: customerInfo.name,
        email: customerInfo.email || "",
        contact: customerInfo.phone,
      },
      notes: {
        transaction_id: prepared.txnId,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
      },
      theme: {
        color: tenantPrimaryHex,
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
          toast.info("Payment was cancelled");
        },
      },
    };

    const rzp = new (window as Window & { Razorpay: new (opts: unknown) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }).Razorpay(options);

    rzp.on("payment.failed", function (response: { error?: { description?: string; reason?: string } }) {
      const error = response.error?.description || response.error?.reason || "Payment failed";
      toast.error(`Payment failed: ${error}`);
      setLoading(false);
      const returnQs = paymentCallbackQuery(paymentReturnCtx);
      window.location.href = `/public/payment/failed?order_id=${encodeURIComponent(prepared.orderId)}&error=${encodeURIComponent(error)}${returnQs}`;
    });

    rzp.open();
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
    if (!isCustomerInfoComplete) {
      toast.error("Please complete customer information first");
      return;
    }
    if (hasAppliedCoupons && !onlinePaymentEnabled) {
      toast.error("Coupons require online payment, which is unavailable. Remove the coupon or call us.");
      return;
    }
    if (hasAppliedCoupons && paymentMethod !== "razorpay" && !memberVenueCouponValid) {
      toast.error("Please choose Pay Online — coupons are only valid with online payment.");
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
      if (serviceType && onlinePaymentEnabled && popupConfig.online_payment_promo.enabled) {
        setShowOnlinePaymentPromo(true);
        return;
      }
      await createVenueBooking();
    } else {
      if (!onlinePaymentEnabled) {
        toast.error("Online payment is unavailable. Please pay at the venue or call us.");
        return;
      }
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
    if (!onlinePaymentEnabled) {
      await createVenueBooking();
      return;
    }
    setPaymentMethod("razorpay");
    setShowPaymentWarning(true);
  };

  const handlePromoDecline = async () => {
    setShowOnlinePaymentPromo(false);
    // Proceed with venue booking
    await createVenueBooking();
  };

  // Show warning 3s while preloading order + Razorpay in the background, then open instantly.
  useEffect(() => {
    if (!showPaymentWarning) {
      paymentPrepRef.current = null;
      setPaymentPrepReady(false);
      setPaymentWarningSeconds(3);
      return;
    }

    let cancelled = false;
    setPaymentWarningSeconds(3);
    setPaymentPrepReady(false);
    setLoading(true);

    const prep = prepareRazorpayPayment();
    paymentPrepRef.current = prep;
    prep
      .then((result) => {
        if (!cancelled && result) setPaymentPrepReady(true);
      })
      .catch(() => {
        if (!cancelled) setPaymentPrepReady(false);
      });

    const countdown = window.setInterval(() => {
      setPaymentWarningSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    const openTimer = window.setTimeout(async () => {
      if (cancelled) return;
      setShowPaymentWarning(false);
      try {
        const prepared = await prep;
        if (!prepared) {
          setLoading(false);
          return;
        }
        openRazorpayCheckout(prepared);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`Unable to start payment: ${msg}`);
        setLoading(false);
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(countdown);
      window.clearTimeout(openTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaymentWarning]);

  function maskPhone(p?: string) {
    if (!p) return "";
    const s = p.replace(/\D/g, "");
    if (s.length <= 4) return s;
    return `${s.slice(0, 3)}${"X".repeat(Math.max(0, s.length - 5))}${s.slice(-2)}`;
  }

  async function fetchTodaysBookings() {
    if (!publicLocationId) {
      setTodayRows([]);
      return;
    }
    setTodayLoading(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_date, start_time, end_time, status, station_id, customer_id"
        )
        .eq("booking_date", todayStr)
        .eq("location_id", publicLocationId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      if (!bookingsData?.length) {
        setTodayRows([]);
        setTodayLoading(false);
        return;
      }

      const stationIds = [...new Set(bookingsData.map((b) => b.station_id))];

      // SECURITY: do not fetch customer PII for public pages.
      const { data: stationsData } = await supabase
        .from("stations")
        .select("id, name")
        .in("id", stationIds);

      const rows: TodayBookingRow[] = bookingsData.map((b) => {
        const st = stationsData?.find((s) => s.id === b.station_id);
        return {
          id: b.id,
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          status: b.status as TodayBookingRow["status"],
          station_id: b.station_id,
          customer_id: b.customer_id,
          stationName: st?.name || "—",
          customerName: "—",
          customerPhone: "",
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

  const gateLoading =
    branchLocationLoading ||
    (!!publicLocationId && (accessSettingsLoading || brandLoading));

  if (gateLoading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          isLiteBranch
            ? "bg-gradient-to-br from-[#060d10] via-[#080e14] to-[#060d10]"
            : "bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]"
        }`}
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-gray-400 text-sm">Loading booking…</p>
      </div>
    );
  }

  if (!branchLocationLoading && !publicLocationId) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          isLiteBranch
            ? "bg-gradient-to-br from-[#060d10] via-[#080e14] to-[#060d10]"
            : "bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]"
        }`}
      >
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Branch unavailable</h1>
        <p className="text-gray-400 text-center max-w-md">
          This booking link is not valid or the branch is inactive. Please contact us for assistance.
        </p>
      </div>
    );
  }

  if (publicLocationId && !publicBookingEnabled) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          isLiteBranch
            ? "bg-gradient-to-br from-[#060d10] via-[#080e14] to-[#060d10]"
            : "bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]"
        }`}
      >
        <Headset className="h-14 w-14 text-primary mb-4 opacity-90" />
        <h1 className="text-xl font-semibold text-white mb-3 text-center">
          Booking service unavailable
        </h1>
        <p className="text-gray-300 text-center max-w-md leading-relaxed">
          Sorry for the inconvenience. Online booking is temporarily turned off for this branch.
          Please call us to make your reservation — our team will be happy to help.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
          <Phone className="h-4 w-4" />
          <span>Use the phone number on our website or Google listing.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-x-hidden max-w-full min-w-0 ${
      isLiteBranch
        ? "bg-gradient-to-br from-[#060d10] via-[#080e14] to-[#060d10]"
        : "bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12]"
    } ${customerSession ? 'pb-20' : ''}`}>
      <div className="pointer-events-none absolute inset-0">
        {isLiteBranch ? (
          <>
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-sky-600/10 blur-3xl" />
            <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cuephoria-purple/20 blur-3xl" />
            <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-cuephoria-blue/20 blur-3xl" />
            <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cuephoria-lightpurple/20 blur-3xl" />
          </>
        )}
      </div>

      {popupConfig.coupon_promo_enabled && (
      <CouponPromotionalPopup
        config={popupConfig}
        onCouponSelect={applyCoupon}
        blockWhenOpen={showOnlinePaymentPromo || showInstagramFollowDialog || showFollowConfirmation}
      />
      )}

      <header className="py-10 px-4 sm:px-6 md:px-8 relative z-10 text-center">
        <div className="max-w-7xl mx-auto w-full">
          {/* Back to Dashboard Button (only for logged-in customers) */}
          {loggedInCustomer && (
            <Button
              variant="ghost"
              className="mb-4 text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/customer/dashboard')}
            >
              <ArrowLeft className="mr-2" size={18} />
              Back to Home
            </Button>
          )}
          
          <div className="flex flex-col items-center mb-8 w-full text-center">
            {tenantLogoUrl ? (
              <div className="mb-6 mx-auto">
                <img
                  src={tenantLogoUrl}
                  alt={`${tenantDisplayName} logo`}
                  className="h-24 max-w-[220px] object-contain drop-shadow-[0_0_25px_rgba(168,85,247,0.15)]"
                />
              </div>
            ) : (
              <h2 className="mb-4 text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {tenantDisplayName}
              </h2>
            )}

            {isLiteBranch ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs tracking-widest uppercase text-cyan-300 backdrop-blur-md">
                <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                {tenantLocationName || `${tenantDisplayName} Lite`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs tracking-widest uppercase text-gray-300 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {tenantTagline}
              </span>
            )}

            <h1 className="mt-3 w-full text-3xl sm:text-4xl md:text-5xl font-extrabold text-white text-center px-2">
              Book Your Gaming Session
            </h1>
            <p className="mt-2 w-full text-base sm:text-lg text-gray-300/90 max-w-2xl text-center px-2">
              {isLiteBranch
                ? `Reserve your session at ${tenantDisplayName}${tenantLocationName ? ` — ${tenantLocationName}` : ""}`
                : `Reserve PlayStation 5, Pool Table, or VR Gaming sessions at ${tenantDisplayName}`}
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={scrollToTodayBookings}
              className="mt-4 h-8 rounded-full border-white/15 bg-white/5 px-3 text-xs text-gray-200 hover:bg-white/10 hover:text-white gap-1.5"
            >
              <Clock className="h-3.5 w-3.5 text-cuephoria-lightpurple shrink-0" />
              Today&apos;s bookings
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
            </Button>

              <div className={`mt-3 w-full max-w-2xl rounded-2xl border px-4 py-2 text-[11px] sm:text-xs backdrop-blur-md ${
                isLiteBranch
                  ? "border-cyan-500/20 bg-cyan-500/5 text-cyan-200/70"
                  : "border-white/10 bg-white/5 text-gray-300"
              }`}>
                <div className="flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-2">
                  <span className={`font-semibold tracking-wide ${isLiteBranch ? "text-cyan-100" : "text-gray-200"}`}>
                    {tenantLocationName || tenantDisplayName}
                  </span>
                  <span className="hidden sm:inline text-white/25">•</span>
                  <span className="leading-snug">
                    Amusement &amp; Gaming Lounge Services (time-based PS5, 8-Ball &amp; VR rentals)
                  </span>
                </div>
              </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto pb-14 relative z-10">
        <section className={`mb-6 rounded-2xl border px-4 py-4 text-sm ${
          isLiteBranch
            ? "border-cyan-500/20 bg-cyan-500/5 text-cyan-200/80"
            : "border-white/10 bg-white/5 text-gray-300"
        }`}>
          <h2 className={`mb-1 text-base font-semibold ${isLiteBranch ? "text-cyan-100" : "text-white"}`}>
            About {tenantDisplayName}
          </h2>
          <p>
            {isLiteBranch ? (
              <>
                {tenantDisplayName} offers a <span className="font-medium">compact branch</span> experience —
                premium gaming in a focused environment. Book your session and enjoy your visit
                {tenantLocationName ? ` at ${tenantLocationName}` : ""}.
              </>
            ) : (
              <>
                {tenantDisplayName} offers <span className="font-medium">time-based rentals</span> of PlayStation 5
                stations, 8-Ball pool tables, and VR Gaming. {bookingSlotConfigLabel(slotConfig)}; VR supports up to{" "}
                {VR_HOURLY_PASSES} passes per hour.
              </>
            )}
          </p>
          <p className={`mt-2 ${isLiteBranch ? "text-cyan-300/60" : "text-gray-400"}`}>
            <span className={`font-medium ${isLiteBranch ? "text-cyan-200" : "text-gray-200"}`}>Pricing:</span> All prices are
            displayed in <span className="ml-1 font-semibold">INR (₹)</span>.
          </p>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className={BOOKING_STEP_CARD}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-white text-base sm:text-lg">
                  <div className="w-9 h-9 rounded-lg bg-cuephoria-purple/20 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-cuephoria-purple" />
                  </div>
                  <span className="text-left flex-1">Step 1: Customer Information</span>
                  {isCustomerInfoComplete && (
                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                  )}
                </CardTitle>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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

                {isCustomerInfoComplete && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" /> Customer information complete!
                    You can now select your preferred date and time.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(
                BOOKING_STEP_CARD,
                "transition-[opacity,transform] duration-300 ease-out",
                isCustomerInfoComplete ? "opacity-100 translate-y-0" : "opacity-95"
              )}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-white text-base sm:text-lg">
                  <div className="w-9 h-9 rounded-lg bg-cuephoria-lightpurple/20 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                    {!isCustomerInfoComplete ? (
                      <Lock className="h-4 w-4 text-gray-500" />
                    ) : (
                      <CalendarIcon className="h-4 w-4 text-cuephoria-lightpurple" />
                    )}
                  </div>
                  <span className="text-left flex-1">Step 2: Choose Date & Time</span>
                  {isCustomerInfoComplete && selectedSlot && (
                    <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                  )}
                </CardTitle>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                {!isCustomerInfoComplete ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-5 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">
                      Complete customer information to select date and time
                    </p>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-[minmax(0,17rem)_1fr] gap-4 lg:gap-5 items-start">
                    <div className="flex flex-col items-center lg:items-start w-full space-y-2">
                      <Label className="text-sm font-semibold text-white block text-center lg:text-left w-full">
                        Choose date
                      </Label>
                      <p className="text-xs text-muted-foreground text-center lg:text-left leading-snug w-full">
                        {format(selectedDate, "EEE, MMM d, yyyy")}
                      </p>
                      <div className="rounded-lg border border-white/10 bg-black/25 p-1 w-fit max-w-full mx-auto lg:mx-0">
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
                            "rounded-lg border-0 bg-transparent pointer-events-auto mx-auto"
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-0.5 text-left">
                        <Label className="text-sm font-semibold text-white">
                          Available time slots
                        </Label>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          1 hr · 11 AM–11 PM
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground text-left leading-snug">
                        Tap slots to select · click again to deselect · filter stations in Step 3
                      </p>
                      <div className="min-w-0">
                        {stations.length === 0 && !slotsLoading ? (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-center text-sm text-amber-200">
                            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-400" />
                            No stations are enabled for online booking at this branch. In Station Command, turn on{' '}
                            <strong>On booking page</strong> for each station (globe toggle), then refresh this page.
                          </div>
                        ) : (
                          <>
                            {slotSelectionHint && (
                              <p className="text-xs text-amber-200/90 mb-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                                {slotSelectionHint}
                              </p>
                            )}
                          <TimeSlotPicker
                            slots={availableSlots}
                            selectedSlot={selectedSlot}
                            selectedSlots={selectedSlots}
                            onSlotSelect={handleSlotSelect}
                            loading={slotsLoading}
                            selectionSummary={slotSelectionSummary}
                          />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={cn("relative overflow-hidden", BOOKING_STEP_CARD)}>
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10 bg-gradient-to-br from-cuephoria-blue/25 to-transparent">
                      {(!isCustomerInfoComplete || !selectedSlot) ? (
                        <Lock className="h-4 w-4 text-gray-500" />
                      ) : (
                        <MapPin className="h-4 w-4 text-cuephoria-blue" />
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <CardTitle className="m-0 p-0 text-white text-base sm:text-lg">
                        Step 3: Select Available Stations
                      </CardTitle>
                      {isCustomerInfoComplete && selectedSlot && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Stations free for your selected hour
                        </p>
                      )}
                    </div>
                  </div>
                  {isCustomerInfoComplete && selectedSlot && selectedStations.length > 0 && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {selectedStations.length} selected
                    </div>
                  )}
                </div>
                <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </CardHeader>
              <CardContent className="relative pt-3">
                {(!isCustomerInfoComplete || !selectedSlot) ? (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center">
                    <Lock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">
                      Select date and time first to see available stations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 transition-opacity duration-300 ease-out">
                    <div className="text-left space-y-1.5">
                      <Label className="text-sm font-semibold text-white">Station type</Label>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        VR: up to {VR_HOURLY_PASSES} passes per hour ({VR_PASS_DURATION_MINUTES} min
                        each) — can combine with PS5 or pool in the same hour
                      </p>
                      <BookingStationTypeChips
                        variant="colored"
                        value={stationType}
                        onChange={handleStationTypeChange}
                      />
                    </div>
                    <div className="rounded-xl border border-white/10 p-3 sm:p-4 bg-black/25">
                    {checkingStationAvailability ? (
                      <div className="text-center py-8 text-gray-400">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin motion-reduce:animate-none" />
                        <p>Checking station availability...</p>
                      </div>
                    ) : availableStationIds.length === 0 && (selectedSlot || selectedSlots.length > 0) ? (
                      <div className="text-center py-8 text-gray-400">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <p>No stations available for the selected time slot</p>
                        <p className="text-sm mt-2">Please select a different time</p>
                      </div>
                    ) : (
                      <>
                        {/* Filter by booking type (EVENT vs Regular), then by type/category, then by availability */}
                        <StationSelector
                          stations={stationsForTypeFilter(stations, stationType).filter((s) =>
                            availableStationIds.includes(s.id)
                          )}
                          selectedStations={selectedStations}
                          stationPlayerCounts={stationPlayerCounts}
                          vrPassesLeft={vrPassesLeftByStationId}
                          onStationToggle={handleStationToggle}
                          onPlayerCountChange={handlePlayerCountChange}
                        />
                      </>
                    )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card
              id="public-booking-summary"
              className={cn("lg:sticky lg:top-4 scroll-mt-20", BOOKING_STEP_CARD)}
            >
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
                            <div className="w-5 h-5 rounded-md border flex items-center justify-center bg-cuephoria-purple/20 border-white/10">
                              {s.type === "ps5" ? (
                                <Gamepad2 className="h-3.5 w-3.5 text-cuephoria-purple" />
                              ) : s.type === "vr" ? (
                                <Headset className="h-3.5 w-3.5 text-blue-400" />
                              ) : (
                                <Timer className="h-3.5 w-3.5 text-green-400" />
                              )}
                            </div>
                            <Badge className="rounded-full px-2.5 py-1 bg-white/5 border-white/10 text-gray-200">
                              {s.name}
                              <span className="ml-1.5 text-gray-400 font-normal">
                                ·{' '}
                                {s.type === 'vr'
                                  ? `${stationPlayerCounts[id] ?? 1} pass${
                                      (stationPlayerCounts[id] ?? 1) !== 1 ? 'es' : ''
                                    } (${(stationPlayerCounts[id] ?? 1) * VR_PASS_DURATION_MINUTES} min)`
                                  : `${stationPlayerCounts[id] ?? 1}P`}
                              </span>
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
                      {selectedDurationMinutes >= 60 && selectedDurationMinutes % 60 === 0
                        ? selectedDurationMinutes === 60
                          ? "1 hour"
                          : `${selectedDurationMinutes / 60} hours`
                        : `${selectedDurationMinutes} minutes`}
                    </p>
                    {mergedSlotSelection?.ok ? (
                      <p className="text-sm text-gray-200 mt-2">
                        {new Date(
                          `2000-01-01T${mergedSlotSelection.gridSlots[0].start_time}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}{" "}
                        —{" "}
                        {new Date(
                          `2000-01-01T${mergedSlotSelection.gridSlots[mergedSlotSelection.gridSlots.length - 1].end_time}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    ) : selectedSlots.length > 0 ? (
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
                      </div>
                    ) : selectedSlot ? (
                      <p className="text-sm text-gray-200 mt-2">
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
                    {selectedGridSlots.length > 0 && (
                      <p className="text-xs text-cuephoria-lightpurple mt-1">
                        {mergedSlotSelection?.ok
                          ? `${selectedDurationMinutes}-minute booking ready`
                          : `${selectedGridSlots.length} of ${slotConfig.slots_per_minimum} minimum slots selected`}
                      </p>
                    )}
                  </div>
                )}

                {hasPoolTableSelected && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <PoolBookingAddonsPanel
                      addons={poolAddonsConfig}
                      selectedIds={selectedPoolAddonIds}
                      onToggle={togglePoolAddon}
                      formatPrice={(amount) => INR(amount)}
                    />
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
                      {bookingCouponsFromDB.length > 0 ? (
                        bookingCouponsFromDB.map((coupon) => (
                          <div
                            key={coupon.code}
                            className="rounded-lg bg-gray-800/30 border border-gray-700/50 overflow-hidden"
                          >
                            <div
                              className="p-2 cursor-pointer flex items-center justify-between gap-2"
                              onClick={() =>
                                setExpandedCoupons((prev) => ({
                                  ...prev,
                                  [coupon.code]: !prev[coupon.code],
                                }))
                              }
                            >
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className="text-sm flex-shrink-0">{couponRowEmoji(coupon.code)}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-gray-200 text-xs font-mono">
                                    {coupon.code}
                                  </span>
                                  {!expandedCoupons[coupon.code] && (
                                    <span className="text-xs text-gray-400 ml-1.5">
                                      • {coupon.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    applyCoupon(coupon.code);
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-7"
                                >
                                  Apply
                                </Button>
                                {expandedCoupons[coupon.code] ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </div>
                            {expandedCoupons[coupon.code] && (
                              <div className="px-2 pb-2 pt-0 border-t border-gray-700/50">
                                <p className="text-xs text-gray-400 mt-2">{coupon.description}</p>
                                <p className="text-[11px] text-gray-500 mt-1">
                                  {coupon.discount_type === "percentage"
                                    ? `${coupon.discount_value}% off the booking total`
                                    : `${INR(coupon.discount_value)} off the booking total`}
                                </p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic py-2">
                          No coupons available for this branch.
                        </p>
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

                {onlinePaymentEnabled && (
                  <div className="mt-3 rounded-xl border border-[#3395FF]/20 bg-[#3395FF]/10 px-3 py-2.5 text-xs text-sky-100/95 leading-relaxed">
                    <span className="font-semibold text-white">Book online on this page</span>
                    {" "}for instant confirmation, secure Razorpay checkout, and the ability to use coupons.
                  </div>
                )}

                <div className="mt-2">
                  <Label className="text-xs font-semibold text-gray-400 uppercase">
                    Payment Method
                  </Label>
                  {hasAppliedCoupons && onlinePaymentEnabled && (
                    <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100/95">
                      A coupon is applied —{" "}
                      <span className="font-semibold text-white">Pay Online</span> is required to confirm this discounted booking.
                    </div>
                  )}
                  {!onlinePaymentEnabled ? (
                    <div className="mt-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-100/95">
                      <p className="font-medium">Online payment is temporarily unavailable</p>
                      <p className="text-xs text-amber-200/80 mt-1">
                        Please choose <span className="font-semibold">Pay at Venue</span> below, or call us to complete your booking.
                      </p>
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "mt-2 gap-2",
                      onlinePaymentEnabled ? "grid grid-cols-1 sm:grid-cols-2" : "grid grid-cols-1"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (hasAppliedCoupons && onlinePaymentEnabled) {
                          toast.info("Coupons require online payment. Remove the coupon first if you need to pay at the venue.");
                          return;
                        }
                        setPaymentMethod("venue");
                      }}
                      disabled={hasAppliedCoupons && onlinePaymentEnabled}
                      className={cn(
                        "w-full rounded-xl px-3 py-2.5 text-sm border transition-all",
                        "h-12 flex items-center justify-center text-center leading-tight",
                        paymentMethod === "venue"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-black/20 border-white/10 text-gray-300 hover:bg-black/30",
                        hasAppliedCoupons && onlinePaymentEnabled && "opacity-45 cursor-not-allowed hover:bg-black/20"
                      )}
                    >
                      Pay at Venue
                    </button>
                    {onlinePaymentEnabled ? (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("razorpay")}
                      className={cn(
                        "w-full rounded-xl px-3 py-3 text-sm border transition-all relative",
                        "h-12 flex items-center justify-center text-center leading-tight overflow-hidden",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3395FF]/60",
                        "gh-pay-online-cta",
                        paymentMethod === "razorpay"
                          ? "bg-gradient-to-r from-[#3395FF] to-[#2563EB] border-[#3395FF]/55 text-white shadow-lg shadow-[#3395FF]/20"
                          : "bg-black/20 border-white/10 text-gray-200 hover:bg-black/30 hover:border-[#3395FF]/35"
                      )}
                    >
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        {paymentMethod === "razorpay" ? (
                          <Shield className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <CreditCard className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="font-semibold">Pay Online</span>
                      </div>
                      {paymentMethod === "razorpay" && (
                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-r from-white/10 to-transparent opacity-50"></div>
                      )}
                    </button>
                    ) : null}
                  </div>
                </div>

                {originalPrice > 0 && (
                  <>
                    <Separator className="bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="space-y-2">
                      {(() => {
                        const sessionsCount = bookingSessionCount;
                        const totalOriginal = originalPrice * (sessionsCount || 0);
                        const totalDiscount = discount * (sessionsCount || 0);
                        const stationFinal = finalPrice * (sessionsCount || 0);
                        const totalFinal = stationFinal + poolAddonTotal;
                        
                        return (
                          <>
                            <div className="flex justify-between items-center">
                              <Label className="text-sm text-gray-300">Price per session</Label>
                              <span className="text-sm text-gray-200">
                                {INR(originalPrice)}
                              </span>
                            </div>
                            {sessionsCount !== 1 && (
                              <div className="flex justify-between items-center text-xs text-gray-400">
                                <Label>
                                  × {Number.isInteger(sessionsCount) ? sessionsCount : sessionsCount.toFixed(1)} hr block{sessionsCount === 1 ? "" : "s"}
                                </Label>
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
                        const sessionsCount = bookingSessionCount;
                        const totalOriginal = originalPrice * (sessionsCount || 0);
                        const totalDiscount = discount * (sessionsCount || 0);
                        const stationFinal = finalPrice * (sessionsCount || 0);
                        const totalFinal = stationFinal + poolAddonTotal;
                        
                        return (
                          <>
                            {discount > 0 && (
                              <>
                                <div className="border p-2 rounded bg-black/10 text-green-400">
                                  <Label className="font-semibold text-xs uppercase">
                                    Discount Breakdown (per session)
                                  </Label>
                                  <ul className="list-disc ml-5 mt-1 text-sm">
                                    {Object.entries(discountBreakdown).map(([k, v]) => (
                                      <li key={k}>
                                        {k}: -{INR(v)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                {sessionsCount !== 1 && (
                                  <div className="flex justify-between items-center text-xs text-gray-400">
                                    <Label>
                                      × {Number.isInteger(sessionsCount) ? sessionsCount : sessionsCount.toFixed(1)} hr block{sessionsCount === 1 ? "" : "s"}
                                    </Label>
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

                            {poolAddonTotal > 0 && bookingAddonsSnapshot && (
                              <>
                                <div className="space-y-1 pt-1">
                                  <Label className="text-xs font-semibold text-emerald-300/90 uppercase">
                                    Session add-ons
                                  </Label>
                                  {bookingAddonsSnapshot.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex justify-between items-center text-sm text-gray-300"
                                    >
                                      <span>{item.name}</span>
                                      <span>{INR(item.price)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <Label className="text-gray-300">Add-ons subtotal</Label>
                                  <span className="text-emerald-300">{INR(poolAddonTotal)}</span>
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
                                        (2.5%) — Razorpay gateway processing
                                      </span>
                                    </div>
                                    <span className="text-sm text-gray-200 font-medium">
                                      +{INR(Math.round((totalFinal * 0.025) * 100) / 100)}
                                    </span>
                                  </div>
                                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-2.5">
                                    <p className="text-xs text-blue-300/90 leading-relaxed">
                                      Paying online confirms your slot immediately and supports cards, UPI, and net banking. The fee covers secure processing through Razorpay.
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
                        ? "Pay Online"
                        : "Confirm Booking"}
                    </span>
                  </div>
                  {paymentMethod === "razorpay" && (
                    <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-r from-white/10 via-white/5 to-transparent opacity-60"></div>
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
              <li>{bookingSlotConfigLabel(slotConfig)} (PS5, Pool &amp; VR). VR allows up to {VR_HOURLY_PASSES} passes per hour; extensions subject to availability.</li>
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

        <div
          ref={todayBookingsRef}
          id="todays-bookings"
          className="mt-10 scroll-mt-24"
        >
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-white flex items-center gap-2 min-w-0">
                <Clock className="h-5 w-5 text-cuephoria-lightpurple" />
                <span className="truncate">Today's Bookings</span>
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
                    className="group rounded-xl border border-white/10 bg-black/30 open:bg-black/40 overflow-hidden"
                  >
                    <summary className="list-none cursor-pointer select-none px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-gray-200 min-w-0">
                        <Clock className="h-4 w-4 text-cuephoria-lightpurple" />
                        <span className="font-medium truncate">{timeLabel}</span>
                      </div>
                      <span className="text-xs text-gray-300 rounded-full border border-white/10 px-2 py-0.5 flex-shrink-0">
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

      <footer className="py-10 px-4 sm:px-6 md:px-8 border-t border-white/10 backdrop-blur-md bg-black/30 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0 gap-3">
              {tenantLogoUrl ? (
                <img
                  src={tenantLogoUrl}
                  alt={`${tenantDisplayName} logo`}
                  className="h-8 max-w-[120px] object-contain"
                />
              ) : null}
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} {tenantDisplayName}. All rights reserved.
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

            {isCuephoriaWorkspace ? (
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
            ) : null}
          </div>

          {!hidePoweredBy ? (
            <div className="pt-4 border-t border-white/5">
              <CuephoriaTechAttribution variant="powered-by" />
            </div>
          ) : null}
        </div>
      </footer>

      {bookingConfirmationData && (
        <BookingConfirmationDialog 
          isOpen={showConfirmationDialog}
          onClose={() => setShowConfirmationDialog(false)}
          bookingData={bookingConfirmationData}
        />
      )}

      {popupConfig.online_payment_promo.enabled && (
      <OnlinePaymentPromoDialog
        isOpen={showOnlinePaymentPromo}
        onClose={() => setShowOnlinePaymentPromo(false)}
        onAccept={handlePromoAccept}
        onDecline={handlePromoDecline}
        serviceType={getServiceTypeForPromo()}
        title={popupConfig.online_payment_promo.title}
        body={popupConfig.online_payment_promo.body}
      />
      )}

      {/* Instagram Follow Dialog for New Customers */}
      {popupConfig.instagram_gate.enabled && (
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
                  href={popupConfig.instagram_gate.instagram_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setInstagramLinkClicked(true)}
                  className="text-base sm:text-lg font-bold text-pink-300 hover:text-pink-200 transition-colors underline flex items-center gap-2"
                >
                  {popupConfig.instagram_gate.instagram_handle || "Instagram"}
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
      )}

      {/* Follow Confirmation Dialog */}
      {popupConfig.instagram_gate.enabled && (
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
              Please confirm that you have followed{" "}
              <span className="font-bold text-pink-300">
                {popupConfig.instagram_gate.instagram_handle || "our Instagram"}
              </span>{" "}
              to proceed with applying the {pendingCoupon?.code || "coupon"} coupon.
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
      )}


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

            <div className="flex flex-col items-center justify-center gap-2 pt-2">
              <Loader2
                className={`h-4 w-4 text-cuephoria-lightpurple ${
                  paymentPrepReady ? "hidden" : "animate-spin"
                }`}
              />
              {paymentPrepReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : null}
              <span className="text-xs text-gray-400 text-center">
                {paymentWarningSeconds > 0 ? (
                  <>
                    Opening payment gateway in{" "}
                    <span className="font-semibold text-white tabular-nums">
                      {paymentWarningSeconds}s
                    </span>
                    …
                  </>
                ) : (
                  "Opening payment gateway…"
                )}
              </span>
              {paymentPrepReady && paymentWarningSeconds > 0 && (
                <span className="text-[10px] text-emerald-400/90">Payment ready</span>
              )}
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

              {isCuephoriaWorkspace ? (
                <p className="mt-4 text-xs text-gray-400">
                  Need help? Call{" "}
                  <a className="underline hover:text-white" href="tel:918637625155">
                    +91 86376 25155
                  </a>{" "}
                  or email{" "}
                  <a className="ml-1 underline hover:text-white" href="mailto:contact@cuephoria.in">
                    contact@cuephoria.in
                  </a>
                  .
                </p>
              ) : (
                <p className="mt-4 text-xs text-gray-400">
                  Need help? Contact {tenantDisplayName} directly for refund requests.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky "review & pay" bar. Visible once the user has begun
          the booking flow so the running total + CTA are always reachable
          without scrolling past the entire form to the summary card. */}
      {(() => {
        const sessionsCount = bookingSessionCount;
        const totalFinal = finalPrice * (sessionsCount || 0) + poolAddonTotal;
        const hasProgress = selectedStations.length > 0 && selectedGridSlots.length > 0;
        if (!viewIsMobile || !hasProgress) return null;
        return (
          <StickyMobileActionBar
            // Lift slightly so it doesn't sit on top of the customer BottomNav
            // when this page is opened inside the logged-in customer shell.
            style={customerSession ? { bottom: '64px' } : undefined}
            className="flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-white/55 font-semibold">
                Total · {sessionsCount > 0 ? `${sessionsCount} session${sessionsCount !== 1 ? 's' : ''}` : 'select slots'}
              </div>
              <div className="text-base font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">
                ₹{totalFinal.toLocaleString('en-IN')}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                const el = document.getElementById('public-booking-summary');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="rounded-xl h-11 px-4 bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple text-sm font-semibold"
            >
              Review & Pay
            </Button>
          </StickyMobileActionBar>
        );
      })()}

      {/* Bottom Navigation - Only show if accessed through customer dashboard */}
      {customerSession && <BottomNav />}
    </div>
  );
}
