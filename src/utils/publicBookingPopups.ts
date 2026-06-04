import type {
  BranchPublicBookingPopupConfig,
  CouponPromoPopup,
  InstagramGateConfig,
  OnlinePaymentPromoConfig,
  PublicBookingPopupConfig,
} from "@/types/publicBookingPopups";

export const EMPTY_PUBLIC_BOOKING_POPUP_CONFIG: PublicBookingPopupConfig = {
  coupon_promo_enabled: false,
  coupon_popups: [],
  online_payment_promo: {
    enabled: false,
    title: "Book online — best experience",
    subtitle: "Pay Online",
    body: "Pay online to confirm your slot instantly — UPI and cards supported.",
  },
  instagram_gate: {
    enabled: false,
    instagram_url: "",
    instagram_handle: "",
    require_for_coupon_codes: [],
  },
};

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function parseCouponPopups(raw: unknown): CouponPromoPopup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, idx) => {
      const r = asRecord(row);
      const code = String(r.coupon_code ?? "").trim().toUpperCase();
      if (!code) return null;
      return {
        id: String(r.id ?? `popup-${idx}`),
        enabled: r.enabled !== false,
        sort_order: Number(r.sort_order ?? idx),
        delay_seconds: Math.max(0, Math.min(600, Number(r.delay_seconds ?? 30))),
        title: String(r.title ?? "Special offer"),
        discount_label: String(r.discount_label ?? ""),
        description: String(r.description ?? ""),
        coupon_code: code,
        happy_hour_start:
          r.happy_hour_start === null || r.happy_hour_start === undefined
            ? null
            : Math.max(0, Math.min(23, Number(r.happy_hour_start))),
        happy_hour_end:
          r.happy_hour_end === null || r.happy_hour_end === undefined
            ? null
            : Math.max(0, Math.min(24, Number(r.happy_hour_end))),
      } satisfies CouponPromoPopup;
    })
    .filter(Boolean) as CouponPromoPopup[];
}

function parseOnlinePromo(raw: unknown, base: OnlinePaymentPromoConfig): OnlinePaymentPromoConfig {
  const r = asRecord(raw);
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : base.enabled,
    title: String(r.title ?? base.title).slice(0, 120),
    subtitle: String(r.subtitle ?? base.subtitle).slice(0, 80),
    body: String(r.body ?? base.body).slice(0, 500),
  };
}

function parseInstagramGate(raw: unknown, base: InstagramGateConfig): InstagramGateConfig {
  const r = asRecord(raw);
  const codes = Array.isArray(r.require_for_coupon_codes)
    ? r.require_for_coupon_codes
        .map((c) => String(c).trim().toUpperCase())
        .filter(Boolean)
    : base.require_for_coupon_codes;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : base.enabled,
    instagram_url: String(r.instagram_url ?? base.instagram_url).trim().slice(0, 512),
    instagram_handle: String(r.instagram_handle ?? base.instagram_handle).trim().slice(0, 80),
    require_for_coupon_codes: codes,
  };
}

export function parsePublicBookingPopupConfig(raw: unknown): PublicBookingPopupConfig {
  const base = EMPTY_PUBLIC_BOOKING_POPUP_CONFIG;
  const r = asRecord(raw);
  return {
    coupon_promo_enabled:
      typeof r.coupon_promo_enabled === "boolean" ? r.coupon_promo_enabled : base.coupon_promo_enabled,
    coupon_popups: parseCouponPopups(r.coupon_popups),
    online_payment_promo: parseOnlinePromo(r.online_payment_promo, base.online_payment_promo),
    instagram_gate: parseInstagramGate(r.instagram_gate, base.instagram_gate),
  };
}

export function parseBranchPopupOverride(raw: unknown): BranchPublicBookingPopupConfig {
  const r = asRecord(raw);
  const out: BranchPublicBookingPopupConfig = {
    use_workspace_defaults: r.use_workspace_defaults !== false,
  };
  if (typeof r.coupon_promo_enabled === "boolean") out.coupon_promo_enabled = r.coupon_promo_enabled;
  if (Array.isArray(r.coupon_popups)) out.coupon_popups = parseCouponPopups(r.coupon_popups);
  if (r.online_payment_promo !== undefined) {
    out.online_payment_promo = parseOnlinePromo(
      r.online_payment_promo,
      EMPTY_PUBLIC_BOOKING_POPUP_CONFIG.online_payment_promo,
    );
  }
  if (r.instagram_gate !== undefined) {
    out.instagram_gate = parseInstagramGate(
      r.instagram_gate,
      EMPTY_PUBLIC_BOOKING_POPUP_CONFIG.instagram_gate,
    );
  }
  return out;
}

export function mergePublicBookingPopupConfig(
  workspaceDefaults: PublicBookingPopupConfig,
  branchOverride: BranchPublicBookingPopupConfig | null | undefined,
): PublicBookingPopupConfig {
  if (!branchOverride || branchOverride.use_workspace_defaults !== false) {
    const merged: PublicBookingPopupConfig = {
      ...workspaceDefaults,
      coupon_popups: [...workspaceDefaults.coupon_popups],
    };
    if (!branchOverride) return merged;
    if (typeof branchOverride.coupon_promo_enabled === "boolean") {
      merged.coupon_promo_enabled = branchOverride.coupon_promo_enabled;
    }
    if (branchOverride.coupon_popups?.length) {
      merged.coupon_popups = branchOverride.coupon_popups;
    }
    if (branchOverride.online_payment_promo) {
      merged.online_payment_promo = {
        ...merged.online_payment_promo,
        ...branchOverride.online_payment_promo,
      };
    }
    if (branchOverride.instagram_gate) {
      merged.instagram_gate = {
        ...merged.instagram_gate,
        ...branchOverride.instagram_gate,
      };
    }
    return merged;
  }

  const base = EMPTY_PUBLIC_BOOKING_POPUP_CONFIG;
  return {
    coupon_promo_enabled: branchOverride.coupon_promo_enabled ?? false,
    coupon_popups: branchOverride.coupon_popups ?? [],
    online_payment_promo: branchOverride.online_payment_promo
      ? { ...base.online_payment_promo, ...branchOverride.online_payment_promo }
      : base.online_payment_promo,
    instagram_gate: branchOverride.instagram_gate
      ? { ...base.instagram_gate, ...branchOverride.instagram_gate }
      : base.instagram_gate,
  };
}

export function slugifyBranch(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
