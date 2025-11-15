
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, ExternalLink, Crown } from 'lucide-react';

interface PromotionalPopupProps {
  isMember?: boolean;
  blockWhenOpen?: boolean; // Block showing when another popup/dialog is open
}

const PromotionalPopup: React.FC<PromotionalPopupProps> = ({ isMember = false, blockWhenOpen = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCount, setShowCount] = useState(0);

  const discountPercentage = isMember ? 50 : 25;
  const discountText = isMember ? '50% OFF' : '25% OFF';
  const membershipText = isMember ? 'EXCLUSIVE MEMBER DEAL!' : 'SPECIAL OFFER!';

  useEffect(() => {
    // Close popup if blocked by another popup/dialog
    if (blockWhenOpen && isOpen) {
      setIsOpen(false);
    }
  }, [blockWhenOpen, isOpen]);

  useEffect(() => {
    // Don't show if blocked by another popup/dialog
    if (blockWhenOpen) return;
    
    // First popup after 20 seconds
    const firstTimeout = setTimeout(() => {
      if (!blockWhenOpen) {
        setIsOpen(true);
        setShowCount(1);
      }
    }, 20000);

    return () => clearTimeout(firstTimeout);
  }, [blockWhenOpen]);

  useEffect(() => {
    // Don't show if blocked by another popup/dialog
    if (blockWhenOpen) return;
    
    // Recurring popup every 45 seconds after the second instance
    if (showCount >= 2) {
      const recurringInterval = setInterval(() => {
        if (!blockWhenOpen) {
          setIsOpen(true);
          setShowCount(prev => prev + 1);
        }
      }, 45000);

      return () => clearInterval(recurringInterval);
    }
  }, [showCount, blockWhenOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (showCount === 1) {
      // Set up the second popup after 45 seconds (only if not blocked)
      setTimeout(() => {
        if (!blockWhenOpen) {
          setIsOpen(true);
          setShowCount(2);
        }
      }, 45000);
    }
  };

  const handleBookNow = () => {
    window.open('https://cuephoria.in/book', '_blank');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-gradient-to-br from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark border-2 border-yellow-400/50 text-white max-w-md animate-scale-in shadow-2xl shadow-yellow-400/20">
        <DialogHeader className="text-center space-y-4 pt-2">
          <div className="flex justify-center">
            <Badge className={`${isMember ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-yellow-400 to-orange-400'} text-black font-bold text-lg px-4 py-2 animate-pulse`}>
              {isMember ? <Crown className="mr-2 h-5 w-5" /> : <Star className="mr-2 h-5 w-5" />}
              {discountText}
            </Badge>
          </div>
          
          <DialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-text-gradient">
            🔥 {membershipText} 🔥
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center px-2">
          <div className="space-y-2">
            {isMember ? (
              <>
                <p className="text-lg font-semibold text-purple-200">
                  Exclusive {discountPercentage}% member discount at Cuephoria!
                </p>
                <p className="text-cuephoria-grey">
                  As a valued member, enjoy this special discount on your gaming sessions. Your membership privileges are active!
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-yellow-200">
                  Get {discountPercentage}% off your gaming session at Cuephoria!
                </p>
                <p className="text-cuephoria-grey">
                  Don't miss out on this great deal. Book now and save on your next visit!
                </p>
                <div className="mt-3 p-3 bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg border border-purple-400/30">
                  <p className="text-sm text-purple-200 font-medium">
                    💎 Want 50% off? Become a member and unlock exclusive deals!
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-red-400 font-medium">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Hurry! Limited time only</span>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleBookNow}
              className={`w-full ${isMember ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500'} text-black font-bold py-3 text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-400/30`}
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Book Now & Save {discountPercentage}%
            </Button>
            
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full border-cuephoria-grey/30 text-cuephoria-grey hover:bg-cuephoria-grey/10 hover:text-white"
            >
              Maybe Later
            </Button>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 ${isMember ? 'bg-purple-400/30' : 'bg-yellow-400/30'} rounded-full animate-float`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromotionalPopup;
