import { format } from 'date-fns';
import type { BillAggregateMetrics } from '@/hooks/useLocationAnalytics';
import type { Customer, Session, Product } from '@/types/pos.types';
import type { Expense } from '@/types/expense.types';

type BuildArgs = {
  billMetrics: BillAggregateMetrics;
  filteredSessions: Session[];
  filteredCustomers: Customer[];
  posSessions: Session[];
  stations: { id: string; type?: string; name?: string }[];
  products: Product[];
  customers: Customer[];
  expenses: Expense[];
  totalExpenses: number;
};

export function buildReportSummaryMetrics({
  billMetrics: bm,
  filteredSessions,
  filteredCustomers,
  posSessions,
  stations,
  products,
  customers,
  expenses,
  totalExpenses,
}: BuildArgs) {
  const totalRevenue = bm.totalRevenue;
  const complimentarySales = bm.complimentarySales;
  const complimentaryCount = bm.complimentaryCount;
  const totalTransactionVolume = totalRevenue + complimentarySales;
  const complimentaryPercentage =
    totalTransactionVolume > 0 ? (complimentarySales / totalTransactionVolume) * 100 : 0;
  const avgComplimentaryValue = complimentaryCount > 0 ? complimentarySales / complimentaryCount : 0;
  const grossProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const cashPercentage = totalRevenue > 0 ? (bm.cashSales / totalRevenue) * 100 : 0;
  const upiPercentage = totalRevenue > 0 ? (bm.upiSales / totalRevenue) * 100 : 0;

  const activeSessions = posSessions.filter((s) => s.endTime === null).length;
  const completedSessions = filteredSessions.filter((s) => s.endTime !== null).length;

  let totalSessionDuration = 0;
  let sessionsWithDuration = 0;
  filteredSessions.forEach((session) => {
    if (session.endTime) {
      const durationMinutes = Math.max(
        1,
        Math.round(
          (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60)
        )
      );
      totalSessionDuration += durationMinutes;
      sessionsWithDuration++;
    } else if (session.duration) {
      totalSessionDuration += session.duration;
      sessionsWithDuration++;
    }
  });
  const avgSessionDuration =
    sessionsWithDuration > 0 ? Math.round(totalSessionDuration / sessionsWithDuration) : 0;

  const sessionsByHour: Record<number, number> = {};
  let peakHour = 0;
  let peakHourCount = 0;
  filteredSessions.forEach((session) => {
    const hour = new Date(session.startTime).getHours();
    sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
    if (sessionsByHour[hour] > peakHourCount) {
      peakHourCount = sessionsByHour[hour];
      peakHour = hour;
    }
  });
  const formattedPeakHour =
    peakHour < 12 ? `${peakHour}:00 AM` : `${peakHour === 12 ? 12 : peakHour - 12}:00 PM`;

  const restockExpenses = expenses
    .filter((e) => e.category.toLowerCase() === 'restock')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const daysSinceRestock =
    restockExpenses.length > 0
      ? Math.floor(
          (Date.now() - new Date(restockExpenses[0].date).getTime()) / (1000 * 3600 * 24)
        )
      : null;

  const mostPopularProduct =
    products.find((p) => p.id === bm.mostPopularProductId)?.name || 'None';

  const ps5Sessions = filteredSessions.filter((s) => {
    const station = stations.find((st) => st.id === s.stationId);
    return (
      station?.type?.toLowerCase()?.includes('ps5') ||
      station?.name?.toLowerCase()?.includes('ps5') ||
      station?.name?.toLowerCase()?.includes('playstation')
    );
  });
  const ps5UsageRate =
    ps5Sessions.length > 0
      ? Math.round((ps5Sessions.filter((s) => s.endTime).length / ps5Sessions.length) * 100)
      : 0;

  const totalCustomers = filteredCustomers.length;
  const memberCount = filteredCustomers.filter((c) => c.isMember).length;
  const nonMemberCount = filteredCustomers.filter((c) => !c.isMember).length;
  const membershipRate = totalCustomers > 0 ? (memberCount / totalCustomers) * 100 : 0;
  const avgSpendPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const topCustomer =
    customers.find((c) => c.id === bm.topCustomerId)?.name || 'None';
  const retentionRate =
    totalCustomers > 0 ? (bm.returningCustomerCount / totalCustomers) * 100 : 0;
  const loyaltyUsageRate =
    bm.loyaltyPointsEarned > 0 ? (bm.loyaltyPointsUsed / bm.loyaltyPointsEarned) * 100 : 0;
  const loyaltyPointsPerRupee = totalRevenue > 0 ? bm.loyaltyPointsEarned / totalRevenue : 0;

  const gaming = bm.gaming;
  const ps5Sales = gaming.ps5Gaming;
  const poolSales = gaming.eightBallPool;
  const metashotSales = gaming.challengesRevenue;

  return {
    financial: {
      totalRevenue,
      averageBillValue: bm.averageBillValue,
      totalDiscounts: bm.totalDiscounts,
      cashSales: bm.cashSales,
      upiSales: bm.upiSales,
      complimentarySales,
      complimentaryCount,
      complimentaryPercentage,
      avgComplimentaryValue,
      cashPercentage,
      upiPercentage,
      grossProfit,
      profitMargin,
      highestRevenueDay: bm.highestRevenueDay
        ? format(new Date(bm.highestRevenueDay), 'dd MMM yyyy')
        : 'None',
      highestRevenue: bm.highestRevenue,
    },
    operational: {
      totalTransactions: bm.allTransactionCount,
      activeSessions,
      completedSessions,
      avgSessionDuration,
      peakHour: formattedPeakHour,
      peakHourCount,
      mostPopularProduct,
      daysSinceRestock,
      totalUnitsSold: bm.totalUnitsSold,
      ps5UsageRate,
    },
    customer: {
      totalCustomers,
      memberCount,
      nonMemberCount,
      membershipRate,
      avgSpendPerCustomer,
      topCustomer,
      topCustomerSpend: bm.topCustomerSpend,
      returningCustomers: bm.returningCustomerCount,
      retentionRate,
      loyaltyPointsUsed: bm.loyaltyPointsUsed,
      loyaltyPointsEarned: bm.loyaltyPointsEarned,
      loyaltyUsageRate,
      loyaltyPointsPerRupee,
    },
    gaming: {
      ps5Sales,
      poolSales,
      metashotSales,
      totalGamingSales: ps5Sales + poolSales + metashotSales,
    },
  };
}
