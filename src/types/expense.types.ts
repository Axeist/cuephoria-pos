export type ExpenseCategory =
  | 'inventory'        // stock & supplies
  | 'salary'           // payroll, bonuses, advances
  | 'utilities'        // EB, water/cans, mobile/data, generator
  | 'rent'             // rent, deposits, agreement changes
  | 'marketing'        // ads, printing, banners, posters
  | 'maintenance'      // repairs, cleaning, lighting, furniture
  | 'transport'        // tempo/auto/logistics
  | 'subscriptions'    // SaaS, app tools, Qubo, SheetWA, EA
  | 'events'           // trophies, prizes, fests
  | 'bank_charges'     // EMI/fees (finance)
  | 'withdrawal'       // partner/owner drawings
  | 'other'
  | 'restock';         // legacy alias kept for older rows

export type ExpenseFrequency = 'one-time' | 'monthly' | 'quarterly' | 'yearly';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: ExpenseFrequency;
  date: string; // ISO
  isRecurring: boolean;
  notes?: string;
}

export interface BusinessSummary {
  grossIncome: number;
  totalExpenses: number;   // operating only (excl. withdrawals)
  netProfit: number;       // revenue - operating expenses
  profitMargin: number;
  withdrawals: number;     // sum(category==='withdrawal')
  moneyInBank: number;     // netProfit - withdrawals
}

// Form type (Date for UI)
export interface ExpenseFormData {
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: ExpenseFrequency;
  date: Date;
  isRecurring: boolean;
  notes?: string;
}
