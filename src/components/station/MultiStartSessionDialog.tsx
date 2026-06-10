import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DialogFooter } from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Tag,
  Clock,
  AlertCircle,
  User as UserIcon,
  Lock,
  ShieldCheck,
  Users,
  Gamepad2,
} from 'lucide-react';
import { usePOS, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { CurrencyDisplay } from '@/components/ui/currency';
import { hapticImpact } from '@/utils/capacitor';
import { useAuth } from '@/context/AuthContext';
import { usePinVerification } from '@/hooks/usePinVerification';
import PinVerificationDialog from '@/components/PinVerificationDialog';
import {
  getRateForPlayerCount,
  getRateSuffix as pricingRateSuffix,
  isPerPlayerPricing,
} from '@/utils/stationPricing';
import { getDefaultPlannedDuration, getDurationPresets } from '@/utils/sessionDuration.utils';
import type { PrepaidBookingLink } from '@/types/prepaidBooking.types';
import type { StationBookingRow } from '@/types/prepaidBooking.types';
import { useLocation } from '@/context/LocationContext';
import { PrepaidBookingNotice } from '@/components/station/PrepaidBookingNotice';
import { fetchTodayBookingsForStationCustomer, pickDefaultPrepaidBooking } from '@/utils/prepaidBooking.utils';
import {
  applyCouponToRate,
  isHappyHour,
} from '@/utils/sessionCoupon.utils';
import { useBranchCoupons } from '@/hooks/useBranchCoupons';
import { getStationTheme } from '@/utils/stationTheme';
import type { Station } from '@/types/pos.types';

const isLateNight = () => new Date().getHours() < 6;

export interface MultiSessionStartItem {
  stationId: string;
  finalRate: number;
  playerCount?: number;
  perPersonRate?: number;
  plannedDurationMinutes?: number;
  prepaidBooking?: PrepaidBookingLink;
}

interface MultiStartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stations: Station[];
  onConfirm: (
    customerId: string,
    customerName: string,
    couponCode: string | undefined,
    sessions: MultiSessionStartItem[]
  ) => Promise<void>;
}

