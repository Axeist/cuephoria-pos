export type PromoCouponDiscountType = 'percentage' | 'fixed' | 'flat_rate';

export type PromoCouponDiscountScope = 'whole_booking' | 'per_station' | 'per_station_type';

export type PromoCouponChannel = 'public_booking' | 'pos_session' | 'venue_payment';

export type PromoCouponCustomerGroup =
  | 'all'
  | 'members'
  | 'non_members'
  | 'card_holders'
  | 'new_customers'
  | 'returning_customers';

export type PromoCouponEligibility = {
  bookingWindow?: { start: string; end: string };
  offerDates?: string[];
  offerDateRange?: { start: string; end: string };
  minAdvanceDays?: number;
  maxAdvanceDays?: number;
  daysOfWeek?: number[];
  timeRange?: { start: string; end: string };
  timeMatchMode?: 'slot_start' | 'all_slots' | 'any_slot';
  stationTypes?: string[];
  stationIds?: string[];
  excludeStationTypes?: string[];
  minSlots?: number;
  maxSlots?: number;
  minBookingAmount?: number;
  minPlayers?: number;
};

export type PromoCouponGates = {
  requireInstagramFollow?: boolean;
  requireStudentConfirm?: boolean;
  requirePhoneVerified?: boolean;
};

export interface PromoCoupon {
  id: string;
  organizationId: string;
  locationId?: string | null;
  code: string;
  description: string;
  enabled: boolean;
  discountType: PromoCouponDiscountType;
  discountValue: number;
  discountScope: PromoCouponDiscountScope;
  channels: PromoCouponChannel[];
  memberOnly: boolean;
  membershipTierIds?: string[] | null;
  customerGroups: PromoCouponCustomerGroup[];
  allowsOnlinePayment: boolean;
  allowsVenuePayment: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  eligibilityRules: PromoCouponEligibility;
  gates: PromoCouponGates;
  stackable: boolean;
  maxUsesTotal?: number | null;
  usesCount: number;
  maxUsesPerCustomer?: number | null;
  successMessage?: string | null;
  emoji?: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type PromoCouponValidateContext = {
  channel: PromoCouponChannel;
  locationId: string;
  selectedDate: Date;
  slots: { start: Date; end?: Date }[];
  stations: { id: string; type: string; pricingMode?: string | null }[];
  slotCount: number;
  subtotal?: number;
  now?: Date;
  customer?: {
    id?: string;
    membershipTierId?: string | null;
    activeCardId?: string | null;
    cardBalance?: number;
    isNew?: boolean;
    phone?: string;
  };
};

export type AppliedPromoCoupon = {
  code: string;
  scopeKey: string;
  coupon: PromoCoupon;
};
