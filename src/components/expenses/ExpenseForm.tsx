import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExpenseCategory, ExpenseFrequency, ExpenseFormData } from '@/types/expense.types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

const expenseSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  amount: z.coerce.number().positive({ message: 'Amount must be positive' }),
  category: z.enum([
    'inventory','salary','utilities','rent','marketing','maintenance',
    'transport','subscriptions','events','bank_charges','withdrawal','other','restock'
  ] as [ExpenseCategory, ...ExpenseCategory[]]),
  frequency: z.enum(['one-time','monthly','quarterly','yearly'] as [ExpenseFrequency, ...ExpenseFrequency[]]),
  date: z.date({ required_error: 'Please select a date', invalid_type_error: "That's not a date!" }),
  isRecurring: z.boolean(),
  notes: z.string().optional(),
});

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => void;
  initialData?: Partial<ExpenseFormData>;
  onCancel?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, initialData, onCancel }) => {
  const today = new Date();
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: initialData?.name || '',
      amount: initialData?.amount || 0,
      category: (initialData?.category as ExpenseCategory) || 'other',
      frequency: (initialData?.frequency as ExpenseFrequency) || 'one-time',
      date: initialData?.date || today,
      isRecurring: initialData?.isRecurring || false,
      notes: initialData?.notes || '',
    },
  });

  const isRecurring = form.watch('isRecurring');

  const handleFormSubmit = (data: ExpenseFormData) => onSubmit(data);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Expense Name</FormLabel>
            <FormControl><Input placeholder="Rent, Electricity, Snacks Restock, etc." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="inventory">Stock and supplies</SelectItem>
                <SelectItem value="salary">Staff payroll and bonuses</SelectItem>
                <SelectItem value="utilities">Utilities and bills</SelectItem>
                <SelectItem value="rent">Rent and deposits</SelectItem>
                <SelectItem value="marketing">Marketing and printing</SelectItem>
                <SelectItem value="maintenance">Repairs and maintenance</SelectItem>
                <SelectItem value="transport">Transport and delivery</SelectItem>
                <SelectItem value="subscriptions">Software and subscriptions</SelectItem>
                <SelectItem value="events">Events and prizes</SelectItem>
                <SelectItem value="bank_charges">Finance and bank fees</SelectItem>
                <SelectItem value="withdrawal">Partner withdrawals</SelectItem>
                <SelectItem value="other">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="isRecurring" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>Recurring Expense</FormLabel>
              <FormDescription>Is this a recurring expense?</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        {isRecurring && (
          <FormField control={form.control} name="frequency" render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant={"outline"} className="pl-3 text-left font-normal">
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea placeholder="Add any additional notes about this expense" className="resize-none" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end space-x-2">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          <Button type="submit">{initialData?.name ? 'Update Expense' : 'Add Expense'}</Button>
        </div>
      </form>
    </Form>
  );
};

export default ExpenseForm;
