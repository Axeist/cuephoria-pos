import React from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { format, isWithinInterval } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from '@/components/ui/currency';
import ExpenseDialog from './ExpenseDialog';
import { PlusCircle, Pencil, Trash2, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import clsx from 'clsx';

interface FilteredExpenseListProps {
  startDate: Date;
  endDate: Date;
  selectedCategory?: string | null;
  onCategorySelect?: (category: string | null) => void;
}

const normalizeCategory = (c: string) => (c === 'restock' ? 'inventory' : c);

const getCategoryColor = (category: string) => {
  const c = normalizeCategory(category);
  switch (c) {
    case 'rent': return 'bg-blue-500';
    case 'utilities': return 'bg-green-600';
    case 'salary': return 'bg-purple-500';
    case 'inventory': return 'bg-orange-500';
    case 'marketing': return 'bg-pink-500';
    case 'maintenance': return 'bg-teal-600';
    case 'transport': return 'bg-amber-600';
    case 'subscriptions': return 'bg-indigo-500';
    case 'events': return 'bg-cyan-600';
    case 'bank_charges': return 'bg-slate-600';
    case 'withdrawal': return 'bg-red-600';
    default: return 'bg-gray-500';
  }
};

const FilteredExpenseList: React.FC<FilteredExpenseListProps> = ({
  startDate,
  endDate,
  selectedCategory = null,
  onCategorySelect
}) => {
  const { expenses, deleteExpense } = useExpenses();

  // Filter by date range
  const inRange = (d: Date) => isWithinInterval(d, { start: startDate, end: endDate });
  const byDate = expenses.filter(expense => inRange(new Date(expense.date)));

  // Totals by normalized category
  const categoryTotals = byDate.reduce((acc, expense) => {
    const key = normalizeCategory(expense.category);
    acc[key] = (acc[key] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Visible rows filtered by selectedCategory (if any)
  const visibleExpenses = byDate.filter(e =>
    !selectedCategory || normalizeCategory(e.category) === selectedCategory
  );

  const totalAmount = visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleDeleteExpense = async (id: string) => {
    try { await deleteExpense(id); } catch (error) { console.error('Error deleting expense:', error); }
  };

  return (
    <div className="space-y-6">
      {/* Category widgets (click to filter) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Object.entries(categoryTotals).map(([category, amount]) => {
          const isActive = selectedCategory === category;
          return (
            <Card
              key={category}
              role="button"
              onClick={() => onCategorySelect?.(isActive ? null : category)}
              className={clsx(
                "glass-card glass-card-interactive border-white/10 transition-colors cursor-pointer",
                isActive && "border-2 border-emerald-500"
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-white/85">
                  <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-white">
                  <CurrencyDisplay amount={amount} />
                </div>
                {isActive && (
                  <p className="text-xs text-emerald-400 mt-1">Filter active</p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Total card doubles as clear filter */}
        <Card
          role="button"
          onClick={() => onCategorySelect?.(null)}
          className={clsx(
            "glass-card glass-card-interactive border-2 border-purple-500/50 transition-colors cursor-pointer",
            selectedCategory === null && "ring-2 ring-purple-400/80"
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-400">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-400">
              <CurrencyDisplay amount={byDate.reduce((s, e) => s + e.amount, 0)} />
            </div>
            <p className="text-xs text-purple-300 mt-1">Clear filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Active filter pill */}
      {selectedCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/75">
            Showing: {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onCategorySelect?.(null)} className="text-red-300 hover:text-red-200">
            <XCircle className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* Detailed expense list */}
      <Card className="glass-card glass-card-interactive border-white/10 shadow-xl backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-lg font-semibold text-white font-heading tracking-tight">
            Expenses for Selected Period ({visibleExpenses.length} items)
          </CardTitle>
          <ExpenseDialog>
            <Button variant="default" className="flex items-center gap-2 border-0 text-white shadow-lg shadow-purple-500/20">
              <PlusCircle className="h-4 w-4" />
              Add Expense
            </Button>
          </ExpenseDialog>
        </CardHeader>
        <CardContent>
          {visibleExpenses.length === 0 ? (
            <div className="text-center py-8 text-white/55">
              No expenses found for the selected filters.
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/70 font-medium">Name</TableHead>
                    <TableHead className="text-white/70 font-medium">Category</TableHead>
                    <TableHead className="text-white/70 font-medium">Amount</TableHead>
                    <TableHead className="text-white/70 font-medium">Date</TableHead>
                    <TableHead className="text-white/70 font-medium">Recurring</TableHead>
                    <TableHead className="w-[100px] text-right text-white/70 font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleExpenses.map((expense) => {
                    const label = normalizeCategory(expense.category);
                    return (
                      <TableRow key={expense.id} className="border-white/10 hover:bg-white/[0.04]">
                        <TableCell className="text-white/90">{expense.name}</TableCell>
                        <TableCell>
                          <Badge className={`${getCategoryColor(expense.category)}`}>
                            {label.charAt(0).toUpperCase() + label.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/90">
                          <CurrencyDisplay amount={expense.amount} />
                        </TableCell>
                        <TableCell className="text-white/90">
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {expense.isRecurring ? (
                            <Badge variant="outline" className="border-sky-400/35 bg-sky-500/15 text-sky-200">
                              {expense.frequency}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-white/15 bg-white/[0.06] text-white/75">
                              one-time
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <ExpenseDialog expense={expense}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </ExpenseDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass-card border-white/10 text-white">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Delete Expense</AlertDialogTitle>
                                  <AlertDialogDescription className="text-white/65">
                                    Are you sure you want to delete this expense? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-white/15 bg-white/[0.06] text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FilteredExpenseList;
