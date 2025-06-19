
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Edit, Send, Clock, Star, Calendar, Gift, Trophy, Users } from 'lucide-react';
import { Customer } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMessageDialogProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  discount_type: string;
  discount_value: number;
  validity_days: number;
  target_audience: string;
  min_spend: number;
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  game_type: string;
  game_title?: string;
  status: string;
  winner_prize?: number;
}

const WhatsAppMessageDialog: React.FC<WhatsAppMessageDialogProps> = ({
  customer,
  isOpen,
  onClose
}) => {
  const [selectedMessage, setSelectedMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch offers and tournaments when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchOffers();
      fetchTournaments();
    }
  }, [isOpen]);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching offers:', error);
        return;
      }
      
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error('Error fetching tournaments:', error);
        return;
      }
      
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  // Generate personalized message templates
  const generateTemplates = () => {
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-IN');
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const memberSince = formatDate(customer.createdAt);
    const totalPlayTime = formatTime(customer.totalPlayTime);
    
    // Get relevant offers for the customer
    const relevantOffers = offers.filter(offer => {
      if (offer.target_audience === 'all') return true;
      if (offer.target_audience === 'members' && customer.isMember) return true;
      if (offer.target_audience === 'non_members' && !customer.isMember) return true;
      if (offer.target_audience === 'vip' && customer.loyaltyPoints > 500) return true;
      return false;
    });

    const getRandomOffer = () => {
      if (relevantOffers.length === 0) return "Special offer coming soon for you!";
      const randomOffer = relevantOffers[Math.floor(Math.random() * relevantOffers.length)];
      return formatOfferText(randomOffer);
    };

    const formatOfferText = (offer: Offer) => {
      let offerText = offer.description;
      if (offer.min_spend > 0) {
        offerText += ` (Min spend: ₹${offer.min_spend})`;
      }
      if (offer.validity_days > 0) {
        offerText += ` Valid for ${offer.validity_days} days.`;
      }
      return offerText;
    };

    const getUpcomingTournament = () => {
      const upcomingTournament = tournaments.find(t => t.status === 'upcoming');
      if (!upcomingTournament) return null;
      
      return `🏆 Upcoming Tournament Alert!\n${upcomingTournament.name} - ${upcomingTournament.game_type}${upcomingTournament.game_title ? ` (${upcomingTournament.game_title})` : ''}\nDate: ${upcomingTournament.date}${upcomingTournament.winner_prize ? `\nWinner Prize: ₹${upcomingTournament.winner_prize}` : ''}\n\nRegister now to secure your spot!`;
    };

    const templates = [
      {
        title: "Personalized Welcome Back",
        icon: <Clock className="h-4 w-4 text-blue-400" />,
        message: `Hi ${customer.name}! 🎮\n\nGreat to see you back! You've been part of our gaming family since ${memberSince} and have logged an impressive ${totalPlayTime} of playtime. That's some serious gaming dedication! 🔥\n\n${getRandomOffer()}\n\nCome over and let's continue your gaming journey!\n\nBest regards,\nCuephoria Gaming`
      },
      {
        title: "Loyalty Points Special",
        icon: <Star className="h-4 w-4 text-yellow-400" />,
        message: customer.loyaltyPoints > 100 
          ? `Hey ${customer.name}! ⭐\n\nYou're sitting on a goldmine of ${customer.loyaltyPoints} loyalty points! That's enough for some amazing rewards! 💎\n\n${getRandomOffer()}\n\nDon't let those points gather dust - come redeem them for something awesome!\n\nHappy Gaming!\nCuephoria Gaming`
          : `Hi ${customer.name}! 🎮\n\nYou currently have ${customer.loyaltyPoints} loyalty points. Every game session gets you closer to exciting rewards!\n\n${getRandomOffer()}\n\nKeep playing, keep earning!\n\nCuephoria Gaming`
      },
      {
        title: "Exclusive Member Offer",
        icon: <Gift className="h-4 w-4 text-purple-400" />,
        message: customer.isMember 
          ? `👑 VIP Member Alert - ${customer.name}!\n\nAs our valued member with ₹${customer.totalSpent.toLocaleString('en-IN')} lifetime spending, you deserve the best!\n\n${getRandomOffer()}\n\n${customer.membershipHoursLeft ? `You have ${customer.membershipHoursLeft} hours left on your membership - make them count!` : ''}\n\nYour loyalty means everything to us!\nCuephoria Gaming`
          : `Hey ${customer.name}! 🎮\n\nYou've spent ₹${customer.totalSpent.toLocaleString('en-IN')} with us - thank you for your trust!\n\nReady to level up? Consider our membership for exclusive benefits:\n• Priority booking\n• Member-only discounts\n• Extended play hours\n• Special events access\n\n${getRandomOffer()}\n\nLet's game together!\nCuephoria Gaming`
      },
      {
        title: "Tournament Invitation",
        icon: <Trophy className="h-4 w-4 text-gold-400" />,
        message: getUpcomingTournament() 
          ? `🏆 Special Invitation for ${customer.name}!\n\n${getUpcomingTournament()}\n\nWith your ${totalPlayTime} of gaming experience, you'd be a strong contender!\n\n${getRandomOffer()}\n\nReady to show your skills? Let us know!\n\nGame On!\nCuephoria Gaming`
          : `Hi ${customer.name}! 🎮\n\nKeep an eye out for our upcoming tournaments! With your ${totalPlayTime} of experience, you'd be a formidable opponent.\n\n${getRandomOffer()}\n\nStay tuned for tournament announcements!\n\nCuephoria Gaming`
      },
      {
        title: "Birthday/Special Occasion",
        icon: <Calendar className="h-4 w-4 text-pink-400" />,
        message: `🎉 Special Day Wishes for ${customer.name}! 🎉\n\nWe hope you're having an amazing day! As someone who's been with us since ${memberSince}, you're truly special to our gaming community.\n\n🎁 Birthday Special:\n${relevantOffers.find(o => o.title.includes('Birthday')) ? formatOfferText(relevantOffers.find(o => o.title.includes('Birthday'))!) : getRandomOffer()}\n\nCome celebrate with us - let's make this day even more memorable with some epic gaming!\n\nWishing you happiness and high scores!\nCuephoria Gaming`
      },
      {
        title: "Community Engagement",
        icon: <Users className="h-4 w-4 text-green-400" />,
        message: `Hey ${customer.name}! 👥\n\nOur gaming community is growing stronger every day, and players like you (with ${totalPlayTime} of experience) are what make it special!\n\n${getRandomOffer()}\n\nBring your friends along - gaming is always better together! We have group packages and friend referral rewards too.\n\nSee you in the arena!\nCuephoria Gaming`
      }
    ];

    return templates;
  };

  const templates = generateTemplates();

  useEffect(() => {
    if (isOpen && templates.length > 0) {
      setSelectedMessage(templates[0].message);
      setEditedMessage(templates[0].message);
      setIsEditing(false);
    }
  }, [isOpen, offers, tournaments]);

  const handleTemplateSelect = (message: string) => {
    setSelectedMessage(message);
    setEditedMessage(message);
    setIsEditing(false);
  };

  const handleSendWhatsApp = () => {
    const messageToSend = isEditing ? editedMessage : selectedMessage;
    const phoneNumber = customer.phone.startsWith('+91') ? customer.phone : `+91${customer.phone}`;
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\+/g, '')}?text=${encodeURIComponent(messageToSend)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-400" />
            Send WhatsApp Message to {customer.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose from personalized templates with live offers and tournament updates
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Smart Templates</h3>
              {(offers.length > 0 || tournaments.length > 0) && (
                <div className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
                  Live data integrated
                </div>
              )}
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {templates.map((template, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all duration-200 border ${
                    selectedMessage === template.message 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                  }`}
                  onClick={() => handleTemplateSelect(template.message)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      {template.icon}
                      {template.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-400 line-clamp-3">
                      {template.message.substring(0, 120)}...
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Message Preview/Edit Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Message Preview</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
            </div>

            {isEditing ? (
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="min-h-80 bg-gray-800 border-gray-600 text-white resize-none"
                placeholder="Edit your message here..."
              />
            ) : (
              <Card className="bg-gray-800/50 border-gray-600">
                <CardContent className="p-4">
                  <div className="whitespace-pre-wrap text-sm text-gray-300 min-h-80 max-h-80 overflow-y-auto">
                    {selectedMessage}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Customer Info Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-800/30 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Customer Profile</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Spent:</span>
                      <span className="text-green-400">
                        <CurrencyDisplay amount={customer.totalSpent} />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Loyalty Points:</span>
                      <span className="text-yellow-400">{customer.loyaltyPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Play Time:</span>
                      <span className="text-blue-400">{Math.floor(customer.totalPlayTime / 60)}h {customer.totalPlayTime % 60}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={customer.isMember ? "text-purple-400" : "text-gray-400"}>
                        {customer.isMember ? "Member" : "Non-Member"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/30 border-gray-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white">Active Offers ({offers.length})</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-xs max-h-20 overflow-y-auto">
                    {offers.slice(0, 3).map((offer, index) => (
                      <div key={offer.id} className="text-green-400">
                        • {offer.title}
                      </div>
                    ))}
                    {offers.length > 3 && (
                      <div className="text-gray-500">+{offers.length - 3} more offers</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
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
            onClick={handleSendWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!selectedMessage}
          >
            <Send className="h-4 w-4 mr-2" />
            Send via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppMessageDialog;
