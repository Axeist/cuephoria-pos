
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Edit, Send, Clock, Star, Calendar, Gift } from 'lucide-react';
import { Customer } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';

interface WhatsAppMessageDialogProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
}

const WhatsAppMessageDialog: React.FC<WhatsAppMessageDialogProps> = ({
  customer,
  isOpen,
  onClose
}) => {
  const [selectedMessage, setSelectedMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');

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
    const offers = [
      "Get 20% off on your next gaming session!",
      "Enjoy a complimentary snack with your next visit!",
      "Free extra 30 minutes on your favorite game!",
      "Special member discount - 15% off food & drinks!",
      "Bring a friend and get 2-for-1 gaming hours!"
    ];
    
    const randomOffer = offers[Math.floor(Math.random() * offers.length)];

    const templates = [
      {
        title: "Welcome Back Message",
        message: `Hi ${customer.name}! 🎮\n\nWe hope you're doing great! You've been gaming with us since ${memberSince} and have clocked an amazing ${totalPlayTime} of playtime. That's dedication! 🔥\n\n${randomOffer}\n\nSee you soon at our gaming zone!\n\nBest regards,\nCuephoria Gaming`
      },
      {
        title: "Loyalty Points Reminder",
        message: customer.loyaltyPoints > 100 
          ? `Hey ${customer.name}! 🌟\n\nYou have ${customer.loyaltyPoints} loyalty points waiting to be redeemed! That's some serious gaming rewards right there! 💎\n\nDrop by and treat yourself to something special. Your points are burning a hole in our system! 😄\n\nGame on!\nCuephoria Gaming`
          : `Hi ${customer.name}! 🎮\n\nYou currently have ${customer.loyaltyPoints} loyalty points. Keep gaming to earn more exciting rewards!\n\n${randomOffer}\n\nEvery game session gets you closer to amazing prizes!\n\nCuephoria Gaming`
      },
      {
        title: "Special Offer",
        message: `🎉 Exclusive Offer for ${customer.name}! 🎉\n\nAs one of our valued customers with ${totalPlayTime} of gaming experience, we have something special for you!\n\n${randomOffer}\n\nThis offer is valid for the next 7 days. Don't miss out!\n\nGame time awaits!\nCuephoria Gaming`
      },
      {
        title: "Membership Appreciation",
        message: customer.isMember 
          ? `Hi ${customer.name}! 👑\n\nThank you for being an amazing member! You've spent <CurrencyDisplay amount={customer.totalSpent} /> with us and earned ${customer.loyaltyPoints} loyalty points.\n\n${customer.membershipHoursLeft ? `You still have ${customer.membershipHoursLeft} hours left on your membership.` : ''}\n\n${randomOffer}\n\nYour loyalty means the world to us!\nCuephoria Gaming`
          : `Hey ${customer.name}! 🎮\n\nYou've been gaming with us since ${memberSince} and we love having you around!\n\nWhy not consider becoming a member? Enjoy exclusive benefits, discounts, and priority booking!\n\n${randomOffer}\n\nLet's level up together!\nCuephoria Gaming`
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
  }, [isOpen]);

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

  const renderMessageWithCurrency = (message: string) => {
    // Replace currency display patterns with actual formatted currency
    return message.replace(/<CurrencyDisplay amount=\{customer\.totalSpent\} \/>/g, `₹${customer.totalSpent.toLocaleString('en-IN')}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-400" />
            Send WhatsApp Message to {customer.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose a template below or create your own personalized message
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Message Templates</h3>
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
                      {template.title === 'Welcome Back Message' && <Clock className="h-4 w-4 text-blue-400" />}
                      {template.title === 'Loyalty Points Reminder' && <Star className="h-4 w-4 text-yellow-400" />}
                      {template.title === 'Special Offer' && <Gift className="h-4 w-4 text-purple-400" />}
                      {template.title === 'Membership Appreciation' && <Calendar className="h-4 w-4 text-green-400" />}
                      {template.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-400 line-clamp-3">
                      {renderMessageWithCurrency(template.message).substring(0, 100)}...
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
                className="min-h-64 bg-gray-800 border-gray-600 text-white resize-none"
                placeholder="Edit your message here..."
              />
            ) : (
              <Card className="bg-gray-800/50 border-gray-600">
                <CardContent className="p-4">
                  <div className="whitespace-pre-wrap text-sm text-gray-300 min-h-64 max-h-64 overflow-y-auto">
                    {renderMessageWithCurrency(selectedMessage)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Info Summary */}
            <Card className="bg-gray-800/30 border-gray-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">Customer Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">Total Spent:</div>
                  <div className="text-white"><CurrencyDisplay amount={customer.totalSpent} /></div>
                  <div className="text-gray-400">Loyalty Points:</div>
                  <div className="text-yellow-400">{customer.loyaltyPoints}</div>
                  <div className="text-gray-400">Play Time:</div>
                  <div className="text-blue-400">{Math.floor(customer.totalPlayTime / 60)}h {customer.totalPlayTime % 60}m</div>
                  <div className="text-gray-400">Member Since:</div>
                  <div className="text-white">{new Date(customer.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
              </CardContent>
            </Card>
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
