
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Save, X, Gift, Users, Percent, DollarSign, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Offer {
  id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item';
  discount_value: number;
  validity_days: number;
  target_audience: 'all' | 'members' | 'non_members' | 'new_customers' | 'vip';
  min_spend: number;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
}

interface OffersManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOffersUpdate: () => void;
}

const OffersManagementDialog: React.FC<OffersManagementDialogProps> = ({
  isOpen,
  onClose,
  onOffersUpdate
}) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'bogo' | 'free_item',
    discount_value: 0,
    validity_days: 7,
    target_audience: 'all' as 'all' | 'members' | 'non_members' | 'new_customers' | 'vip',
    min_spend: 0,
    max_uses: undefined as number | undefined,
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      fetchOffers();
    }
  }, [isOpen]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Type cast the data to ensure proper types
      const typedOffers: Offer[] = (data || []).map(offer => ({
        ...offer,
        discount_type: offer.discount_type as 'percentage' | 'fixed' | 'bogo' | 'free_item',
        target_audience: offer.target_audience as 'all' | 'members' | 'non_members' | 'new_customers' | 'vip'
      }));
      
      setOffers(typedOffers);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch offers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      validity_days: 7,
      target_audience: 'all',
      min_spend: 0,
      max_uses: undefined,
      is_active: true
    });
    setEditingOffer(null);
    setIsCreating(false);
  };

  const handleEdit = (offer: Offer) => {
    setFormData({
      title: offer.title,
      description: offer.description,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      validity_days: offer.validity_days,
      target_audience: offer.target_audience,
      min_spend: offer.min_spend,
      max_uses: offer.max_uses,
      is_active: offer.is_active
    });
    setEditingOffer(offer);
    setIsCreating(false);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (!formData.title || !formData.description) {
        toast({
          title: "Error",
          description: "Title and description are required",
          variant: "destructive"
        });
        return;
      }

      const offerData = {
        title: formData.title,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        validity_days: formData.validity_days,
        target_audience: formData.target_audience,
        min_spend: formData.min_spend,
        max_uses: formData.max_uses,
        is_active: formData.is_active
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', editingOffer.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Offer updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('offers')
          .insert([{ ...offerData, current_uses: 0 }]);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Offer created successfully"
        });
      }

      resetForm();
      fetchOffers();
      onOffersUpdate();
    } catch (error) {
      console.error('Error saving offer:', error);
      toast({
        title: "Error",
        description: "Failed to save offer",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (offer: Offer) => {
    if (!confirm(`Are you sure you want to delete "${offer.title}"?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offer.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Offer deleted successfully"
      });
      
      fetchOffers();
      onOffersUpdate();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "Failed to delete offer",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id);
      
      if (error) throw error;
      
      fetchOffers();
      onOffersUpdate();
    } catch (error) {
      console.error('Error toggling offer status:', error);
      toast({
        title: "Error",
        description: "Failed to update offer status",
        variant: "destructive"
      });
    }
  };

  const getDiscountIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="h-4 w-4" />;
      case 'fixed': return <DollarSign className="h-4 w-4" />;
      case 'bogo': return <Package className="h-4 w-4" />;
      case 'free_item': return <Gift className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'all': return 'bg-blue-500';
      case 'members': return 'bg-purple-500';
      case 'non_members': return 'bg-gray-500';
      case 'new_customers': return 'bg-green-500';
      case 'vip': return 'bg-gold-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-400" />
            Offers Management
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Manage your marketing offers and promotions
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Offers List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Active Offers ({offers.filter(o => o.is_active).length})</h3>
              <Button
                onClick={handleCreate}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Offer
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {offers.map((offer) => (
                <Card 
                  key={offer.id}
                  className={`border transition-all duration-200 hover:shadow-lg ${
                    offer.is_active 
                      ? 'border-green-500/30 bg-gray-800/50' 
                      : 'border-gray-600 bg-gray-800/30 opacity-60'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm text-white flex items-center gap-2">
                          {getDiscountIcon(offer.discount_type)}
                          {offer.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            className={`text-xs ${getAudienceColor(offer.target_audience)} text-white`}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            {offer.target_audience.replace('_', ' ')}
                          </Badge>
                          {offer.validity_days > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {offer.validity_days} days
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() => handleToggleActive(offer)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(offer)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(offer)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                      {offer.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {offer.discount_type === 'percentage' && `${offer.discount_value}% off`}
                        {offer.discount_type === 'fixed' && `₹${offer.discount_value} off`}
                        {offer.discount_type === 'bogo' && 'Buy One Get One'}
                        {offer.discount_type === 'free_item' && 'Free Item'}
                      </span>
                      {offer.max_uses && (
                        <span>{offer.current_uses}/{offer.max_uses} used</span>
                      )}
                    </div>
                    {offer.min_spend > 0 && (
                      <div className="text-xs text-orange-400 mt-1">
                        Min spend: ₹{offer.min_spend}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Edit/Create Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingOffer ? 'Edit Offer' : isCreating ? 'Create New Offer' : 'Select an offer to edit'}
              </h3>
              {(editingOffer || isCreating) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {(editingOffer || isCreating) && (
              <Card className="bg-gray-800/50 border-gray-600">
                <CardContent className="p-6 space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="text-white">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Enter offer title"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description" className="text-white">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white resize-none"
                        placeholder="Enter offer description"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="discount_type" className="text-white">Discount Type</Label>
                        <Select
                          value={formData.discount_type}
                          onValueChange={(value: 'percentage' | 'fixed' | 'bogo' | 'free_item') => setFormData(prev => ({ ...prev, discount_type: value }))}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                            <SelectItem value="bogo">Buy One Get One</SelectItem>
                            <SelectItem value="free_item">Free Item</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="discount_value" className="text-white">Discount Value</Label>
                        <Input
                          id="discount_value"
                          type="number"
                          value={formData.discount_value}
                          onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="0"
                          disabled={formData.discount_type === 'bogo' || formData.discount_type === 'free_item'}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="target_audience" className="text-white">Target Audience</Label>
                        <Select
                          value={formData.target_audience}
                          onValueChange={(value: 'all' | 'members' | 'non_members' | 'new_customers' | 'vip') => setFormData(prev => ({ ...prev, target_audience: value }))}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Customers</SelectItem>
                            <SelectItem value="members">Members Only</SelectItem>
                            <SelectItem value="non_members">Non-Members</SelectItem>
                            <SelectItem value="new_customers">New Customers</SelectItem>
                            <SelectItem value="vip">VIP Customers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="validity_days" className="text-white">Validity (Days)</Label>
                        <Input
                          id="validity_days"
                          type="number"
                          value={formData.validity_days}
                          onChange={(e) => setFormData(prev => ({ ...prev, validity_days: Number(e.target.value) }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="7"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="min_spend" className="text-white">Minimum Spend (₹)</Label>
                        <Input
                          id="min_spend"
                          type="number"
                          value={formData.min_spend}
                          onChange={(e) => setFormData(prev => ({ ...prev, min_spend: Number(e.target.value) }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="max_uses" className="text-white">Max Uses (Optional)</Label>
                        <Input
                          id="max_uses"
                          type="number"
                          value={formData.max_uses || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value ? Number(e.target.value) : undefined }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Unlimited"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active" className="text-white">Active</Label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingOffer ? 'Update Offer' : 'Create Offer'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OffersManagementDialog;
