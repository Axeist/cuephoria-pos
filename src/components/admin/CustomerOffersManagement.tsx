import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Save, X, Gift, Users, Eye, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomerOffer {
  id: string;
  title: string;
  description: string;
  offer_code: string;
  offer_type: string;
  discount_value: number;
  free_hours: number;
  loyalty_points_multiplier: number;
  target_customer_type: string;
  min_booking_amount: number;
  min_hours: number;
  max_redemptions_per_customer: number;
  total_redemption_limit: number | null;
  current_redemption_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  auto_assign_to_eligible: boolean;
  views_count: number;
  redemptions_count: number;
  created_at: string;
}

interface CustomerOffersManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerOffersManagement({ isOpen, onClose }: CustomerOffersManagementProps) {
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingOffer, setEditingOffer] = useState<CustomerOffer | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    offer_code: '',
    offer_type: 'percentage_discount',
    discount_value: 0,
    free_hours: 0,
    loyalty_points_multiplier: 1,
    target_customer_type: 'all',
    min_booking_amount: 0,
    min_hours: 1,
    max_redemptions_per_customer: 1,
    total_redemption_limit: null as number | null,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
    auto_assign_to_eligible: true
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
        .from('customer_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      offer_code: '',
      offer_type: 'percentage_discount',
      discount_value: 0,
      free_hours: 0,
      loyalty_points_multiplier: 1,
      target_customer_type: 'all',
      min_booking_amount: 0,
      min_hours: 1,
      max_redemptions_per_customer: 1,
      total_redemption_limit: null,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
      auto_assign_to_eligible: true
    });
    setEditingOffer(null);
    setIsCreating(false);
  };

  const handleEdit = (offer: CustomerOffer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      offer_code: offer.offer_code,
      offer_type: offer.offer_type,
      discount_value: offer.discount_value,
      free_hours: offer.free_hours,
      loyalty_points_multiplier: offer.loyalty_points_multiplier,
      target_customer_type: offer.target_customer_type,
      min_booking_amount: offer.min_booking_amount,
      min_hours: offer.min_hours,
      max_redemptions_per_customer: offer.max_redemptions_per_customer,
      total_redemption_limit: offer.total_redemption_limit,
      valid_from: offer.valid_from.split('T')[0],
      valid_until: offer.valid_until ? offer.valid_until.split('T')[0] : '',
      is_active: offer.is_active,
      auto_assign_to_eligible: offer.auto_assign_to_eligible
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!formData.title || !formData.description) {
        toast.error('Please fill in all required fields');
        return;
      }

      const offerData = {
        ...formData,
        offer_code: formData.offer_code || `OFFER${Date.now().toString(36).toUpperCase()}`,
        valid_until: formData.valid_until || null
      };

      if (editingOffer) {
        const { error } = await supabase
          .from('customer_offers')
          .update(offerData)
          .eq('id', editingOffer.id);

        if (error) throw error;

        toast.success('Offer updated successfully');
      } else {
        const { data, error } = await supabase
          .from('customer_offers')
          .insert([offerData])
          .select()
          .single();

        if (error) throw error;

        // Auto-assign to eligible customers if enabled
        if (offerData.auto_assign_to_eligible && data) {
          const { data: result, error: assignError } = await supabase.rpc(
            'assign_offer_to_eligible_customers',
            { offer_id_param: data.id }
          );

          if (!assignError) {
            toast.success(`Offer created and assigned to ${result} customers!`);
          } else {
            toast.success('Offer created successfully');
          }
        } else {
          toast.success('Offer created successfully');
        }
      }

      resetForm();
      fetchOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      toast.error('Failed to save offer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    try {
      const { error } = await supabase
        .from('customer_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast.success('Offer deleted successfully');
      fetchOffers();
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Failed to delete offer');
    }
  };

  const toggleActive = async (offer: CustomerOffer) => {
    try {
      const { error } = await supabase
        .from('customer_offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id);

      if (error) throw error;

      toast.success(`Offer ${!offer.is_active ? 'activated' : 'deactivated'}`);
      fetchOffers();
    } catch (error) {
      console.error('Error toggling offer:', error);
      toast.error('Failed to update offer');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-cuephoria-dark border-cuephoria-purple text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Gift className="text-cuephoria-orange" />
            Customer Offers Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create/Edit Form */}
          {isCreating ? (
            <Card className="bg-cuephoria-darker border-cuephoria-purple/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</span>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X size={18} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Weekend Special"
                      className="bg-background/50 border-cuephoria-lightpurple/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Offer Code</Label>
                    <Input
                      value={formData.offer_code}
                      onChange={(e) => setFormData({ ...formData, offer_code: e.target.value.toUpperCase() })}
                      placeholder="AUTO-GENERATED"
                      className="bg-background/50 border-cuephoria-lightpurple/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Get 50% off on all PS5 stations this weekend"
                    className="bg-background/50 border-cuephoria-lightpurple/30"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Offer Type</Label>
                    <Select value={formData.offer_type} onValueChange={(value) => setFormData({ ...formData, offer_type: value })}>
                      <SelectTrigger className="bg-background/50 border-cuephoria-lightpurple/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage_discount">Percentage Discount</SelectItem>
                        <SelectItem value="flat_discount">Flat Discount</SelectItem>
                        <SelectItem value="free_hours">Free Hours</SelectItem>
                        <SelectItem value="loyalty_bonus">Loyalty Bonus</SelectItem>
                        <SelectItem value="birthday_special">Birthday Special</SelectItem>
                        <SelectItem value="first_booking">First Booking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                      className="bg-background/50 border-cuephoria-lightpurple/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Free Hours</Label>
                    <Input
                      type="number"
                      value={formData.free_hours}
                      onChange={(e) => setFormData({ ...formData, free_hours: Number(e.target.value) })}
                      className="bg-background/50 border-cuephoria-lightpurple/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select
                      value={formData.target_customer_type}
                      onValueChange={(value) => setFormData({ ...formData, target_customer_type: value })}
                    >
                      <SelectTrigger className="bg-background/50 border-cuephoria-lightpurple/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="new_customers">New Customers</SelectItem>
                        <SelectItem value="members">Members Only</SelectItem>
                        <SelectItem value="non_members">Non-Members</SelectItem>
                        <SelectItem value="birthday_month">Birthday Month</SelectItem>
                        <SelectItem value="high_spenders">High Spenders</SelectItem>
                        <SelectItem value="frequent_users">Frequent Users</SelectItem>
                        <SelectItem value="inactive_users">Inactive Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Redemptions Per Customer</Label>
                    <Input
                      type="number"
                      value={formData.max_redemptions_per_customer}
                      onChange={(e) => setFormData({ ...formData, max_redemptions_per_customer: Number(e.target.value) })}
                      className="bg-background/50 border-cuephoria-lightpurple/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valid From</Label>
                    <Input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      className="bg-background/50 border-cuephoria-lightpurple/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Valid Until (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="bg-background/50 border-cuephoria-lightpurple/30"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-gray-400">Enable this offer immediately</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                  <div>
                    <Label>Auto-Assign to Eligible Customers</Label>
                    <p className="text-xs text-gray-400">Automatically assign this offer to matching customers</p>
                  </div>
                  <Switch
                    checked={formData.auto_assign_to_eligible}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_assign_to_eligible: checked })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-cuephoria-green hover:bg-cuephoria-green/80"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingOffer ? 'Update Offer' : 'Create Offer'}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm} className="border-gray-600">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              onClick={() => setIsCreating(true)}
              className="w-full bg-cuephoria-purple hover:bg-cuephoria-purple/80"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Offer
            </Button>
          )}

          {/* Offers List */}
          <div className="space-y-3">
            {loading && offers.length === 0 ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cuephoria-purple" />
                <p className="text-gray-400 mt-2">Loading offers...</p>
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-8">
                <Gift className="mx-auto h-12 w-12 text-gray-600" />
                <p className="text-gray-400 mt-2">No offers yet. Create your first one!</p>
              </div>
            ) : (
              offers.map((offer) => (
                <Card key={offer.id} className="bg-cuephoria-darker border-cuephoria-lightpurple/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{offer.title}</h3>
                          {offer.is_active ? (
                            <Badge className="bg-cuephoria-green">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                          <Badge className="bg-cuephoria-orange">
                            {offer.offer_type === 'percentage_discount' && `${offer.discount_value}%`}
                            {offer.offer_type === 'flat_discount' && `₹${offer.discount_value}`}
                            {offer.offer_type === 'free_hours' && `${offer.free_hours}h`}
                            {offer.offer_type === 'loyalty_bonus' && `${offer.loyalty_points_multiplier}x`}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{offer.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">Code: {offer.offer_code}</Badge>
                          <Badge variant="outline">
                            <Users className="mr-1 h-3 w-3" />
                            {offer.target_customer_type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            <Eye className="mr-1 h-3 w-3" />
                            {offer.views_count} views
                          </Badge>
                          <Badge variant="outline">
                            <Check className="mr-1 h-3 w-3" />
                            {offer.redemptions_count} redeemed
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(offer)}
                          className="border-gray-600"
                        >
                          {offer.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(offer)} className="border-gray-600">
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(offer.id)}
                          className="border-red-600 text-red-500 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-600">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
