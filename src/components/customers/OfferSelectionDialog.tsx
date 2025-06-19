
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Gift, Users, Percent, DollarSign, Package, Check } from 'lucide-react';

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

interface OfferSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateTitle: string;
  availableOffers: Offer[];
  selectedOfferIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

const OfferSelectionDialog: React.FC<OfferSelectionDialogProps> = ({
  isOpen,
  onClose,
  templateTitle,
  availableOffers,
  selectedOfferIds,
  onSelectionChange
}) => {
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedOfferIds);

  useEffect(() => {
    setLocalSelectedIds(selectedOfferIds);
  }, [selectedOfferIds, isOpen]);

  const handleToggleOffer = (offerId: string) => {
    setLocalSelectedIds(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const handleSave = () => {
    onSelectionChange(localSelectedIds);
    onClose();
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

  const formatOfferValue = (offer: Offer) => {
    switch (offer.discount_type) {
      case 'percentage': return `${offer.discount_value}% off`;
      case 'fixed': return `₹${offer.discount_value} off`;
      case 'bogo': return 'Buy One Get One';
      case 'free_item': return 'Free Item';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-400" />
            Select Offers for "{templateTitle}"
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose which offers to include in this message template. Selected offers will be randomly used in the template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Available Offers ({availableOffers.length})
            </h3>
            <div className="text-sm text-gray-400">
              {localSelectedIds.length} selected
            </div>
          </div>

          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {availableOffers.map((offer) => {
              const isSelected = localSelectedIds.includes(offer.id);
              
              return (
                <Card 
                  key={offer.id}
                  className={`border transition-all duration-200 cursor-pointer hover:shadow-lg ${
                    isSelected 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                  }`}
                  onClick={() => handleToggleOffer(offer.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleOffer(offer.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <CardTitle className="text-sm text-white flex items-center gap-2">
                            {getDiscountIcon(offer.discount_type)}
                            {offer.title}
                            {isSelected && <Check className="h-4 w-4 text-green-400" />}
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
                            <Badge variant="outline" className="text-xs text-green-400">
                              {formatOfferValue(offer)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-400 line-clamp-2 mb-2 ml-7">
                      {offer.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 ml-7">
                      <div className="flex items-center gap-4">
                        {offer.min_spend > 0 && (
                          <span className="text-orange-400">
                            Min spend: ₹{offer.min_spend}
                          </span>
                        )}
                        {offer.max_uses && (
                          <span>
                            {offer.current_uses}/{offer.max_uses} used
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {availableOffers.length === 0 && (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Active Offers</h3>
              <p className="text-gray-400">
                Create some offers first to include them in your templates.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Save Selection ({localSelectedIds.length} offers)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OfferSelectionDialog;
