
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Users, Calendar, MapPin, Phone, User } from 'lucide-react';

interface TournamentDialogProps {
  tournament: {
    id: string;
    name: string;
    date: string;
    maxPlayers: number;
    entryFee: number;
    prizePool: number;
    format: string;
    location: string;
  };
  registeredCount: number;
}

const TournamentDialog: React.FC<TournamentDialogProps> = ({ tournament, registeredCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim() || !phoneNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate registration process
    setTimeout(() => {
      toast({
        title: 'Registration Successful!',
        description: `You've been registered for ${tournament.name}`,
      });
      setIsOpen(false);
      setPlayerName('');
      setPhoneNumber('');
      setIsSubmitting(false);
    }, 1500);
  };

  const spotsRemaining = tournament.maxPlayers - registeredCount;
  const isFullyBooked = spotsRemaining <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isFullyBooked}
        >
          <Trophy className="w-4 h-4 mr-2" />
          {isFullyBooked ? 'Fully Booked' : 'Register Now'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-cuephoria-lightpurple flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Register for Tournament
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-cuephoria-darkpurple/50 p-4 rounded-lg border border-cuephoria-lightpurple/20">
            <h3 className="font-semibold text-cuephoria-lightpurple mb-2">{tournament.name}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cuephoria-orange" />
                <span>{tournament.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cuephoria-green" />
                <span>{tournament.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cuephoria-blue" />
                <span>{registeredCount}/{tournament.maxPlayers} registered</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span>Prize Pool: ₹{tournament.prizePool.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleRegistration} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName" className="text-cuephoria-lightpurple flex items-center gap-2">
                <User className="w-4 h-4" />
                Player Name *
              </Label>
              <Input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your full name"
                className="bg-cuephoria-darker border-cuephoria-lightpurple/30 text-white placeholder:text-gray-400 focus:border-cuephoria-lightpurple"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-cuephoria-lightpurple flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number *
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="bg-cuephoria-darker border-cuephoria-lightpurple/30 text-white placeholder:text-gray-400 focus:border-cuephoria-lightpurple"
                required
              />
              <p className="text-xs text-cuephoria-grey mt-1">
                Already visited? Use your number used during billing
              </p>
            </div>
            
            <div className="bg-cuephoria-darkpurple/30 p-3 rounded-lg border border-cuephoria-orange/20">
              <p className="text-sm text-cuephoria-orange font-semibold">
                Entry Fee: ₹{tournament.entryFee} (Pay at venue)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Payment to be made upon arrival at the tournament venue
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-cuephoria-grey text-cuephoria-grey hover:bg-cuephoria-grey/20"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !playerName.trim() || !phoneNumber.trim()}
                className="flex-1 bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/80 hover:to-cuephoria-blue/80 text-white"
              >
                {isSubmitting ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentDialog;
