export type BranchBookingCoupon = {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  enabled: boolean;
};

export type CouponSelectOption = {
  value: string;
  label: string;
};
