/** Shared coupon / happy-hour helpers for start-session flows */

export const isHappyHour = (): boolean => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();
  return dayOfWeek >= 1 && dayOfWeek <= 5 && currentHour >= 11 && currentHour < 16;
};

export function applyCouponToRate(
  undiscountedRate: number,
  couponCode: string | undefined,
  playerCount: number
): { finalRate: number; perPersonRate: number; invalidCoupon?: string } {
  if (!couponCode || couponCode === 'none') {
    return {
      finalRate: undiscountedRate,
      perPersonRate: playerCount > 0 ? undiscountedRate / playerCount : undiscountedRate,
    };
  }

  let newRate = undiscountedRate;

  switch (couponCode) {
    case 'HH99':
      if (!isHappyHour()) {
        return { finalRate: undiscountedRate, perPersonRate: undiscountedRate / playerCount, invalidCoupon: 'HH99' };
      }
      newRate = 99;
      break;
    case 'CUEPHORIA20':
      newRate = undiscountedRate * 0.8;
      break;
    case 'CUEPHORIA35':
    case 'NIT35':
      newRate = undiscountedRate * 0.65;
      break;
    case 'AAVEG50':
    case 'GAMEINSIDER50':
      newRate = undiscountedRate * 0.5;
      break;
    case 'AXEIST':
      newRate = 0;
      break;
    default:
      newRate = undiscountedRate;
  }

  const finalRate = Math.round(newRate);
  return {
    finalRate,
    perPersonRate: playerCount > 0 ? Math.round(finalRate / playerCount) : finalRate,
  };
}

export const COUPON_OPTIONS = [
  { value: 'none', label: 'No coupon - Regular Price' },
  { value: 'HH99', label: '🎮 HH99 - ₹99/hour (Mon-Fri 11AM-4PM)' },
  { value: 'CUEPHORIA20', label: '🎉 CUEPHORIA20 - 20% OFF' },
  { value: 'CUEPHORIA35', label: '🎓 CUEPHORIA35 - 35% OFF (Student ID Required)' },
  { value: 'NIT35', label: '🏫 NIT35 - 35% OFF (NIT Students)' },
  { value: 'AAVEG50', label: '🎓 AAVEG50 - 50% OFF (NIT College Freshers)' },
  { value: 'GAMEINSIDER50', label: '🎮 GAMEINSIDER50 - 50% OFF (GameInsider Enrollment Required)' },
  { value: 'AXEIST', label: '👑 AXEIST - 100% OFF (VIP)' },
] as const;
