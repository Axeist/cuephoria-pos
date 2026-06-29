import type {
  MembershipCoupon,
  MembershipFeatureFlagKey,
  MembershipRechargeTier,
  MembershipTier,
} from '@/types/membership.types';

export type HubZone = 'ops' | 'setup';
export type SetupSection = 'tiers' | 'bundles' | 'coupons' | 'settings';

export const FEATURE_FLAG_META: Record<
  MembershipFeatureFlagKey,
  { label: string; description: string; group: 'core' | 'cards' | 'booking' }
> = {
  module_enabled: {
    label: 'Memberships module',
    description: 'Master switch for all membership features at this branch.',
    group: 'core',
  },
  tier_plans_enabled: {
    label: 'Tier plans',
    description: 'Named tiers with playtime and F&B discounts.',
    group: 'core',
  },
  nfc_cards_enabled: {
    label: 'NFC cards',
    description: 'Assign physical cards and look up members by tap.',
    group: 'cards',
  },
  card_balance_enabled: {
    label: 'Card balance',
    description: 'Prepaid wallet balance on member cards.',
    group: 'cards',
  },
  card_balance_payments_enabled: {
    label: 'Pay with balance',
    description: 'Allow checkout redemption from card balance.',
    group: 'cards',
  },
  recharge_tiers_enabled: {
    label: 'Recharge tiers',
    description: 'Preset pay/credit bundles for top-ups.',
    group: 'cards',
  },
  physical_cards_inventory_enabled: {
    label: 'Card inventory',
    description: 'Track unassigned NFC cards in stock.',
    group: 'cards',
  },
  registration_deposit_enabled: {
    label: 'Registration deposit',
    description: 'Collect a deposit when enrolling new members.',
    group: 'core',
  },
  member_coupons_enabled: {
    label: 'Member coupons',
    description: 'Exclusive promo codes for members.',
    group: 'core',
  },
  public_member_venue_booking_enabled: {
    label: 'Member venue booking',
    description: 'Members book courts/stations on the public portal.',
    group: 'booking',
  },
  booking_pay_at_venue_enabled: {
    label: 'Pay at venue',
    description: 'Members can pay at the venue for online bookings.',
    group: 'booking',
  },
};

export const WIZARD_SKIP_KEY = 'membership-wizard-skipped';

export function emptyTierForm(): Partial<MembershipTier> & { name: string } {
  return {
    name: '',
    slug: '',
    sortOrder: 0,
    isActive: true,
    playtimeDiscountPct: 0,
    fnbDiscountPct: 0,
    fnbBenefitsEnabled: true,
    cardPaymentFnbEnabled: false,
    bookingPayAtVenueEnabled: false,
    retailPrice: 0,
    walletCreditOnPurchase: 0,
    defaultDuration: 'monthly',
    defaultValidityDays: null,
    defaultMembershipHours: null,
    description: '',
    tagline: '',
    accentColor: 'violet',
    compareAtPrice: null,
  };
}

export function emptyRechargeForm(): Partial<MembershipRechargeTier> & {
  payAmount: number;
  creditAmount: number;
} {
  return {
    payAmount: 0,
    creditAmount: 0,
    isActive: true,
    sortOrder: 0,
  };
}

export function emptyCouponForm(): Partial<MembershipCoupon> & { code: string } {
  return {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    enabled: true,
    memberOnly: true,
    allowsVenuePayment: false,
    membershipTierId: null,
    usesCount: 0,
  };
}

/** Map legacy ?tab= query values to new zone + section. */
export function parseLegacyTab(tab: string | null): { zone: HubZone; section?: SetupSection } | null {
  if (!tab) return null;
  switch (tab) {
    case 'settings':
      return { zone: 'setup', section: 'settings' };
    case 'tiers':
      return { zone: 'setup', section: 'tiers' };
    case 'coupons':
      return { zone: 'setup', section: 'coupons' };
    case 'recharge':
    case 'cards':
      return { zone: 'ops' };
    default:
      return null;
  }
}
