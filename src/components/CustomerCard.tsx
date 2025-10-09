import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePOS, Customer } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { User, Edit, Trash, Clock, CreditCard, Star, Award, CalendarCheck, Calendar, Phone, Mail, MessageSquare, Hash, Copy } from 'lucide-react';
import { isMembershipActive, getMembershipBadgeText } from '@/utils/membership.utils';
import WhatsAppMessageDialog from '@/components/customers/WhatsAppMessageDialog';
import { useToast } from '@/hooks/use-toast';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (id: string) => void;
  onSelect?: (customer: Customer) => void;
  isSelectable?: boolean;
}

const CustomerCard: React.FC<CustomerCardProps> = ({ 
  customer: initialCustomer, 
  onEdit, 
  onDelete,
  onSelect,
  isSelectable = false
}) => {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const { customers } = usePOS();
  const { toast } = useToast();
  
  useEffect(() => {
    const updatedCustomer = customers.find(c => c.id === customer.id);
    if (updatedCustomer) {
      console.log('CustomerCard: Customer data updated for', updatedCustomer.name, {
        oldTotalSpent: customer.totalSpent,
        newTotalSpent: updatedCustomer.totalSpent,
        oldLoyaltyPoints: customer.loyaltyPoints,
        newLoyaltyPoints: updatedCustomer.loyaltyPoints
      });
      
      setCustomer(updatedCustomer);
    }
  }, [customers, customer.id]);
  
  useEffect(() => {
    if (initialCustomer && initialCustomer.id !== customer.id) {
      console.log('CustomerCard: Initial customer prop changed to', initialCustomer.name);
      setCustomer(initialCustomer);
    }
    
    else if (initialCustomer && (
      initialCustomer.totalSpent !== customer.totalSpent || 
      initialCustomer.loyaltyPoints !== customer.loyaltyPoints
    )) {
      console.log('CustomerCard: Initial customer data updated', {
        oldTotalSpent: customer.totalSpent,
        newTotalSpent: initialCustomer.totalSpent,
        oldLoyaltyPoints: customer.loyaltyPoints,
        newLoyaltyPoints: initialCustomer.loyaltyPoints
      });
      setCustomer(initialCustomer);
    }
  }, [initialCustomer, customer.id, customer.totalSpent, customer.loyaltyPoints]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleCopyCustomerId = () => {
    if (customer.customerId) {
      navigator.clipboard.writeText(customer.customerId);
      toast({
        title: 'Copied!',
        description: `Customer ID ${customer.customerId} copied to clipboard`,
      });
    }
  };

  const isActive = isMembershipActive(customer);
  const membershipStatus = customer.isMember ? (isActive ? 'Active Member' : 'Expired Member') : 'Non-Member';
  const membershipStatusColor = customer.isMember ? (isActive ? 'text-green-400' : 'text-orange-400') : 'text-gray-400';

  return (
    <>
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 hover:-translate-y-1 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 backdrop-blur-sm">
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
        
        <CardHeader className="pb-3 relative z-10">
          {customer.customerId && (
            <div className="flex items-center justify-between mb-3 p-2 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-md border border-purple-500/30">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Hash className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <span className="text-sm font-mono font-bold text-purple-300 truncate">
                  {customer.customerId}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-purple-500/20 flex-shrink-0"
                onClick={handleCopyCustomerId}
              >
                <Copy className="h-3.5 w-3.5 text-purple-400" />
              </Button>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all duration-300 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-semibold text-sm">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-white truncate">
                {customer.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-400 font-mono">
                  {formatPhoneNumber(customer.phone)}
                </span>
              </div>
              <div className="mt-2">
                <span className={`text-sm font-medium ${membershipStatusColor}`}>
                  {membershipStatus}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 relative z-10 px-6">
          {customer.email && (
            <div className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-md">
              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-300 truncate flex-1">{customer.email}</span>
            </div>
          )}
          
          {customer.isMember && (
            <div className="space-y-2 p-3 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/20">
              {customer.membershipPlan && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-purple-300">Plan</span>
                  </div>
                  <span className="text-sm font-medium text-white">{customer.membershipPlan}</span>
                </div>
              )}
              
              {customer.membershipStartDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-purple-300">Start</span>
                  </div>
                  <span className="text-sm text-gray-300">{formatDate(customer.membershipStartDate)}</span>
                </div>
              )}
              
              {customer.membershipExpiryDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-purple-300">Expires</span>
                  </div>
                  <span className="text-sm text-gray-300">{formatDate(customer.membershipExpiryDate)}</span>
                </div>
              )}
              
              {customer.membershipHoursLeft !== undefined && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-purple-300">Hours Left</span>
                  </div>
                  <span className="text-sm font-medium text-white">{customer.membershipHoursLeft}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center justify-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Loyalty</span>
              </div>
              <span className="text-lg font-semibold text-yellow-400">{customer.loyaltyPoints}</span>
              <span className="text-xs text-gray-500">points</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 text-center">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-green-400" />
                <span className="text-xs text-gray-400">Spent</span>
              </div>
              <div className="text-lg font-semibold text-green-400">
                <CurrencyDisplay amount={customer.totalSpent} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-md">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-400">Play Time</span>
            </div>
            <span className="text-sm font-medium text-blue-400">{formatTime(customer.totalPlayTime)}</span>
          </div>
          
          <div className="text-center pt-3 border-t border-gray-700/50">
            <span className="text-xs text-gray-500">
              Member since {formatDate(customer.createdAt)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="pt-4 pb-6 px-6 relative z-10">
          {isSelectable ? (
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => onSelect && onSelect(customer)}
            >
              Select Customer
            </Button>
          ) : (
            <div className="space-y-2 w-full">
              <Button 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setIsWhatsAppDialogOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send WhatsApp Message
              </Button>
              
              <div className="flex gap-2 w-full">
                {onEdit && (
                  <Dialog>
                    <DialogContent className="bg-background">
                      <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-all duration-300"
                  onClick={() => onEdit && onEdit(customer)}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1 bg-red-600/80 hover:bg-red-600 border-red-500/50 transition-all duration-300"
                  onClick={() => onDelete && onDelete(customer.id)}
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      <WhatsAppMessageDialog
        customer={customer}
        isOpen={isWhatsAppDialogOpen}
        onClose={() => setIsWhatsAppDialogOpen(false)}
      />
    </>
  );
};

export default CustomerCard;
