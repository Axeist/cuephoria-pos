
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Star, Clock, ExternalLink } from 'lucide-react';

const PromotionalPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCount, setShowCount] = useState(0);

  useEffect(() => {
    // First popup after 20 seconds
    const firstTimeout = setTimeout(() => {
      setIsOpen(true);
      setShowCount(1);
    }, 20000);

    return () => clearTimeout(firstTimeout);
  }, []);

  useEffect(() => {
    // Recurring popup every 45 seconds after the second instance
    if (showCount >= 2) {
      const recurringInterval = setInterval(() => {
        setIsOpen(true);
        setShowCount(prev => prev + 1);
      }, 45000);

      return () => clearInterval(recurringInterval);
    }
  }, [showCount]);

  const handleClose = () => {
    setIsOpen(false);
    if (showCount === 1) {
      // Set up the second popup after 45 seconds
      setTimeout(() => {
        setIsOpen(true);
        setShowCount(2);
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
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-cuephoria-grey/20 transition-colors z-10"
        >
          <X className="h-4 w-4 text-cuephoria-grey hover:text-white" />
        </button>

        <DialogHeader className="text-center space-y-4 pt-2">
          <div className="flex justify-center">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold text-lg px-4 py-2 animate-pulse">
              <Star className="mr-2 h-5 w-5" />
              50% OFF
            </Badge>
          </div>
          
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-text-gradient">
            🔥 Limited Time Offer! 🔥
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center px-2">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-yellow-200">
              Massive 50% discount running at Cuephoria!
            </p>
            <p className="text-cuephoria-grey">
              Don't miss out on this incredible deal. Book your gaming session now and save big!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-red-400 font-medium">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Hurry! Limited time only</span>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleBookNow}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold py-3 text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-400/30"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Book Now & Save 50%
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
              className="absolute w-2 h-2 bg-yellow-400/30 rounded-full animate-float"
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
