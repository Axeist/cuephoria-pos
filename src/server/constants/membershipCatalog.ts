/** Server-safe membership constants (edge bundle — no @/ imports). */

export type MembershipFeatureFlagKey =
  | 'module_enabled'
  | 'tier_plans_enabled'
  | 'nfc_cards_enabled'
  | 'card_balance_enabled'
  | 'card_balance_payments_enabled'
  | 'recharge_tiers_enabled'
  | 'physical_cards_inventory_enabled'
  | 'registration_deposit_enabled'
  | 'member_coupons_enabled'
  | 'public_member_venue_booking_enabled'
  | 'booking_pay_at_venue_enabled';

export type MembershipFeatureFlags = Partial<Record<MembershipFeatureFlagKey, boolean>>;

export const DEFAULT_MEMBERSHIP_FEATURE_FLAGS: Record<MembershipFeatureFlagKey, boolean> = {
  module_enabled: false,
  tier_plans_enabled: false,
  nfc_cards_enabled: false,
  card_balance_enabled: false,
  card_balance_payments_enabled: false,
  recharge_tiers_enabled: false,
  physical_cards_inventory_enabled: false,
  registration_deposit_enabled: false,
  member_coupons_enabled: false,
  public_member_venue_booking_enabled: false,
  booking_pay_at_venue_enabled: false,
};
