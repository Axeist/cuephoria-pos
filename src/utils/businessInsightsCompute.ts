import {
  format,
  getDate,
  getDay,
  getMonth,
  getWeek,
  isWeekend,
  startOfDay,
  subDays,
} from 'date-fns';
import type { DailyRevenuePoint } from '@/hooks/useBusinessAnalytics';

export type ForecastDailyRow = {
  date: Date;
  revenue: number;
  productSales: number;
  customerCount: number;
  sessionCount: number;
  dayOfWeek: number;
  month: number;
  weekOfYear: number;
  dayOfMonth: number;
  isWeekend: boolean;
  isMonthStart: boolean;
  isMonthEnd: boolean;
};

export function buildForecastDailyRows(series: DailyRevenuePoint[]): ForecastDailyRow[] {
  const byDay = new Map<string, DailyRevenuePoint>();
  for (const point of series) {
    byDay.set(point.day, point);
  }

  const last365Days = Array.from({ length: 365 }, (_, i) =>
    startOfDay(subDays(new Date(), 364 - i))
  );

  return last365Days.map((date) => {
    const key = format(date, 'yyyy-MM-dd');
    const point = byDay.get(key);
    const revenue = point?.revenue ?? 0;
    const customerCount = point?.customerCount ?? 0;
    const txnCount = point?.txnCount ?? 0;

    return {
      date,
      revenue,
      productSales: Math.max(0, Math.round(txnCount * 0.6)),
      customerCount,
      sessionCount: Math.max(0, txnCount - Math.round(txnCount * 0.6)),
      dayOfWeek: getDay(date),
      month: getMonth(date),
      weekOfYear: getWeek(date),
      dayOfMonth: getDate(date),
      isWeekend: isWeekend(date),
      isMonthStart: getDate(date) <= 3,
      isMonthEnd: getDate(date) >= 28,
    };
  });
}

export function growthPercent(today: number, yesterday: number): number {
  if (yesterday > 0) return ((today - yesterday) / yesterday) * 100;
  return today > 0 ? 100 : 0;
}
