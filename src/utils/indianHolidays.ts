import { addDays, subDays } from 'date-fns';

export type IndianHolidaySeed = {
  date: string;
  name: string;
  is_paid: boolean;
};

type MonthDay = { month: number; day: number; name: string };

/** National fixed-date public holidays (India). */
const FIXED_HOLIDAYS: MonthDay[] = [
  { month: 1, day: 26, name: 'Republic Day' },
  { month: 8, day: 15, name: 'Independence Day' },
  { month: 10, day: 2, name: 'Gandhi Jayanti' },
  { month: 12, day: 25, name: 'Christmas' },
];

/**
 * Official / gazette dates for movable festivals (varies by lunar calendar).
 * Years not listed fall back to approximate calculations below.
 */
const MOVABLE_OVERRIDES: Record<number, MonthDay[]> = {
  2024: [
    { month: 3, day: 25, name: 'Holi' },
    { month: 3, day: 29, name: 'Good Friday' },
    { month: 4, day: 11, name: 'Eid ul-Fitr' },
    { month: 6, day: 17, name: 'Bakrid (Eid ul-Adha)' },
    { month: 8, day: 19, name: 'Raksha Bandhan' },
    { month: 8, day: 26, name: 'Janmashtami' },
    { month: 10, day: 12, name: 'Dussehra (Vijaya Dashami)' },
    { month: 11, day: 1, name: 'Diwali (Deepavali)' },
    { month: 11, day: 15, name: 'Guru Nanak Jayanti' },
  ],
  2025: [
    { month: 3, day: 14, name: 'Holi' },
    { month: 3, day: 31, name: 'Eid ul-Fitr' },
    { month: 4, day: 18, name: 'Good Friday' },
    { month: 6, day: 7, name: 'Bakrid (Eid ul-Adha)' },
    { month: 8, day: 9, name: 'Raksha Bandhan' },
    { month: 8, day: 16, name: 'Janmashtami' },
    { month: 10, day: 2, name: 'Dussehra (Vijaya Dashami)' },
    { month: 10, day: 21, name: 'Diwali (Deepavali)' },
    { month: 11, day: 5, name: 'Guru Nanak Jayanti' },
  ],
  2026: [
    { month: 3, day: 3, name: 'Holi' },
    { month: 3, day: 21, name: 'Eid ul-Fitr' },
    { month: 4, day: 3, name: 'Good Friday' },
    { month: 5, day: 28, name: 'Bakrid (Eid ul-Adha)' },
    { month: 8, day: 28, name: 'Raksha Bandhan' },
    { month: 9, day: 4, name: 'Janmashtami' },
    { month: 10, day: 20, name: 'Dussehra (Vijaya Dashami)' },
    { month: 11, day: 8, name: 'Diwali (Deepavali)' },
    { month: 11, day: 24, name: 'Guru Nanak Jayanti' },
  ],
  2027: [
    { month: 3, day: 22, name: 'Holi' },
    { month: 3, day: 10, name: 'Eid ul-Fitr' },
    { month: 3, day: 26, name: 'Good Friday' },
    { month: 5, day: 17, name: 'Bakrid (Eid ul-Adha)' },
    { month: 8, day: 17, name: 'Raksha Bandhan' },
    { month: 8, day: 25, name: 'Janmashtami' },
    { month: 10, day: 9, name: 'Dussehra (Vijaya Dashami)' },
    { month: 10, day: 28, name: 'Diwali (Deepavali)' },
    { month: 11, day: 14, name: 'Guru Nanak Jayanti' },
  ],
  2028: [
    { month: 3, day: 11, name: 'Holi' },
    { month: 2, day: 27, name: 'Eid ul-Fitr' },
    { month: 4, day: 14, name: 'Good Friday' },
    { month: 5, day: 6, name: 'Bakrid (Eid ul-Adha)' },
    { month: 8, day: 5, name: 'Raksha Bandhan' },
    { month: 8, day: 14, name: 'Janmashtami' },
    { month: 9, day: 27, name: 'Dussehra (Vijaya Dashami)' },
    { month: 10, day: 16, name: 'Diwali (Deepavali)' },
    { month: 11, day: 3, name: 'Guru Nanak Jayanti' },
  ],
  2029: [
    { month: 2, day: 28, name: 'Holi' },
    { month: 2, day: 16, name: 'Eid ul-Fitr' },
    { month: 3, day: 30, name: 'Good Friday' },
    { month: 4, day: 25, name: 'Bakrid (Eid ul-Adha)' },
    { month: 7, day: 25, name: 'Raksha Bandhan' },
    { month: 8, day: 3, name: 'Janmashtami' },
    { month: 9, day: 16, name: 'Dussehra (Vijaya Dashami)' },
    { month: 11, day: 5, name: 'Diwali (Deepavali)' },
    { month: 11, day: 22, name: 'Guru Nanak Jayanti' },
  ],
  2030: [
    { month: 3, day: 19, name: 'Holi' },
    { month: 2, day: 5, name: 'Eid ul-Fitr' },
    { month: 4, day: 19, name: 'Good Friday' },
    { month: 4, day: 14, name: 'Bakrid (Eid ul-Adha)' },
    { month: 8, day: 13, name: 'Raksha Bandhan' },
    { month: 8, day: 23, name: 'Janmashtami' },
    { month: 10, day: 5, name: 'Dussehra (Vijaya Dashami)' },
    { month: 10, day: 25, name: 'Diwali (Deepavali)' },
    { month: 11, day: 11, name: 'Guru Nanak Jayanti' },
  ],
};

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function calculateDussehra(year: number): Date {
  const baseDate = new Date(year, 9, 5);
  const adjustment = (year - 2020) % 11;
  return addDays(baseDate, adjustment - 5);
}

