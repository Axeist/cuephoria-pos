
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvestmentPartner } from '@/types/investment.types';

interface InvestmentPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: InvestmentPartner;
  onSave: (partner: Omit<InvestmentPartner, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

const InvestmentPartnerDialog: React.FC<InvestmentPartnerDialogProps> = ({
  open,
  onOpenChange,
  partner,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    investment_amount: '',
    investment_date: '',
    equity_percentage: '',
    partnership_type: 'investor' as 'investor' | 'partner' | 'advisor' | 'other',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'exited',
    notes: '',
    contact_person: '',
    address: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        company: partner.company || '',
        investment_amount: partner.investment_amount.toString(),
        investment_date: partner.investment_date || '',
        equity_percentage: partner.equity_percentage?.toString() || '',
        partnership_type: partner.partnership_type,
        status: partner.status,
        notes: partner.notes || '',
        contact_person: partner.contact_person || '',
        address: partner.address || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        investment_amount: '',
        investment_date: new Date().toISOString().split('T')[0],
        equity_percentage: '',
        partnership_type: 'investor',
        status: 'active',
        notes: '',
        contact_person: '',
        address: ''
      });
    }
  }, [partner, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.investment_amount || !formData.investment_date) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        investment_amount: parseFloat(formData.investment_amount),
        investment_date: formData.investment_date,
        equity_percentage: formData.equity_percentage ? parseFloat(formData.equity_percentage) : undefined,
        partnership_type: formData.partnership_type,
        status: formData.status,
        notes: formData.notes || undefined,
        contact_person: formData.contact_person || undefined,
        address: formData.address || undefined
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving partner:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {partner ? 'Edit Investment Partner' : 'Add Investment Partner'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-200">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-200">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company" className="text-gray-200">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investment_amount" className="text-gray-200">Investment Amount *</Label>
              <Input
                id="investment_amount"
                type="number"
                step="0.01"
                value={formData.investment_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, investment_amount: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="investment_date" className="text-gray-200">Investment Date *</Label>
              <Input
                id="investment_date"
                type="date"
                value={formData.investment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, investment_date: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equity_percentage" className="text-gray-200">Equity %</Label>
              <Input
                id="equity_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.equity_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, equity_percentage: e.target.value }))}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="partnership_type" className="text-gray-200">Type</Label>
              <Select
                value={formData.partnership_type}
                onValueChange={(value: 'investor' | 'partner' | 'advisor' | 'other') => setFormData(prev => ({ ...prev, partnership_type: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="investor" className="text-white">Investor</SelectItem>
                  <SelectItem value="partner" className="text-white">Partner</SelectItem>
                  <SelectItem value="advisor" className="text-white">Advisor</SelectItem>
                  <SelectItem value="other" className="text-white">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-200">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive' | 'pending' | 'exited') => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="active" className="text-white">Active</SelectItem>
                  <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="exited" className="text-white">Exited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_person" className="text-gray-200">Contact Person</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-200">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
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
              rows={3}
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
              {isSubmitting ? 'Saving...' : partner ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentPartnerDialog;
