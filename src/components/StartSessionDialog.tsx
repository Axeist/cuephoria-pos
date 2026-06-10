import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Gift, Tag, Clock, AlertCircle, User as UserIcon, Lock, ShieldCheck, UserPlus, History } from 'lucide-react';
import AddCustomerDialog from '@/components/customers/AddCustomerDialog';
import { usePOS, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { CurrencyDisplay } from '@/components/ui/currency';
import { hapticImpact } from '@/utils/capacitor';
import { useAuth } from '@/context/AuthContext';
import { usePinVerification } from '@/hooks/usePinVerification';
import PinVerificationDialog from '@/components/PinVerificationDialog';

import { getRateForPlayerCount, getRateSuffix as pricingRateSuffix, isPerPlayerPricing } from '@/utils/stationPricing';
import { getDefaultPlannedDuration, getDurationPresets } from '@/utils/sessionDuration.utils';
import {
  formatOvertimePerMinute,
  getDefaultDurationTiers,
  getOvertimePerMinute,
  getTierPackagePrice,
} from '@/utils/timeBasedPricing.utils';
import type { Station } from '@/types/pos.types';
import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import { useLocation } from '@/context/LocationContext';
import { PrepaidBookingNotice } from '@/components/station/PrepaidBookingNotice';
import { fetchTodayBookingsForStationCustomer, pickDefaultPrepaidBooking } from '@/utils/prepaidBooking.utils';
import type { StationBookingRow } from '@/types/prepaidBooking.types';
import {
  defaultCustomStartTime,
  formatCustomStartBoundsHint,
  formatElapsedSinceStart,
  getCustomStartTimeBounds,
  parseCustomSessionStartTime,
  toDatetimeLocalInputValue,
} from '@/utils/sessionStartTime.utils';
import { useBranchCoupons } from '@/hooks/useBranchCoupons';
import { applyCouponToRate, isHappyHour } from '@/utils/sessionCoupon.utils';

const isLateNight = () => new Date().getHours() < 6;

const DEFAULT_DURATION_TIERS = getDefaultDurationTiers();

interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
  stationName: string;
  baseRate: number;
  stationCategory?: string | null;
  slotDuration?: number | null;
  stationType?: string;
  pricingMode?: 'static' | 'per_player' | 'time_based';
  maxPlayers?: number;
  occupancyRates?: Record<string, number>;
  hourlyRate?: number;
  durationTiers?: { minutes: number; price: number }[];
  onConfirm: (
    customerId: string,
    customerName: string,
    finalRate: number,
    couponCode?: string,
    playerCount?: number,
    perPersonRate?: number,
    plannedDurationMinutes?: number,
    prepaidBooking?: PrepaidBookingLink,
    customStartTime?: Date
  ) => void;
  /** Pre-select after inline add-customer from station card */
  initialCustomerId?: string | null;
}

