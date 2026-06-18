export type CouponPromoPopup = {
  id: string;
  enabled: boolean;
  sort_order: number;
  delay_seconds: number;
  title: string;
  discount_label: string;
  description: string;
  coupon_code: string;
  /** When set, popup only auto-shows during these local hours (inclusive start, exclusive end). */
  happy_hour_start?: number | null;
  happy_hour_end?: number | null;
};

export type OnlinePaymentPromoConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  body: string;
};

export type InstagramGateConfig = {
  enabled: boolean;
  instagram_url: string;
  instagram_handle: string;
  /** Uppercase coupon codes that require Instagram follow for new customers. */
  require_for_coupon_codes: string[];
};

export type PublicBookingPopupConfig = {
  coupon_promo_enabled: boolean;
  coupon_popups: CouponPromoPopup[];
  online_payment_promo: OnlinePaymentPromoConfig;
  instagram_gate: InstagramGateConfig;
};

export type BranchPublicBookingPopupConfig = {
  /** When true (default), merge workspace defaults with branch overrides. */
  use_workspace_defaults: boolean;
  coupon_promo_enabled?: boolean;
  coupon_popups?: CouponPromoPopup[];
  online_payment_promo?: Partial<OnlinePaymentPromoConfig>;
  instagram_gate?: Partial<InstagramGateConfig>;
};

export const BOOKING_POPUP_BRANCH_SETTING_KEY = "public_booking_popup_config";