function calculateMovableApprox(year: number): MonthDay[] {
  const easter = calculateEaster(year);
  const goodFriday = subDays(easter, 2);
  const dussehra = calculateDussehra(year);
  const diwali = addDays(dussehra, 20);

  const holiBase = new Date(year, 2, 8);
  const holiAdj = (year - 2020) % 11;
  const holi = addDays(holiBase, holiAdj - 5);

  const eidFitrBase = new Date(year, 4, 13);
  const eidFitr = addDays(eidFitrBase, (year - 2020) % 11 - 5);
  const eidAdha = addDays(eidFitr, 70);

  const rakhiBase = new Date(year, 7, 11);
  const rakhi = addDays(rakhiBase, (year - 2020) % 11 - 5);

  const janmashtamiBase = new Date(year, 7, 26);
  const janmashtami = addDays(janmashtamiBase, (year - 2020) % 11 - 5);

  const asDate = (d: Date, name: string): MonthDay => ({
    month: d.getMonth() + 1,
    day: d.getDate(),
    name,
  });

  return [
    asDate(holi, 'Holi'),
    asDate(goodFriday, 'Good Friday'),
    asDate(eidFitr, 'Eid ul-Fitr'),
    asDate(eidAdha, 'Bakrid (Eid ul-Adha)'),
    asDate(rakhi, 'Raksha Bandhan'),
    asDate(janmashtami, 'Janmashtami'),
    asDate(dussehra, 'Dussehra (Vijaya Dashami)'),
    asDate(diwali, 'Diwali (Deepavali)'),
  ];
}

/** All major Indian public holidays for a calendar year (fixed + movable). */
export function getIndianPublicHolidays(year: number): IndianHolidaySeed[] {
  const byDate = new Map<string, IndianHolidaySeed>();

  for (const { month, day, name } of FIXED_HOLIDAYS) {
    const date = toIsoDate(year, month, day);
    byDate.set(date, { date, name, is_paid: true });
  }

  const movable = MOVABLE_OVERRIDES[year] ?? calculateMovableApprox(year);
  for (const { month, day, name } of movable) {
    const date = toIsoDate(year, month, day);
    if (!byDate.has(date)) {
      byDate.set(date, { date, name, is_paid: true });
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function usesOfficialMovableDates(year: number): boolean {
  return year in MOVABLE_OVERRIDES;
}