const MultiStartSessionDialog: React.FC<MultiStartSessionDialogProps> = ({
  open,
  onOpenChange,
  stations,
  onConfirm,
}) => {
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
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [plannedDuration, setPlannedDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [lateNightPinUnlocked, setLateNightPinUnlocked] = useState(false);
  const [stationBookings, setStationBookings] = useState<Record<string, StationBookingRow[]>>({});
  const [prepaidByStation, setPrepaidByStation] = useState<Record<string, PrepaidBookingLink | null>>({});
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const dialogWasOpenRef = useRef(false);

  const slotDuration = stations[0]?.slotDuration;
  const durationPresets = getDurationPresets(slotDuration);

  useEffect(() => {
    if (!open) {
      dialogWasOpenRef.current = false;
      return;
    }
    if (dialogWasOpenRef.current) return;
    dialogWasOpenRef.current = true;

    const initial: Record<string, number> = {};
    for (const s of stations) {
      initial[s.id] = 1;
    }
    setPlayerCounts(initial);
    setPlannedDuration(getDefaultPlannedDuration(slotDuration));
    setSelectedCustomer(null);
    setSelectedCoupon('none');
    setCustomerSearchQuery('');
    setStationBookings({});
    setPrepaidByStation({});
  }, [open, slotDuration, stations]);

  useEffect(() => {
    if (!open || !selectedCustomer?.id || !activeLocationId) {
      setStationBookings({});
      setPrepaidByStation({});
      return;
    }

    let cancelled = false;
    setBookingsLoading(true);
    setPrepaidByStation({});

    void Promise.all(
      stations.map(async (station) => {
        const rows = await fetchTodayBookingsForStationCustomer(
          station.id,
          { id: selectedCustomer.id, phone: selectedCustomer.phone },
          activeLocationId
        );
        return [station.id, rows] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        const map = Object.fromEntries(entries);
        setStationBookings(map);

        const autoLinks: Record<string, PrepaidBookingLink | null> = {};
        for (const [stationId, rows] of entries) {
          const station = stations.find((s) => s.id === stationId);
          const auto = pickDefaultPrepaidBooking(rows, {
            type: station?.type,
            slotDuration: station?.slotDuration,
          });
          if (auto) autoLinks[stationId] = auto.link;
        }
        if (Object.keys(autoLinks).length > 0) {
          setPrepaidByStation((prev) => ({ ...prev, ...autoLinks }));
          const maxDuration = Object.values(autoLinks).reduce(
            (max, link) => Math.max(max, link?.durationMinutes ?? 0),
            0
          );
          if (maxDuration > 0) {
            setPlannedDuration((d) => Math.max(d, maxDuration));
          }
        }
      })
      .finally(() => {
        if (!cancelled) setBookingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedCustomer?.id, activeLocationId, stations]);

  const handlePrepaidSelect = (
    stationId: string,
    _bookingId: string | null,
    link: PrepaidBookingLink | null
  ) => {
    setPrepaidByStation((prev) => ({ ...prev, [stationId]: link }));
    if (link) {
      setPlannedDuration((d) => Math.max(d, link.durationMinutes));
    }
  };

  const lateNightLocked = isLateNight() && !lateNightPinUnlocked && !isAdmin;

  useEffect(() => {
    if (selectedCoupon === 'none' || couponsLoading) return;
    const valid = branchCoupons.some((c) => c.code === selectedCoupon) || selectedCoupon === 'HH99';
    if (!valid) setSelectedCoupon('none');
  }, [branchCoupons, couponsLoading, selectedCoupon]);

  const handleLateNightUnlock = () => {
    requestPinVerification(() => setLateNightPinUnlocked(true));
  };

  const couponCode = selectedCoupon !== 'none' ? selectedCoupon : undefined;

  const stationPricing = useMemo(() => {
    return stations.map((station) => {
      const playerCount = playerCounts[station.id] ?? 1;
      const undiscounted = getRateForPlayerCount(station, playerCount);
      const { finalRate, perPersonRate, invalidCoupon } = applyCouponToRate(
        undiscounted.totalRate,
        couponCode,
        playerCount,
        branchCoupons,
      );
      const suffix = pricingRateSuffix({
        type: station.type ?? 'ps5',
        slotDuration: station.slotDuration,
        category: station.category,
      });
      return {
        station,
        playerCount,
        undiscountedTotal: undiscounted.totalRate,
        undiscountedPerPerson: undiscounted.perPersonRate,
        finalRate,
        perPersonRate,
        invalidCoupon,
        suffix,
        showPlayerCount: isPerPlayerPricing(station) && (station.maxPlayers ?? 1) > 1,
      };
    });
  }, [stations, playerCounts, couponCode, branchCoupons]);

  const grandTotal = stationPricing.reduce((sum, row) => sum + row.finalRate, 0);
  const undiscountedGrandTotal = stationPricing.reduce((sum, row) => sum + row.undiscountedTotal, 0);

  useEffect(() => {
    const invalid = stationPricing.find((r) => r.invalidCoupon === 'HH99');
    if (invalid && selectedCoupon === 'HH99') {
      toast({
        title: 'Invalid Timing',
        description: 'HH99 is only valid Mon-Fri, 11 AM - 4 PM',
        variant: 'destructive',
      });
      setSelectedCoupon('none');
    }
  }, [stationPricing, selectedCoupon, toast]);

  const filteredCustomers =
    customerSearchQuery.trim() === ''
      ? customers.slice(0, 10)
      : customers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
              c.phone.includes(customerSearchQuery)
          )
          .slice(0, 10);

  const setPlayerCount = (stationId: string, count: number) => {
    setPlayerCounts((prev) => ({ ...prev, [stationId]: count }));
  };

  const handleConfirm = async () => {
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Please select a customer to start sessions',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const sessions: MultiSessionStartItem[] = stationPricing.map((row) => {
        const prepaid = prepaidByStation[row.station.id] ?? undefined;
        return {
          stationId: row.station.id,
          finalRate: prepaid ? row.station.hourlyRate : row.finalRate,
          playerCount: row.playerCount,
          perPersonRate: row.perPersonRate,
          plannedDurationMinutes: prepaid?.durationMinutes ?? plannedDuration,
          prepaidBooking: prepaid ?? undefined,
        };
      });

      await onConfirm(selectedCustomer.id, selectedCustomer.name, couponCode, sessions);
      void hapticImpact('heavy').catch(() => {});
      onOpenChange(false);
    } catch {
      /* parent handles toast */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveDialogContent
        className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        mobileClassName="px-4 pt-3"
      >
        <div className="space-y-1 pb-2">
          <h2 className="font-heading text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-cuephoria-purple" />
            Start {stations.length} stations together
          </h2>
          <p className="text-sm text-muted-foreground">
            One customer · shared duration & coupon · players per station below
          </p>
        </div>

        <div className="space-y-5 py-2">
          {/* Per-station player counts */}
          <div className="space-y-2">
            <Label className="text-base font-medium flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Stations & players
            </Label>
            <div className="space-y-2 rounded-lg border border-white/10 bg-muted/10 p-2">
              {stationPricing.map((row) => {
                const theme = getStationTheme(row.station);
                const Icon = theme.icon;
                const maxP = row.station.maxPlayers ?? 1;
                return (
                  <div
                    key={row.station.id}
                    className="flex flex-col gap-2 rounded-md border border-white/8 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${theme.iconBg}`}>
                        <Icon className={`h-4 w-4 ${theme.accent}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${theme.accent}`}>{row.station.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <CurrencyDisplay amount={row.finalRate} className="text-inherit" />
                          {row.suffix}
                          {row.showPlayerCount && row.playerCount > 1 && (
                            <span> · ₹{row.perPersonRate}/person</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {row.showPlayerCount ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Players</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={row.playerCount <= 1}
                          onClick={() => setPlayerCount(row.station.id, row.playerCount - 1)}
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{row.playerCount}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={row.playerCount >= maxP}
                          onClick={() => setPlayerCount(row.station.id, row.playerCount + 1)}
                        >
                          +
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">Flat rate</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared duration */}
          <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Play duration (all stations)
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
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Label htmlFor="multi-custom-duration" className="text-sm text-muted-foreground shrink-0">
                Custom
              </Label>
              <Input
                id="multi-custom-duration"
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

          {/* Customer */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Customer
            </Label>
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
                <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-muted/20">
                  {filteredCustomers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="w-full text-left p-3 rounded-md hover:bg-cuephoria-purple/10 border border-transparent hover:border-cuephoria-purple/30 transition-all"
                        >
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No customers found</p>
                  )}
                </div>
              </>
            ) : (
              <div className="border rounded-lg p-4 bg-cuephoria-purple/5 border-cuephoria-purple/30 flex justify-between items-start">
                <div>
                  <p className="font-medium text-lg">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                  Change
                </Button>
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="space-y-2">
              <Label className="text-base font-medium">Today&apos;s pre-paid bookings</Label>
              {bookingsLoading ? (
                <p className="text-xs text-muted-foreground">Checking bookings for each station…</p>
              ) : (
                stationPricing.map((row) => (
                  <div key={`prepaid-${row.station.id}`}>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{row.station.name}</p>
                    <PrepaidBookingNotice
                      compact
                      loading={false}
                      bookings={stationBookings[row.station.id] ?? []}
                      selectedBookingId={
                        prepaidByStation[row.station.id]
                          ? prepaidByStation[row.station.id]!.bookingId
                          : null
                      }
                      onSelectBooking={(bookingId, link) =>
                        handlePrepaidSelect(row.station.id, bookingId, link)
                      }
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Coupon */}
          {selectedCustomer && stationPricing.some((row) => !prepaidByStation[row.station.id]) && (couponsLoading || branchCoupons.length > 0) && (
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Coupon (applies to each station)
                {lateNightLocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
              </Label>
              {lateNightLocked && (
                <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-2">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    After midnight: verify with your workspace PIN to unlock coupons.
                  </p>
                  <Button onClick={handleLateNightUnlock} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <ShieldCheck className="h-4 w-4 mr-1" /> Unlock coupons
                  </Button>
                </div>
              )}
              <Select value={selectedCoupon} onValueChange={setSelectedCoupon} disabled={lateNightLocked || couponsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={couponsLoading ? 'Loading coupons…' : 'No coupon'} />
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
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-2 flex gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  HH99 only valid Mon–Fri 11 AM – 4 PM
                </div>
              )}
            </div>
          )}

          {selectedCustomer && (
            <div className="rounded-lg border p-4 bg-gradient-to-r from-cuephoria-purple/10 to-transparent space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{stations.length} stations subtotal</span>
                <CurrencyDisplay amount={undiscountedGrandTotal} />
              </div>
              {couponCode && grandTotal !== undiscountedGrandTotal && (
                <div className="flex justify-between text-sm text-cuephoria-orange">
                  <span>Discount ({couponCode})</span>
                  <span>− ₹{undiscountedGrandTotal - grandTotal}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-2">
                <span>Combined rate / hr</span>
                <CurrencyDisplay amount={grandTotal} className="text-cuephoria-lightpurple text-xl" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!selectedCustomer || submitting}
            className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
          >
            {submitting ? 'Starting…' : `Start ${stations.length} sessions`}
          </Button>
        </DialogFooter>
      </ResponsiveDialogContent>

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

export default MultiStartSessionDialog;
