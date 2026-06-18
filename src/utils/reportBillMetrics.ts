import type {
  BillAggregateMetrics,
  GamingRevenueStats,
  PaymentBreakdownStats,
} from '@/hooks/useLocationAnalytics';
import type { Bill, Product } from '@/types/pos.types';

const CANTEEN_CATEGORIES = new Set([
  'food',
  'foods',
  'drinks',
  'drink',
  'snacks',
  'beverage',
  'beverages',
  'tobacco',
]);

function paymentMethod(bill: Bill): string {
  return (bill.paymentMethod || '').toLowerCase();
}

/** Mirror get_payment_breakdown_stats RPC logic on the client bill list. */
export function computePaymentBreakdownFromBills(bills: Bill[]): PaymentBreakdownStats {
  const paidBills = bills.filter((b) => paymentMethod(b) !== 'complimentary');

  let cashTotal = 0;
  let upiTotal = 0;
  let creditTotal = 0;
  let razorpayTotal = 0;
  let splitCashTotal = 0;
  let splitUpiTotal = 0;
  let cashOnlyCount = 0;
  let upiOnlyCount = 0;
  let creditOnlyCount = 0;
  let razorpayOnlyCount = 0;
  let splitCount = 0;

  for (const bill of paidBills) {
    const isSplit = Boolean(bill.isSplitPayment);
    const total = Number(bill.total) || 0;
    const cashAmt = Number(bill.cashAmount) || 0;
    const upiAmt = Number(bill.upiAmount) || 0;
    const method = paymentMethod(bill);

    if (isSplit) {
      splitCount += 1;
      splitCashTotal += cashAmt;
      splitUpiTotal += upiAmt;
      cashTotal += cashAmt;
      upiTotal += upiAmt;
      continue;
    }

    if (method === 'cash') {
      cashOnlyCount += 1;
      cashTotal += total;
    } else if (method === 'upi') {
      upiOnlyCount += 1;
      upiTotal += total;
    } else if (method === 'credit') {
      creditOnlyCount += 1;
      creditTotal += total;
    } else if (method === 'razorpay') {
      razorpayOnlyCount += 1;
      razorpayTotal += total;
    }
  }

  const totalRevenue = paidBills.reduce((sum, bill) => {
    if (bill.isSplitPayment) {
      return sum + (Number(bill.cashAmount) || 0) + (Number(bill.upiAmount) || 0);
    }
    return sum + (Number(bill.total) || 0);
  }, 0);

  return {
    totalRevenue,
    totalTransactions: paidBills.length,
    cashTotal,
    upiTotal,
    creditTotal,
    razorpayTotal,
    cashOnlyCount,
    upiOnlyCount,
    creditOnlyCount,
    razorpayOnlyCount,
    splitCount,
    splitCashTotal,
    splitUpiTotal,
  };
}

/** Mirror get_gaming_revenue_breakdown RPC logic on the client bill list. */
export function computeGamingRevenueFromBills(
  bills: Bill[],
  products: Product[],
): GamingRevenueStats {
  const paidBills = bills.filter((b) => paymentMethod(b) !== 'complimentary');

  let ps5Gaming = 0;
  let eightBallPool = 0;
  let challengesRevenue = 0;
  let canteenSales = 0;

  for (const bill of paidBills) {
    const ratio = bill.subtotal > 0 ? bill.total / bill.subtotal : 1;

    for (const item of bill.items) {
      const discounted = (Number(item.total) || 0) * ratio;
      const nameLower = item.name.toLowerCase();

      if (item.type === 'session') {
        if (nameLower.includes('ps5') || nameLower.includes('playstation')) {
          ps5Gaming += discounted;
        } else if (
          nameLower.includes('pool') ||
          nameLower.includes('8-ball') ||
          nameLower.includes('8 ball')
        ) {
          eightBallPool += discounted;
        }
        continue;
      }

      if (item.type !== 'product') continue;

      const product = products.find((p) => p.id === item.id);
      const category = (product?.category || '').toLowerCase();

      if (
        category === 'challenges' ||
        category === 'challenge' ||
        nameLower.includes('ps5 joystick') ||
        nameLower.includes('8 ball pool') ||
        nameLower.includes('8-ball pool')
      ) {
        challengesRevenue += discounted;
      } else if (CANTEEN_CATEGORIES.has(category)) {
        canteenSales += discounted;
      }
    }
  }

  return {
    ps5Gaming,
    eightBallPool,
    challengesRevenue,
    canteenSales,
    totalRevenue: ps5Gaming + eightBallPool + challengesRevenue + canteenSales,
  };
}

export function computeBillAggregateMetricsFromBills(
  bills: Bill[],
  products: Product[],
): BillAggregateMetrics {
  const payment = computePaymentBreakdownFromBills(bills);
  const gaming = computeGamingRevenueFromBills(bills, products);
  const complimentaryBills = bills.filter((b) => paymentMethod(b) === 'complimentary');

  return {
    totalRevenue: payment.totalRevenue,
    transactionCount: payment.totalTransactions,
    allTransactionCount: bills.length,
    averageBillValue:
      payment.totalTransactions > 0 ? payment.totalRevenue / payment.totalTransactions : 0,
    totalDiscounts: bills.reduce((sum, b) => sum + (Number(b.discountValue) || 0), 0),
    cashSales: payment.cashTotal,
    upiSales: payment.upiTotal,
    creditSales: payment.creditTotal,
    razorpaySales: payment.razorpayTotal,
    splitCash: payment.splitCashTotal,
    splitUpi: payment.splitUpiTotal,
    complimentarySales: complimentaryBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0),
    complimentaryCount: complimentaryBills.length,
    highestRevenueDay: null,
    highestRevenue: 0,
    loyaltyPointsUsed: bills.reduce((sum, b) => sum + (Number(b.loyaltyPointsUsed) || 0), 0),
    loyaltyPointsEarned: bills.reduce((sum, b) => sum + (Number(b.loyaltyPointsEarned) || 0), 0),
    topCustomerId: null,
    topCustomerSpend: 0,
    returningCustomerCount: 0,
    totalUnitsSold: bills.reduce((sum, bill) => {
      return (
        sum +
        bill.items.reduce((itemSum, item) => {
          return item.type === 'product' ? itemSum + item.quantity : itemSum;
        }, 0)
      );
    }, 0),
    mostPopularProductId: null,
    gaming,
  };
}

export function computeSalesWidgetsFromBills(bills: Bill[], products: Product[]) {
  const payment = computePaymentBreakdownFromBills(bills);
  const gaming = computeGamingRevenueFromBills(bills, products);
  const billMetrics = computeBillAggregateMetricsFromBills(bills, products);
  return { billMetrics, payment, gaming };
}
