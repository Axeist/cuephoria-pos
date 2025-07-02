
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvestmentPartner, InvestmentTransaction } from '@/types/investment.types';

interface InvestmentTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: InvestmentTransaction;
  partners: InvestmentPartner[];
  onSave: (transaction: Omit<InvestmentTransaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const InvestmentTransactionDialog: React.FC<InvestmentTransactionDialogProps> = ({
  open,
  onOpenChange,
  transaction,
  partners,
  onSave
}) => {
  const [formData, setFormData] = useState({
    partner_id: '',
    transaction_type: 'investment' as 'investment' | 'dividend' | 'withdrawal' | 'return',
    amount: '',
    transaction_date: '',
    description: '',
    reference_number: '',
    status: 'completed' as 'completed' | 'pending' | 'cancelled',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        partner_id: transaction.partner_id,
        transaction_type: transaction.transaction_type,
        amount: transaction.amount.toString(),
        transaction_date: transaction.transaction_date,
        description: transaction.description || '',
        reference_number: transaction.reference_number || '',
        status: transaction.status,
        notes: transaction.notes || ''
      });
    } else {
      setFormData({
        partner_id: '',
        transaction_type: 'investment',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        reference_number: '',
        status: 'completed',
        notes: ''
      });
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partner_id || !formData.amount || !formData.transaction_date) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        partner_id: formData.partner_id,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        transaction_date: formData.transaction_date,
        description: formData.description || undefined,
        reference_number: formData.reference_number || undefined,
        status: formData.status,
        notes: formData.notes || undefined
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {transaction ? 'Edit Investment Transaction' : 'Add Investment Transaction'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="partner_id" className="text-gray-200">Partner *</Label>
            <Select
              value={formData.partner_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, partner_id: value }))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select a partner" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id} className="text-white">
                    {partner.name} {partner.company && `(${partner.company})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_type" className="text-gray-200">Type *</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value: 'investment' | 'dividend' | 'withdrawal' | 'return') => setFormData(prev => ({ ...prev, transaction_type: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="investment" className="text-white">Investment</SelectItem>
                  <SelectItem value="dividend" className="text-white">Dividend</SelectItem>
                  <SelectItem value="withdrawal" className="text-white">Withdrawal</SelectItem>
                  <SelectItem value="return" className="text-white">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-200">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_date" className="text-gray-200">Date *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-200">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'completed' | 'pending' | 'cancelled') => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number" className="text-gray-200">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-200">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-200">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Saving...' : transaction ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentTransactionDialog;
