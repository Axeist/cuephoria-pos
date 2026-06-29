import type {
  PromoCoupon,
  PromoCouponEligibility,
  PromoCouponValidateContext,
} from '@/types/promoCoupon.types';

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function slotStartMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function checkTimeRange(
  slots: { start: Date }[],
  rules: PromoCouponEligibility,
): boolean {
  if (!rules.timeRange) return true;
  const startMin = parseTimeToMinutes(rules.timeRange.start);
  const endMin = parseTimeToMinutes(rules.timeRange.end);
  const mode = rules.timeMatchMode ?? 'slot_start';

  const slotMatches = (slot: { start: Date }) => {
    const day = slot.start.getDay();
    if (rules.daysOfWeek?.length && !rules.daysOfWeek.includes(day)) return false;
    const mins = slotStartMinutes(slot.start);
    return mins >= startMin && mins < endMin;
  };

  if (mode === 'any_slot') return slots.some(slotMatches);
  if (mode === 'all_slots') return slots.length > 0 && slots.every(slotMatches);
  return slots.length > 0 && slotMatches(slots[0]);
}

function checkOfferDates(selectedDate: Date, rules: PromoCouponEligibility): boolean {
  const iso = toDateOnly(selectedDate);
  if (rules.offerDates?.length) {
    return rules.offerDates.includes(iso);
  }
  if (rules.offerDateRange) {
    return iso >= rules.offerDateRange.start && iso <= rules.offerDateRange.end;
  }
  if (rules.daysOfWeek?.length && !rules.timeRange) {
    return rules.daysOfWeek.includes(selectedDate.getDay());
  }
  return true;
}

function checkBookingWindow(now: Date, rules: PromoCouponEligibility): boolean {
  if (!rules.bookingWindow) return true;
  const t = now.getTime();
  return (
    t >= new Date(rules.bookingWindow.start).getTime() &&
    t <= new Date(rules.bookingWindow.end).getTime()
  );
}

function checkAdvanceDays(selectedDate: Date, now: Date, rules: PromoCouponEligibility): boolean {
  const msPerDay = 86400000;
  const daysAhead = Math.floor(
    (new Date(toDateOnly(selectedDate)).getTime() - new Date(toDateOnly(now)).getTime()) /
      msPerDay,
  );
  if (rules.minAdvanceDays != null && daysAhead < rules.minAdvanceDays) return false;
  if (rules.maxAdvanceDays != null && daysAhead > rules.maxAdvanceDays) return false;
  return true;
}

function checkStations(
  stations: PromoCouponValidateContext['stations'],
  rules: PromoCouponEligibility,
): boolean {
  if (!stations.length) return true;
  const types = stations.map((s) => s.type.toLowerCase());
  if (rules.excludeStationTypes?.length) {
    const excluded = new Set(rules.excludeStationTypes.map((t) => t.toLowerCase()));
    if (types.some((t) => excluded.has(t))) return false;
  }
  if (rules.stationTypes?.length) {
    const allowed = new Set(rules.stationTypes.map((t) => t.toLowerCase()));
    return types.every((t) => allowed.has(t));
  }
  if (rules.stationIds?.length) {
    const allowed = new Set(rules.stationIds);
    return stations.every((s) => allowed.has(s.id));
  }
  return true;
}

