import React from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from '@/components/ui/currency';
import ExpenseDialog from './ExpenseDialog';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const ExpenseList: React.FC = () => {
  const { expenses, deleteExpense } = useExpenses();

  const handleDeleteExpense = async (id: string) => {
    try { await deleteExpense(id); } catch (error) { console.error('Error deleting expense:', error); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Expenses</CardTitle>
        <ExpenseDialog>
          <Button variant="default" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Expense
          </Button>
        </ExpenseDialog>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No expenses found. Add your first expense by clicking the button above.</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const label = normalizeCategory(expense.category);
                  return (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell>
                        <Badge className={`${getCategoryColor(expense.category)}`}>
                          {label.charAt(0).toUpperCase() + label.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell><CurrencyDisplay amount={expense.amount} /></TableCell>
                      <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {expense.isRecurring ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{expense.frequency}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">one-time</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <ExpenseDialog expense={expense}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                          </ExpenseDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete this expense? This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
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
  );
};

export default ExpenseList;