const StartSessionDialog: React.FC<StartSessionDialogProps> = ({
  open,
  onOpenChange,
  stationId,
  stationName,
  baseRate,
  stationCategory,
  slotDuration,
  stationType,
  pricingMode,
  maxPlayers = 1,
  occupancyRates = {},
  hourlyRate = baseRate,
  durationTiers = [],
  onConfirm,
  initialCustomerId = null,
}) => {
  const effectiveTiers = useMemo(
    () => (durationTiers.length > 0 ? durationTiers : DEFAULT_DURATION_TIERS),
    [durationTiers]
  );
  const isTimeBased = pricingMode === 'time_based';
  const { customers } = usePOS();
  const { activeLocationId } = useLocation();
  const { coupons: branchCoupons, options: couponOptions, loading: couponsLoading } = useBranchCoupons(
    activeLocationId,
    open,
  );
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const { showPinDialog, requestPinVerification, handlePinSuccess, handlePinCancel } = usePinVerification();
  
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<string>('none');
  const [playerCount, setPlayerCount] = useState(1);
  const [finalRate, setFinalRate] = useState(baseRate);
  const [perPersonRate, setPerPersonRate] = useState(baseRate);
  const [lateNightPinUnlocked, setLateNightPinUnlocked] = useState(false);
  const durationPresets = getDurationPresets(slotDuration, isTimeBased ? effectiveTiers : undefined);
  const [plannedDuration, setPlannedDuration] = useState(() =>
    getDefaultPlannedDuration(slotDuration, isTimeBased ? effectiveTiers : undefined)
  );

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [todayBookings, setTodayBookings] = useState<StationBookingRow[]>([]);
  const [selectedPrepaidId, setSelectedPrepaidId] = useState<string | null>(null);
  const [prepaidLink, setPrepaidLink] = useState<PrepaidBookingLink | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [useCustomStartTime, setUseCustomStartTime] = useState(false);
  const [customStartTimeInput, setCustomStartTimeInput] = useState('');
  const dialogWasOpenRef = useRef(false);
  const customStartBounds = useMemo(
    () => getCustomStartTimeBounds(new Date()),
    [open, useCustomStartTime, customStartTimeInput]
  );
  const customStartMinInput = toDatetimeLocalInputValue(customStartBounds.min);
  const customStartMaxInput = toDatetimeLocalInputValue(customStartBounds.max);

  // Reset form only when the dialog opens — not on every customers/tiers re-render.
  useEffect(() => {
    if (!open) {
      dialogWasOpenRef.current = false;
      return;
    }
    if (dialogWasOpenRef.current) return;
    dialogWasOpenRef.current = true;

    setPlannedDuration(getDefaultPlannedDuration(slotDuration, isTimeBased ? effectiveTiers : undefined));
    setSelectedPrepaidId(null);
    setPrepaidLink(null);
    setTodayBookings([]);
    setSelectedCoupon('none');
    setPlayerCount(1);
    setLateNightPinUnlocked(false);
    setUseCustomStartTime(false);
    setCustomStartTimeInput('');
    if (initialCustomerId) {
      const match = customers.find((c) => c.id === initialCustomerId);
      setSelectedCustomer(match ?? null);
      setCustomerSearchQuery(match?.name ?? '');
    } else {
      setSelectedCustomer(null);
      setCustomerSearchQuery('');
    }
    // customers read on open only; ongoing list updates must not wipe typed search
  }, [open, slotDuration, initialCustomerId, isTimeBased, effectiveTiers]);

  // Pre-select customer after inline add-customer while dialog stays open.
  useEffect(() => {
    if (!open || !initialCustomerId) return;
    const match = customers.find((c) => c.id === initialCustomerId);
    if (!match) return;
    setSelectedCustomer((prev) => (prev?.id === match.id ? prev : match));
    setCustomerSearchQuery((prev) => (prev === match.name ? prev : match.name));
  }, [open, initialCustomerId, customers]);

  useEffect(() => {
    if (!open || !selectedCustomer?.id || !activeLocationId) {
      setTodayBookings([]);
      setSelectedPrepaidId(null);
      setPrepaidLink(null);
      return;
    }

    let cancelled = false;
    setBookingsLoading(true);
    void fetchTodayBookingsForStationCustomer(
      stationId,
      { id: selectedCustomer.id, phone: selectedCustomer.phone },
      activeLocationId
    )
      .then((rows) => {
        if (!cancelled) {
          setTodayBookings(rows);
          const auto = pickDefaultPrepaidBooking(rows, {
            type: stationType,
            slotDuration,
          });
          if (auto) {
            setSelectedPrepaidId(auto.booking.id);
            setPrepaidLink(auto.link);
            setPlannedDuration(auto.link.durationMinutes);
            setSelectedCoupon('none');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setBookingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedCustomer?.id, stationId, activeLocationId]);

  const handlePrepaidSelect = (bookingId: string | null, link: PrepaidBookingLink | null) => {
    setSelectedPrepaidId(bookingId);
    setPrepaidLink(link);
    if (link) {
      setPlannedDuration(link.durationMinutes);
      setSelectedCoupon('none');
    }
  };

  const lateNightLocked = isLateNight() && !lateNightPinUnlocked && !isAdmin;

  const selectedCouponMeta = branchCoupons.find((c) => c.code === selectedCoupon);

  useEffect(() => {
    if (selectedCoupon === 'none' || couponsLoading) return;
    const valid = branchCoupons.some((c) => c.code === selectedCoupon) || selectedCoupon === 'HH99';
    if (!valid) setSelectedCoupon('none');
  }, [branchCoupons, couponsLoading, selectedCoupon]);

  const handleLateNightUnlock = () => {
    requestPinVerification(() => setLateNightPinUnlocked(true));
  };
  
  // Helper to get rate label based on station type and category
  const getRateLabel = (): string => {
    if (stationCategory === 'nit_event') {
      if (slotDuration === 15) {
        return '15 Min Rate';
      } else if (slotDuration === 30) {
        return '30 Min Rate';
      }
    }
    if (stationType === 'vr') {
      return '15 Min Rate';
    }
    return 'Hourly Rate';
  };
  
  const pricingStation: Pick<
    Station,
    'hourlyRate' | 'maxPlayers' | 'occupancyRates' | 'type' | 'slotDuration' | 'category' | 'pricingMode'
  > = {
    hourlyRate,
    maxPlayers,
    occupancyRates,
    type: stationType ?? 'ps5',
    slotDuration,
    category: stationCategory,
    pricingMode,
  };

  const undiscountedRate = isTimeBased
    ? getTierPackagePrice(plannedDuration, effectiveTiers)
    : getRateForPlayerCount(pricingStation, playerCount).totalRate;
  const undiscountedPerPerson = isTimeBased
    ? undiscountedRate
    : getRateForPlayerCount(pricingStation, playerCount).perPersonRate;

  const showPlayerCount = isPerPlayerPricing(pricingStation) && maxPlayers > 1 && !isTimeBased;
  const overtimePerMin = isTimeBased
    ? getOvertimePerMinute(plannedDuration, effectiveTiers)
    : null;

  const getRateSuffix = (): string =>
    pricingRateSuffix({
      type: stationType ?? 'ps5',
      slotDuration,
      category: stationCategory,
    });

  const filteredCustomers = customerSearchQuery.trim() === ''
    ? customers.slice(0, 10)
    : customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.phone.includes(customerSearchQuery)
      ).slice(0, 10);

  // Calculate final rate based on branch coupon
  useEffect(() => {
    const couponCode = selectedCoupon !== 'none' ? selectedCoupon : undefined;
    const { finalRate: nextRate, perPersonRate: nextPerPerson, invalidCoupon } = applyCouponToRate(
      undiscountedRate,
      couponCode,
      playerCount,
      branchCoupons,
    );

    if (invalidCoupon === 'HH99') {
      toast({
        title: 'Invalid Timing',
        description: 'HH99 is only valid Mon-Fri, 11 AM - 4 PM',
        variant: 'destructive',
      });
      setSelectedCoupon('none');
      return;
    }

    setFinalRate(nextRate);
    setPerPersonRate(nextPerPerson);
  }, [selectedCoupon, undiscountedRate, undiscountedPerPerson, playerCount, branchCoupons, toast]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleConfirm = () => {
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Please select a customer to start the session',
        variant: 'destructive',
      });
      return;
    }

    let customStartTime: Date | undefined;
    if (useCustomStartTime) {
      const parsed = parseCustomSessionStartTime(customStartTimeInput);
      if (!parsed.ok) {
        toast({
          title: 'Invalid start time',
          description: parsed.message,
          variant: 'destructive',
        });
        return;
      }
      customStartTime = parsed.date;
    }

    onConfirm(
      selectedCustomer.id,
      selectedCustomer.name,
      prepaidLink ? hourlyRate || finalRate : finalRate,
      prepaidLink ? undefined : selectedCoupon !== 'none' ? selectedCoupon : undefined,
      playerCount,
      perPersonRate,
      plannedDuration,
      prepaidLink ?? undefined,
      customStartTime
    );

    // Native: heavy haptic so the user feels the session start.
    hapticImpact('heavy').catch(() => {});

    // Reset state
    setSelectedCustomer(null);
    setSelectedCoupon('none');
    setPlayerCount(1);
    setPlannedDuration(getDefaultPlannedDuration(slotDuration, isTimeBased ? effectiveTiers : undefined));
    setCustomerSearchQuery('');
    setSelectedPrepaidId(null);
    setPrepaidLink(null);
    setTodayBookings([]);
    setUseCustomStartTime(false);
    setCustomStartTimeInput('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedCustomer(null);
    setSelectedCoupon('none');
    setPlayerCount(1);
    setPlannedDuration(getDefaultPlannedDuration(slotDuration, isTimeBased ? effectiveTiers : undefined));
    setCustomerSearchQuery('');
    setSelectedPrepaidId(null);
    setPrepaidLink(null);
    setTodayBookings([]);
    setUseCustomStartTime(false);
    setCustomStartTimeInput('');
    onOpenChange(false);
  };

  const customStartPreview =
    useCustomStartTime && customStartTimeInput
      ? (() => {
          const parsed = parseCustomSessionStartTime(customStartTimeInput);
          return parsed.ok ? formatElapsedSinceStart(parsed.date) : null;
        })()
      : null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveDialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" mobileClassName="px-4 pt-3">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-cuephoria-purple" />
            Start Session - {stationName}
          </DialogTitle>
          <DialogDescription>
            Select customer and apply coupon if applicable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {showPlayerCount && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <Label className="text-base font-medium">Number of players</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={playerCount <= 1}
                  onClick={() => setPlayerCount((c) => Math.max(1, c - 1))}
                >
                  −
                </Button>
                <span className="text-lg font-semibold w-8 text-center">{playerCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={playerCount >= maxPlayers}
                  onClick={() => setPlayerCount((c) => Math.min(maxPlayers, c + 1))}
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground ml-auto">
                  ₹{undiscountedPerPerson}/person · ₹{undiscountedRate}{getRateSuffix()} total
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Play duration
            </Label>
            <div className="flex flex-wrap gap-2">
              {durationPresets.map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  size="sm"
                  variant={plannedDuration === mins ? 'default' : 'outline'}
                  className={plannedDuration === mins ? 'bg-cuephoria-purple hover:bg-cuephoria-purple/90' : ''}
                  onClick={() => setPlannedDuration(mins)}
                >
                  {mins} min
                  {isTimeBased && (
                    <span className="ml-1 opacity-90">
                      · ₹{getTierPackagePrice(mins, effectiveTiers)}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Label htmlFor="custom-duration" className="text-sm text-muted-foreground shrink-0">
                Custom
              </Label>
              <Input
                id="custom-duration"
                type="number"
                min={15}
                step={15}
                max={480}
                value={plannedDuration}
                onChange={(e) => setPlannedDuration(Math.max(15, Number(e.target.value) || 60))}
                className="h-9 w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base font-medium flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Select Customer
              </Label>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant={useCustomStartTime ? 'default' : 'outline'}
                  size="sm"
                  className={
                    useCustomStartTime
                      ? 'h-8 text-xs bg-cuephoria-purple hover:bg-cuephoria-purple/90'
                      : 'h-8 text-xs border-cuephoria-purple/30 text-cuephoria-lightpurple'
                  }
                  onClick={() => {
                    setUseCustomStartTime((on) => {
                      const next = !on;
                      if (next && !customStartTimeInput) {
                        setCustomStartTimeInput(toDatetimeLocalInputValue(defaultCustomStartTime()));
                      }
                      return next;
                    });
                  }}
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  Custom start time
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-cuephoria-purple/30 text-cuephoria-lightpurple"
                  onClick={() => setAddCustomerOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Add customer
                </Button>
              </div>
            </div>

            {useCustomStartTime && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 space-y-2">
                <Label htmlFor="custom-start-time" className="text-sm font-medium text-amber-100">
                  When did play actually start?
                </Label>
                <Input
                  id="custom-start-time"
                  type="datetime-local"
                  min={customStartMinInput}
                  max={customStartMaxInput}
                  value={customStartTimeInput}
                  onChange={(e) => setCustomStartTimeInput(e.target.value)}
                  className="h-9 max-w-xs"
                />
                <p className="text-xs text-amber-200/75">
                  {formatCustomStartBoundsHint()}. Timer and billing start from this moment
                  {customStartPreview ? ` (${customStartPreview})` : ''}.
                </p>
              </div>
            )}
            
            {!selectedCustomer ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    className="pl-10"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 bg-muted/20">
                  {filteredCustomers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full text-left p-3 rounded-md hover:bg-cuephoria-purple/10 border border-transparent hover:border-cuephoria-purple/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            </div>
                            {customer.isMember && (
                              <span className="text-xs bg-cuephoria-purple/20 text-cuephoria-purple px-2 py-1 rounded-full">
                                Member
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No customers found</p>
                  )}
                </div>
              </>
            ) : (
              <div className="border rounded-lg p-4 bg-cuephoria-purple/5 border-cuephoria-purple/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    {selectedCustomer.isMember && (
                      <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full mt-1 inline-block">
                        Member
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </div>

          {selectedCustomer && (
            <PrepaidBookingNotice
              bookings={todayBookings}
              selectedBookingId={selectedPrepaidId}
              onSelectBooking={handlePrepaidSelect}
              loading={bookingsLoading}
              stationType={stationType}
              slotDuration={slotDuration}
            />
          )}

          {/* Coupon Selection */}
          {selectedCustomer && !prepaidLink && (couponsLoading || branchCoupons.length > 0) && (
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Apply Coupon (Optional)
                {lateNightLocked && <Lock className="h-3.5 w-3.5 text-amber-500 ml-1" />}
              </Label>

              {lateNightLocked && (
                <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      <strong>After midnight:</strong> Coupons are locked. Verify with your workspace PIN to unlock.
                    </p>
                  </div>
                  <Button onClick={handleLateNightUnlock} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <ShieldCheck className="h-4 w-4 mr-1" /> Unlock coupons
                  </Button>
                </div>
              )}

              {!lateNightLocked && lateNightPinUnlocked && isLateNight() && (
                <div className="bg-green-50 dark:bg-green-950/25 border border-green-200 dark:border-green-800 rounded-md p-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-xs text-green-800 dark:text-green-200 font-medium">Manager override active — coupons unlocked</p>
                </div>
              )}

              
              <Select
                value={selectedCoupon}
                onValueChange={setSelectedCoupon}
                disabled={lateNightLocked || couponsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={couponsLoading ? 'Loading coupons…' : 'No coupon (regular price)'} />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {couponOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCoupon === 'HH99' && !isHappyHour() && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Note:</strong> HH99 is only valid Mon-Fri, 11 AM - 4 PM. Currently outside Happy Hour.
                  </p>
                </div>
              )}

              {selectedCoupon !== 'none' && selectedCouponMeta?.description && selectedCoupon !== 'HH99' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">{selectedCouponMeta.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Price Summary */}
          {selectedCustomer && (
            <div className="border rounded-lg p-4 bg-gradient-to-r from-cuephoria-purple/10 to-transparent">
              <div className="space-y-2">
                {prepaidLink ? (
                  <>
                    <div className="flex justify-between items-center text-sm text-teal-200">
                      <span>Pre-paid online</span>
                      <span className="font-semibold">₹{prepaidLink.paidAmount} · {prepaidLink.durationMinutes} min</span>
                    </div>
                    <p className="text-xs text-teal-200/70">
                      Session time covered. POS only for shop items or overtime beyond {prepaidLink.durationMinutes} min.
                    </p>
                  </>
                ) : isTimeBased ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Package ({plannedDuration} min)
                      </span>
                      <CurrencyDisplay amount={undiscountedRate} className="text-sm font-semibold" />
                    </div>
                    {overtimePerMin != null && overtimePerMin > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Overtime: ₹{formatOvertimePerMinute(overtimePerMin)}/min after {plannedDuration} min
                      </p>
                    )}
                    {selectedCoupon !== 'none' && finalRate !== undiscountedRate && (
                      <>
                        <div className="flex justify-between items-center text-cuephoria-orange">
                          <span className="text-sm">Discount ({selectedCoupon})</span>
                          <span className="text-sm font-semibold">- ₹{undiscountedRate - finalRate}</span>
                        </div>
                        <div className="border-t pt-2" />
                      </>
                    )}
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Final package</span>
                      <CurrencyDisplay amount={finalRate} className="text-cuephoria-lightpurple text-xl" />
                    </div>
                  </>
                ) : (
                  <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Base {getRateLabel()}</span>
                  <div className="flex items-baseline gap-1">
                    <CurrencyDisplay amount={undiscountedRate} className="text-sm" />
                    <span className="text-xs text-muted-foreground">{getRateSuffix()}</span>
                  </div>
                </div>
                
                {selectedCoupon !== 'none' && finalRate !== undiscountedRate && (
                  <>
                    <div className="flex justify-between items-center text-cuephoria-orange">
                      <span className="text-sm">Discount ({selectedCoupon})</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold">- ₹{undiscountedRate - finalRate}</span>
                        <span className="text-xs text-muted-foreground">{getRateSuffix()}</span>
                      </div>
                    </div>
                    <div className="border-t pt-2" />
                  </>
                )}
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Final {getRateLabel()}</span>
                  <div className="flex items-baseline gap-1">
                    <CurrencyDisplay amount={finalRate} className="text-cuephoria-lightpurple text-xl" />
                    <span className="text-sm text-muted-foreground">{getRateSuffix()}</span>
                  </div>
                </div>

                {finalRate === 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center mt-2">
                    🎉 This session is completely FREE!
                  </p>
                )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCustomer}
            className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
          >
            Start Session
          </Button>
        </DialogFooter>
      </ResponsiveDialogContent>

      <AddCustomerDialog
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onAdded={(customer) => {
          setSelectedCustomer(customer);
          setCustomerSearchQuery(customer.name);
        }}
      />

      <PinVerificationDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        onSuccess={handlePinSuccess}
        title="Unlock coupons"
        description="Enter your workspace PIN to apply coupons after midnight."
      />
    </ResponsiveDialog>
  );
};

export default StartSessionDialog;
