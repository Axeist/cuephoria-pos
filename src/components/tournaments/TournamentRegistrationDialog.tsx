
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Phone, Mail, User, CreditCard } from 'lucide-react';

interface TournamentData {
  id: string;
  name: string;
  game_type: string;
  game_variant?: string;
  game_title?: string;
  date: string;
  winner_prize?: number;
  runner_up_prize?: number;
  total_registrations: number;
  max_players: number;
}

interface TournamentRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: TournamentData;
  onRegistrationSuccess: () => void;
}

const TournamentRegistrationDialog: React.FC<TournamentRegistrationDialogProps> = ({
  open,
  onOpenChange,
  tournament,
  onRegistrationSuccess
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName.trim() || !formData.customerPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.customerPhone.trim())) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit Indian mobile number.",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation if provided
    if (formData.customerEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.customerEmail.trim())) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Check if registration is still available (real-time check)
      const { data: currentTournament, error: fetchError } = await supabase
        .from('tournament_public_view')
        .select('total_registrations, max_players')
        .eq('id', tournament.id)
        .single();

      if (fetchError) {
        throw new Error('Failed to verify tournament availability');
      }

      if (currentTournament.total_registrations >= currentTournament.max_players) {
        toast({
          title: "Registration Full",
          description: "Sorry, this tournament is now full. Registration closed.",
          variant: "destructive"
        });
        return;
      }

      // Check for duplicate registration
      const { data: existingRegistration, error: duplicateError } = await supabase
        .from('tournament_public_registrations')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('customer_phone', formData.customerPhone.trim())
        .eq('status', 'registered');

      if (duplicateError) {
        console.error('Error checking duplicate registration:', duplicateError);
      }

      if (existingRegistration && existingRegistration.length > 0) {
        toast({
          title: "Already Registered",
          description: "This phone number is already registered for this tournament.",
          variant: "destructive"
        });
        return;
      }

      // Submit registration
      const registrationData = {
        tournament_id: tournament.id,
        customer_name: formData.customerName.trim(),
        customer_phone: formData.customerPhone.trim(),
        customer_email: formData.customerEmail.trim() || null,
        registration_date: new Date().toISOString(),
        entry_fee: 250,
        status: 'registered',
        registration_source: 'public_website'
      };

      const { error: insertError } = await supabase
        .from('tournament_public_registrations')
        .insert([registrationData]);

      if (insertError) {
        console.error('Registration error:', insertError);
        throw new Error('Failed to complete registration');
      }

      toast({
        title: "Registration Successful! 🎉",
        description: `You're now registered for ${tournament.name}. We'll contact you with further details.`,
      });

      // Reset form and close dialog
      setFormData({
        customerName: '',
        customerPhone: '',
        customerEmail: ''
      });
      
      onRegistrationSuccess();

    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "There was an error processing your registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900/95 to-blue-900/95 border-purple-500/50 text-white backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <span>Tournament Registration</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Info */}
          <div className="bg-black/30 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-lg text-yellow-400">{tournament.name}</h3>
            <div className="text-sm text-purple-200">
              <p>{tournament.game_type}
                {tournament.game_variant && ` - ${tournament.game_variant}`}
                {tournament.game_title && ` - ${tournament.game_title}`}
              </p>
              <p>Date: {new Date(tournament.date).toLocaleDateString()}</p>
              <p>Spots: {tournament.total_registrations + 1} / {tournament.max_players}</p>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Full Name *</span>
              </Label>
              <Input
                id="name"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder="Enter your full name"
                className="bg-black/20 border-purple-500/50 text-white placeholder:text-purple-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Phone Number *</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="bg-black/20 border-purple-500/50 text-white placeholder:text-purple-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email Address (Optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                placeholder="your.email@example.com"
                className="bg-black/20 border-purple-500/50 text-white placeholder:text-purple-300"
              />
            </div>

            {/* Entry Fee Info */}
            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-400/30">
              <div className="flex items-center space-x-2 text-green-400 mb-2">
                <CreditCard className="h-4 w-4" />
                <span className="font-medium">Entry Fee</span>
              </div>
              <div className="text-2xl font-bold text-white">₹250</div>
              <div className="text-sm text-green-200">
                Pay at the venue on tournament day
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all duration-300 hover:scale-105"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Registering...</span>
                </div>
              ) : (
                'Complete Registration'
              )}
            </Button>
          </form>

          <div className="text-xs text-purple-300 text-center">
            * Required fields. By registering, you agree to our terms and conditions.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentRegistrationDialog;
