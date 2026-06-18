import { format, isValid, parseISO } from 'date-fns';
import type { Expense, ExpenseCategory, ExpenseFrequency } from '@/types/expense.types';

export function normalizeExpenseCategory(category: string | null | undefined): ExpenseCategory {
  if (!category || typeof category !== 'string') return 'other';
  return category === 'restock' ? 'inventory' : (category as ExpenseCategory);
}

export function parseExpenseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = value.includes('T') ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

export function formatExpenseDate(value: string | null | undefined, pattern = 'MMM dd, yyyy'): string {
  const d = parseExpenseDate(value);
  if (!d) return '—';
  try {
    return format(d, pattern);
  } catch {
    return '—';
  }
}

export function mapExpenseRow(item: Record<string, unknown>): Expense {
  return {
    id: String(item.id ?? ''),
    name: String(item.name ?? 'Untitled expense'),
    amount: Number(item.amount) || 0,
    category: normalizeExpenseCategory(item.category as string),
    frequency: (item.frequency as ExpenseFrequency) || 'one-time',
    date: String(item.date ?? new Date().toISOString()),
    isRecurring: Boolean(item.is_recurring),
    notes: item.notes ? String(item.notes) : undefined,
  };
}
