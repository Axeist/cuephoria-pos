import type { TaxSettings } from '@/hooks/useAppSettings.types';

export type GstPricingMode = 'inclusive' | 'exclusive';

export interface BillTaxInput {
  subtotal: number;
  discountValue: number;
  loyaltyPointsUsed: number;
  gstEnabled: boolean;
  gstRate: number;
  gstPricingMode?: GstPricingMode;
  isComplimentary?: boolean;
}

export interface BillTaxResult {
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
  total: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeDiscountValue(
  subtotal: number,
  discount: number,
  discountType: 'percentage' | 'fixed',
): number {
  if (discountType === 'percentage') {
    return subtotal * (discount / 100);
  }
  return discount;
}

export function computeBillTax(input: BillTaxInput): BillTaxResult {
  const {
    subtotal,
    discountValue,
    loyaltyPointsUsed,
    gstEnabled,
    gstRate,
    gstPricingMode = 'inclusive',
    isComplimentary,
  } = input;

  const netBeforeTax = Math.max(0, subtotal - discountValue - loyaltyPointsUsed);

  if (isComplimentary || !gstEnabled || gstRate <= 0) {
    return {
      taxableAmount: round2(netBeforeTax),
      taxAmount: 0,
      taxRate: 0,
      total: round2(netBeforeTax),
    };
  }

  if (gstPricingMode === 'exclusive') {
    const taxableAmount = round2(netBeforeTax);
    const taxAmount = round2(taxableAmount * (gstRate / 100));
    return {
      taxableAmount,
      taxAmount,
      taxRate: gstRate,
      total: round2(taxableAmount + taxAmount),
    };
  }

  const total = round2(netBeforeTax);
  const taxableAmount = round2(total / (1 + gstRate / 100));
  const taxAmount = round2(total - taxableAmount);
  return {
    taxableAmount,
    taxAmount,
    taxRate: gstRate,
    total,
  };
}

export function computeBillTaxFromCart(
  subtotal: number,
  discount: number,
  discountType: 'percentage' | 'fixed',
  loyaltyPointsUsed: number,
  taxSettings: TaxSettings,
  options?: { isComplimentary?: boolean },
): BillTaxResult {
  const discountValue = computeDiscountValue(subtotal, discount, discountType);
  return computeBillTax({
    subtotal,
    discountValue,
    loyaltyPointsUsed,
    gstEnabled: taxSettings.gstEnabled,
    gstRate: taxSettings.gstRate,
    gstPricingMode: taxSettings.gstPricingMode ?? 'inclusive',
    isComplimentary: options?.isComplimentary,
  });
}
