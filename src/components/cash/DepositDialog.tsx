
import React, { useState } from 'react';
import { useCash } from '@/context/CashContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DepositDialog: React.FC<DepositDialogProps> = ({ open, onOpenChange }) => {
  const { addDeposit } = useCash();
  const [formData, setFormData] = useState({
    amount: '',
    bank_name: '',
    reference_number: '',
    notes: '',
    deposit_date: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addDeposit({
        amount: parseFloat(formData.amount),
        deposit_date: formData.deposit_date,
        bank_name: formData.bank_name || undefined,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
      });
      
      // Reset form
      setFormData({
        amount: '',
        bank_name: '',
        reference_number: '',
        notes: '',
        deposit_date: new Date().toISOString().split('T')[0]
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error recording deposit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Record Bank Deposit</DialogTitle>
          <DialogDescription className="text-gray-400">
            Record a cash deposit made to the bank account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="amount" className="text-white">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="deposit_date" className="text-white">Deposit Date</Label>
              <Input
                id="deposit_date"
                type="date"
                value={formData.deposit_date}
                onChange={(e) => setFormData(prev => ({ ...prev, deposit_date: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="bank_name" className="text-white">Bank Name</Label>
              <Input
                id="bank_name"
                placeholder="e.g., HDFC Bank"
                value={formData.bank_name}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="reference_number" className="text-white">Reference Number</Label>
              <Input
                id="reference_number"
                placeholder="Deposit slip number"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-white">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.amount}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Recording...' : 'Record Deposit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepositDialog;
