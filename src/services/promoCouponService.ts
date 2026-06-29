import { adminFetch } from '@/services/adminFetch';
import type { PromoCoupon, PromoCouponChannel } from '@/types/promoCoupon.types';

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };

export async function fetchPromoCouponsAdmin(locationId?: string | null): Promise<PromoCoupon[]> {
  const qs = locationId ? `?location_id=${encodeURIComponent(locationId)}` : '';
  const res = await adminFetch(`/api/admin/promo-coupons${qs}`);
  const json = (await res.json().catch(() => ({}))) as ApiOk<{ coupons: PromoCoupon[] }> | ApiErr;
  if (!res.ok || json.ok === false) {
    throw new Error((json as ApiErr).error || `Request failed (${res.status})`);
  }
  return (json as ApiOk<{ coupons: PromoCoupon[] }>).coupons ?? [];
}

export async function upsertPromoCouponAdmin(
  coupon: Partial<PromoCoupon> & { code: string },
): Promise<PromoCoupon> {
  const res = await adminFetch('/api/admin/promo-coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'upsert', coupon }),
  });
  const json = (await res.json().catch(() => ({}))) as ApiOk<{ coupon: PromoCoupon }> | ApiErr;
  if (!res.ok || json.ok === false) {
    throw new Error((json as ApiErr).error || `Request failed (${res.status})`);
  }
  return (json as ApiOk<{ coupon: PromoCoupon }>).coupon;
}

export async function deletePromoCouponAdmin(id: string): Promise<void> {
  const res = await adminFetch('/api/admin/promo-coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'delete', id }),
  });
  const json = (await res.json().catch(() => ({}))) as ApiOk<Record<string, never>> | ApiErr;
  if (!res.ok || json.ok === false) {
    throw new Error((json as ApiErr).error || `Request failed (${res.status})`);
  }
}

export async function fetchPublicPromoCoupons(
  locationId: string,
  channel: PromoCouponChannel = 'public_booking',
): Promise<PromoCoupon[]> {
  const qs = new URLSearchParams({
    location_id: locationId,
    channel,
  });
  const res = await fetch(`/api/tenant/promo-coupon-validate?${qs.toString()}`);
  const json = (await res.json().catch(() => ({}))) as ApiOk<{ coupons: PromoCoupon[] }> | ApiErr;
  if (!res.ok || json.ok === false) {
    return [];
  }
  return (json as ApiOk<{ coupons: PromoCoupon[] }>).coupons ?? [];
}

export async function validatePublicPromoCoupon(args: {
  locationId: string;
  code: string;
  phone?: string;
  channel?: PromoCouponChannel;
  selectedDate?: string;
  slots?: { start: string; end?: string }[];
  stations?: { id: string; type: string; pricingMode?: string | null }[];
  slotCount?: number;
  subtotal?: number;
}): Promise<{ ok: true; coupon: PromoCoupon } | { ok: false; error: string }> {
  const res = await fetch('/api/tenant/promo-coupon-validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location_id: args.locationId,
      code: args.code,
      phone: args.phone,
      channel: args.channel ?? 'public_booking',
      selectedDate: args.selectedDate,
      slots: args.slots,
      stations: args.stations,
      slotCount: args.slotCount,
      subtotal: args.subtotal,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as
    | ApiOk<{ coupon: PromoCoupon }>
    | ApiErr;
  if (!res.ok || json.ok === false) {
    return { ok: false, error: (json as ApiErr).error || 'Invalid coupon' };
  }
  return { ok: true, coupon: (json as ApiOk<{ coupon: PromoCoupon }>).coupon };
}
