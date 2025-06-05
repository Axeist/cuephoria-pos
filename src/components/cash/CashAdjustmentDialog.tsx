
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCash } from '@/context/CashContext';
import { CurrencyDisplay } from '@/components/ui/currency';

interface CashAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CashAdjustmentDialog: React.FC<CashAdjustmentDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { addTransaction, todayCashOnHand } = useCash();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const adjustmentAmount = parseFloat(amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) {
      return;
    }

    const finalAmount = adjustmentType === 'decrease' ? -adjustmentAmount : adjustmentAmount;

    await addTransaction({
      amount: Math.abs(adjustmentAmount),
      transaction_type: adjustmentType === 'increase' ? 'adjustment' : 'withdrawal',
      description: description || `Manual cash ${adjustmentType}`,
    });

    setAmount('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Manual Cash Adjustment</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-400">Current Cash on Hand:</p>
          <p className="text-xl font-bold text-white">
            <CurrencyDisplay amount={todayCashOnHand} />
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustmentType" className="text-white">Adjustment Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('increase')}
                className="flex-1"
              >
                Increase (+)
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('decrease')}
                className="flex-1"
              >
                Decrease (-)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for adjustment..."
              className="bg-gray-700 border-gray-600 text-white"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Apply Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CashAdjustmentDialog;
