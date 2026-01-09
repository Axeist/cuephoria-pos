import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gift,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Copy,
  Loader2,
  Sparkles,
  Tag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerSession, formatDate } from '@/utils/customerAuth';
import { toast } from 'sonner';
import BottomNav from '@/components/customer/BottomNav';
import '@/styles/customer-animations.css';

interface CustomerOffer {
  id: string;
  assignment_id: string;
  title: string;
  description: string;
  offer_code: string;
  offer_type: string;
  discount_value: number;
  free_hours: number;
  valid_until: string | null;
  status: string;
  terms_and_conditions: string | null;
  assigned_at: string;
  viewed_at: string | null;
}

export default function CustomerOffers() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(getCustomerSession());
  const [activeOffers, setActiveOffers] = useState<CustomerOffer[]>([]);
  const [redeemedOffers, setRedeemedOffers] = useState<CustomerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (!customer) {
      navigate('/customer/login');
      return;
    }
    loadOffers();
  }, [customer, navigate]);

  const loadOffers = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      // Get active offers
      const { data: active } = await supabase
        .from('customer_offer_assignments')
        .select(`
          id,
          status,
          assigned_at,
          viewed_at,
          customer_offers (
            id,
            title,
            description,
            offer_code,
            offer_type,
            discount_value,
            free_hours,
            valid_until,
            terms_and_conditions
          )
        `)
        .eq('customer_id', customer.id)
        .in('status', ['assigned', 'viewed'])
        .order('assigned_at', { ascending: false });

      // Get redeemed offers
      const { data: redeemed } = await supabase
        .from('customer_offer_assignments')
        .select(`
          id,
          status,
          assigned_at,
          viewed_at,
          redeemed_at,
          customer_offers (
            id,
            title,
            description,
            offer_code,
            offer_type,
            discount_value,
            free_hours,
            valid_until,
            terms_and_conditions
          )
        `)
        .eq('customer_id', customer.id)
        .eq('status', 'redeemed')
        .order('redeemed_at', { ascending: false })
        .limit(10);

      setActiveOffers(
        active
          ?.filter(item => item.customer_offers)
          .map(item => {
            const offer = item.customer_offers as any;
            return {
              assignment_id: item.id,
              id: offer.id,
              title: offer.title,
              description: offer.description,
              offer_code: offer.offer_code,
              offer_type: offer.offer_type,
              discount_value: offer.discount_value,
              free_hours: offer.free_hours,
              valid_until: offer.valid_until,
              status: item.status,
              terms_and_conditions: offer.terms_and_conditions,
              assigned_at: item.assigned_at,
              viewed_at: item.viewed_at
            };
          }) || []
      );

      setRedeemedOffers(
        redeemed
          ?.filter(item => item.customer_offers)
          .map(item => {
            const offer = item.customer_offers as any;
            return {
              assignment_id: item.id,
              id: offer.id,
              title: offer.title,
              description: offer.description,
              offer_code: offer.offer_code,
              offer_type: offer.offer_type,
              discount_value: offer.discount_value,
              free_hours: offer.free_hours,
              valid_until: offer.valid_until,
              status: item.status,
              terms_and_conditions: offer.terms_and_conditions,
              assigned_at: item.assigned_at,
              viewed_at: item.viewed_at
            };
          }) || []
      );
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('customer_offer_assignments')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;
      loadOffers();
    } catch (error) {
      console.error('Error marking offer as viewed:', error);
    }
  };

  const copyOfferCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Offer code copied!');
  };

  const getOfferBadge = (offer: CustomerOffer) => {
    if (offer.offer_type === 'percentage_discount') {
      return `${offer.discount_value}% OFF`;
    }
    if (offer.offer_type === 'flat_discount') {
      return `₹${offer.discount_value} OFF`;
    }
    if (offer.offer_type === 'free_hours') {
      return `${offer.free_hours}H FREE`;
    }
    if (offer.offer_type === 'loyalty_bonus') {
      return '2X POINTS';
    }
    return 'SPECIAL OFFER';
  };

  const isExpiringSoon = (validUntil: string | null) => {
    if (!validUntil) return false;
    const expiryDate = new Date(validUntil);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  };

  if (!customer) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/20 to-gray-900 pb-20 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-red-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>
      <div className="relative z-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-orange-600/90 to-red-600/90 border-b border-orange-400/50 backdrop-blur-xl shadow-2xl shadow-orange-500/40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customer/dashboard')}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Gift className="text-cuephoria-orange" size={24} />
                Your Exclusive Offers
              </h1>
              <p className="text-xs text-gray-300">
                {activeOffers.length} active offer{activeOffers.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cuephoria-orange" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-cuephoria-darker">
              <TabsTrigger value="active" className="data-[state=active]:bg-cuephoria-orange">
                Active ({activeOffers.length})
              </TabsTrigger>
              <TabsTrigger value="redeemed" className="data-[state=active]:bg-cuephoria-orange">
                Redeemed ({redeemedOffers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4 space-y-4">
              {activeOffers.length === 0 ? (
                <Card className="bg-cuephoria-darker border-gray-800">
                  <CardContent className="p-8 text-center">
                    <Gift className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400">No active offers at the moment</p>
                    <p className="text-xs text-gray-500 mt-2">Check back soon for exclusive deals!</p>
                  </CardContent>
                </Card>
              ) : (
                activeOffers.map((offer) => {
                  const isNew = offer.status === 'assigned';
                  const expiringSoon = isExpiringSoon(offer.valid_until);

                  return (
                    <Card
                      key={offer.assignment_id}
                      className="bg-gradient-to-br from-orange-600/30 to-red-600/30 border-2 border-orange-500/50 hover:border-orange-400 shadow-2xl shadow-orange-500/30 hover:shadow-3xl hover:shadow-orange-500/50 cursor-pointer transform hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 backdrop-blur-xl"
                      onClick={() => {
                        if (isNew) markAsViewed(offer.assignment_id);
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-white text-lg">{offer.title}</h3>
                              {isNew && (
                                <Badge className="bg-cuephoria-red animate-pulse">NEW!</Badge>
                              )}
                              {expiringSoon && (
                                <Badge variant="outline" className="border-red-500 text-red-500">
                                  <Clock size={12} className="mr-1" />
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-300 mb-3">{offer.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <Badge className="bg-cuephoria-orange text-white text-base px-3 py-1">
                            <Sparkles size={14} className="mr-1" />
                            {getOfferBadge(offer)}
                          </Badge>
                        </div>

                        <div className="bg-cuephoria-darker/50 rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Tag className="text-cuephoria-lightpurple" size={16} />
                              <span className="text-xs text-gray-400">Offer Code:</span>
                              <code className="font-mono text-sm text-cuephoria-lightpurple font-bold">
                                {offer.offer_code}
                              </code>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyOfferCode(offer.offer_code);
                              }}
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </div>

                        {offer.valid_until && (
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                            <Calendar size={12} />
                            <span>Valid until {formatDate(offer.valid_until)}</span>
                          </div>
                        )}

                        {offer.terms_and_conditions && (
                          <details className="text-xs text-gray-500 mt-3">
                            <summary className="cursor-pointer hover:text-gray-300">Terms & Conditions</summary>
                            <p className="mt-2 pl-4">{offer.terms_and_conditions}</p>
                          </details>
                        )}

                        <Button
                          className="w-full mt-4 bg-gradient-to-r from-cuephoria-orange to-cuephoria-red hover:shadow-xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/public/booking');
                          }}
                        >
                          Use This Offer
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="redeemed" className="mt-4 space-y-3">
              {redeemedOffers.length === 0 ? (
                <Card className="bg-cuephoria-darker border-gray-800">
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-gray-400">No redeemed offers yet</p>
                    <p className="text-xs text-gray-500 mt-2">Start using offers to save more!</p>
                  </CardContent>
                </Card>
              ) : (
                redeemedOffers.map((offer) => (
                  <Card key={offer.assignment_id} className="bg-cuephoria-darker border-gray-800 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{offer.title}</h3>
                          <p className="text-sm text-gray-400 mt-1">{offer.description}</p>
                          <Badge className="mt-2 bg-cuephoria-green">
                            <CheckCircle2 size={12} className="mr-1" />
                            Redeemed
                          </Badge>
                        </div>
                        <Badge className="bg-gray-700 text-gray-300">
                          {getOfferBadge(offer)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
      </div>
    </div>
  );
}
