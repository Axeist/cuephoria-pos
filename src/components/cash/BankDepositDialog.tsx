
import React, { useState } from 'react';
import { Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BankDepositFormData {
  amount: number;
  transactionNumber: string;
  personName: string;
  notes: string;
  remarks: string;
}

interface BankDepositDialogProps {
  currentVaultAmount: number;
  onSuccess: () => void;
}

const BankDepositDialog: React.FC<BankDepositDialogProps> = ({ 
  currentVaultAmount, 
  onSuccess 
}) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<BankDepositFormData>({
    defaultValues: {
      amount: currentVaultAmount,
      transactionNumber: '',
      personName: '',
      notes: '',
      remarks: '',
    },
  });

  // Update amount when vault amount changes
  React.useEffect(() => {
    form.setValue('amount', currentVaultAmount);
  }, [currentVaultAmount, form]);

  const onSubmit = async (data: BankDepositFormData) => {
    if (data.amount > currentVaultAmount) {
      toast({
        title: 'Error',
        description: 'Deposit amount cannot exceed vault balance',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Insert bank deposit record
      const { error: depositError } = await supabase
        .from('cash_bank_deposits')
        .insert({
          amount: data.amount,
          transaction_number: data.transactionNumber,
          person_name: data.personName,
          notes: data.notes || null,
          remarks: data.remarks || null,
          created_by: 'admin', // You can replace this with actual user info
        });

      if (depositError) throw depositError;

      // Insert vault transaction record (this will trigger the vault update)
      const { error: transactionError } = await supabase
        .from('cash_vault_transactions')
        .insert({
          amount: data.amount,
          transaction_type: 'deposit',
          transaction_number: data.transactionNumber,
          person_name: data.personName,
          notes: data.notes || null,
          remarks: data.remarks || null,
          created_by: 'admin',
        });

      if (transactionError) throw transactionError;

      toast({
        title: 'Success',
        description: `₹${data.amount} has been deposited to bank and vault cleared`,
      });

      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error making bank deposit:', error);
      toast({
        title: 'Error',
        description: 'Failed to make bank deposit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={currentVaultAmount <= 0}
        >
          <Banknote className="h-4 w-4 mr-2" />
          Bank Deposit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Make Bank Deposit</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              rules={{ 
                required: 'Amount is required',
                min: { value: 0.01, message: 'Amount must be greater than 0' },
                max: { value: currentVaultAmount, message: 'Amount cannot exceed vault balance' }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">
                    Amount (₹) - Max: ₹{currentVaultAmount.toFixed(2)}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter amount"
                      className="bg-gray-700 border-gray-600 text-white"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transactionNumber"
              rules={{ required: 'Transaction number is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Transaction Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter transaction number"
                      className="bg-gray-700 border-gray-600 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personName"
              rules={{ required: 'Person name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Person Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter person name"
                      className="bg-gray-700 border-gray-600 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter notes"
                      className="bg-gray-700 border-gray-600 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Remarks (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter remarks"
                      className="bg-gray-700 border-gray-600 text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? 'Processing...' : 'Make Deposit'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BankDepositDialog;
