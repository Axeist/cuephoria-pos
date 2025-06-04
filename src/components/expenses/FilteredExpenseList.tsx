
import React from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { format, isWithinInterval } from 'date-fns';
import { Expense } from '@/types/expense.types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from '@/components/ui/currency';
import ExpenseDialog from './ExpenseDialog';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FilteredExpenseListProps {
  startDate: Date;
  endDate: Date;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'rent':
      return 'bg-blue-500';
    case 'utilities':
      return 'bg-green-500';
    case 'salary':
      return 'bg-purple-500';
    case 'restock':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
};

const FilteredExpenseList: React.FC<FilteredExpenseListProps> = ({
  startDate,
  endDate
}) => {
  const { expenses, deleteExpense } = useExpenses();
  
  // Filter expenses by date range
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return isWithinInterval(expenseDate, { start: startDate, end: endDate });
  });
  
  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(id);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };
  
  // Calculate totals by category
  const categoryTotals = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  return (
    <div className="space-y-6">
      {/* Summary cards by category */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Object.entries(categoryTotals).map(([category, amount]) => (
          <Card key={category} className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-200">
                <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`} />
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">
                <CurrencyDisplay amount={amount} />
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Card className="bg-gray-800 border-2 border-purple-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-400">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-400">
              <CurrencyDisplay amount={totalAmount} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed expense list */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-200">
            Expenses for Selected Period ({filteredExpenses.length} items)
          </CardTitle>
          <ExpenseDialog>
            <Button variant="default" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
              <PlusCircle className="h-4 w-4" />
              Add Expense
            </Button>
          </ExpenseDialog>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No expenses found for the selected period.
            </div>
          ) : (
            <div className="rounded-md border border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Category</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Recurring</TableHead>
                    <TableHead className="w-[100px] text-right text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-gray-200">{expense.name}</TableCell>
                      <TableCell>
                        <Badge className={`${getCategoryColor(expense.category)}`}>
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-200">
                        <CurrencyDisplay amount={expense.amount} />
                      </TableCell>
                      <TableCell className="text-gray-200">
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {expense.isRecurring ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                            {expense.frequency}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                            one-time
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <ExpenseDialog expense={expense}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-600">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </ExpenseDialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-800 border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-gray-200">Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-700 text-gray-200 hover:bg-gray-600">Cancel</AlertDialogCancel>
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
                  ))}
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