export function validatePromoCouponEligibility(
  coupon: PromoCoupon,
  ctx: PromoCouponValidateContext,
): { ok: true } | { ok: false; error: string } {
  const now = ctx.now ?? new Date();

  if (!coupon.enabled) {
    return { ok: false, error: 'This coupon is not active.' };
  }

  if (!coupon.channels.includes(ctx.channel)) {
    return { ok: false, error: 'This coupon cannot be used here.' };
  }

  if (coupon.locationId && coupon.locationId !== ctx.locationId) {
    return { ok: false, error: 'This coupon is not valid at this branch.' };
  }

  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return { ok: false, error: 'This coupon is not active yet.' };
  }
  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return { ok: false, error: 'This coupon has expired.' };
  }

  if (coupon.maxUsesTotal != null && coupon.usesCount >= coupon.maxUsesTotal) {
    return { ok: false, error: 'This coupon has reached its usage limit.' };
  }

  const rules = coupon.eligibilityRules ?? {};

  if (!checkBookingWindow(now, rules)) {
    return { ok: false, error: 'This coupon cannot be used during this booking period.' };
  }

  if (!checkOfferDates(ctx.selectedDate, rules)) {
    return { ok: false, error: 'This coupon is not valid for the selected date.' };
  }

  if (!checkAdvanceDays(ctx.selectedDate, now, rules)) {
    return { ok: false, error: 'This coupon is not valid for how far in advance you are booking.' };
  }

  if (!checkTimeRange(ctx.slots, rules)) {
    return { ok: false, error: 'This coupon is not valid for the selected time slots.' };
  }

  if (rules.minSlots != null && ctx.slotCount < rules.minSlots) {
    return { ok: false, error: `This coupon requires at least ${rules.minSlots} slot(s).` };
  }
  if (rules.maxSlots != null && ctx.slotCount > rules.maxSlots) {
    return { ok: false, error: `This coupon allows at most ${rules.maxSlots} slot(s).` };
  }

  if (!checkStations(ctx.stations, rules)) {
    return { ok: false, error: 'This coupon is not valid for the selected station(s).' };
  }

  if (rules.minBookingAmount != null && (ctx.subtotal ?? 0) < rules.minBookingAmount) {
    return { ok: false, error: `Minimum booking amount is ₹${rules.minBookingAmount}.` };
  }

  if (ctx.channel === 'public_booking' && !coupon.allowsOnlinePayment) {
    return { ok: false, error: 'This coupon is for pay-at-venue only.' };
  }

  return { ok: true };
}

export function validatePromoCouponCustomer(
  coupon: PromoCoupon,
  customer?: PromoCouponValidateContext['customer'],
): { ok: true } | { ok: false; error: string } {
  const groups = coupon.customerGroups ?? ['all'];
  const isMember = Boolean(customer?.membershipTierId);
  const isCardHolder = Boolean(
    customer?.activeCardId || (customer?.cardBalance ?? 0) > 0,
  );
  const isNew = customer?.isNew ?? !customer?.id;

  if (coupon.memberOnly && !isMember) {
    return { ok: false, error: 'This coupon is for members only.' };
  }

  if (
    coupon.membershipTierIds?.length &&
    customer?.membershipTierId &&
    !coupon.membershipTierIds.includes(customer.membershipTierId)
  ) {
    return { ok: false, error: 'Your membership tier is not eligible for this coupon.' };
  }

  if (!groups.includes('all')) {
    const allowed =
      (groups.includes('members') && isMember) ||
      (groups.includes('non_members') && !isMember) ||
      (groups.includes('card_holders') && isCardHolder) ||
      (groups.includes('new_customers') && isNew) ||
      (groups.includes('returning_customers') && !isNew && Boolean(customer?.id));
    if (!allowed) {
      return { ok: false, error: 'You are not eligible for this coupon.' };
    }
  }

  return { ok: true };
}

export function formatPromoEligibilitySummary(coupon: PromoCoupon): string {
  const parts: string[] = [];
  const r = coupon.eligibilityRules;
  if (r.offerDates?.length === 1) parts.push(`Date: ${r.offerDates[0]}`);
  if (r.daysOfWeek?.length) parts.push(`${r.daysOfWeek.length} day(s)/week`);
  if (r.timeRange) parts.push(`${r.timeRange.start}–${r.timeRange.end}`);
  if (r.stationTypes?.length) parts.push(r.stationTypes.join(', '));
  if (coupon.memberOnly) parts.push('Members');
  return parts.length ? parts.join(' · ') : 'No restrictions';
}
