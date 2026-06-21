export type MembershipCardStatus = 'inventory' | 'assigned' | 'lost' | 'retired';

export type MembershipLedgerType =
  | 'recharge'
  | 'redemption'
  | 'deposit'
  | 'refund'
  | 'adjustment';

export type MembershipFeatureFlagKey =
  | 'module_enabled'
  | 'tier_plans_enabled'
  | 'nfc_cards_enabled'
  | 'nfc_simulation_enabled'
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
  nfc_simulation_enabled: false,
  card_balance_enabled: false,
  card_balance_payments_enabled: false,
  recharge_tiers_enabled: false,
  physical_cards_inventory_enabled: false,
  registration_deposit_enabled: false,
  member_coupons_enabled: false,
  public_member_venue_booking_enabled: false,
  booking_pay_at_venue_enabled: false,
};

export interface MembershipTier {
  id: string;
  organizationId: string;
  locationId?: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  playtimeDiscountPct: number;
  fnbDiscountPct: number;
  cardPaymentFnbEnabled: boolean;
  bookingPayAtVenueEnabled: boolean;
  minRechargeAmount?: number | null;
  maxCardBalance?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipRechargeTier {
  id: string;
  organizationId: string;
  membershipTierId?: string | null;
  payAmount: number;
  creditAmount: number;
  isActive: boolean;
  sortOrder: number;
}

export interface MembershipSettings {
  id: string;
  organizationId: string;
  locationId?: string | null;
  registrationDepositAmount: number;
  replacementCardFee: number;
  depositProductId?: string | null;
  replacementCardProductId?: string | null;
  featureFlags: MembershipFeatureFlags;
}

export interface MembershipCard {
  id: string;
  organizationId: string;
  locationId?: string | null;
  uid: string;
  status: MembershipCardStatus;
  customerId?: string | null;
  assignedAt?: string | null;
  retiredAt?: string | null;
}

export interface MembershipCoupon {
  id: string;
  organizationId: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  enabled: boolean;
  memberOnly: boolean;
  membershipTierId?: string | null;
  allowsVenuePayment: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  usesCount: number;
}

export interface MembershipLedgerEntry {
  id: string;
  organizationId: string;
  customerId: string;
  type: MembershipLedgerType;
  amount: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  createdBy?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface MembershipCardLookupResult {
  card: MembershipCard;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    membershipTierId?: string | null;
    cardBalance: number;
    membershipExpiryDate?: string | null;
    membershipHoursLeft?: number | null;
  };
  tier?: MembershipTier | null;
}
