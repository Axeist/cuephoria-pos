import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Percent, GraduationCap, Sparkles, Trophy, AlertCircle } from 'lucide-react';

interface CouponPromotionalPopupProps {
  onCouponSelect?: (coupon: string) => void;
}

const CouponPromotionalPopup: React.FC<CouponPromotionalPopupProps> = ({ onCouponSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCount, setShowCount] = useState(0);
  const [currentPopup, setCurrentPopup] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    // First popup after 30 seconds
    const firstTimeout = setTimeout(() => {
      setIsOpen(true);
      setShowCount(1);
      setCurrentPopup(1);
    }, 30000);

    return () => clearTimeout(firstTimeout);
  }, []);

  useEffect(() => {
    // Second popup after 30 seconds from the first one
    if (showCount === 1) {
      const secondTimeout = setTimeout(() => {
        setIsOpen(true);
        setShowCount(2);
        setCurrentPopup(2);
      }, 30000);

      return () => clearTimeout(secondTimeout);
    }
  }, [showCount]);

  useEffect(() => {
    // Third popup after 30 seconds from the second one
    if (showCount === 2) {
      const thirdTimeout = setTimeout(() => {
        setIsOpen(true);
        setShowCount(3);
        setCurrentPopup(3);
      }, 30000);

      return () => clearTimeout(thirdTimeout);
    }
  }, [showCount]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleUseCoupon = (coupon: string) => {
    onCouponSelect?.(coupon);
    setIsOpen(false);
  };

  const popup1Content = {
    title: "SPECIAL DISCOUNT OFFER! 🎮",
    discountText: "25% OFF",
    description: "Flat 25% off from the total session when coupon code 'CUEPHORIA25' is used in the checkout.",
    couponCode: "CUEPHORIA25",
    bgColor: "from-yellow-400 to-orange-400",
    iconColor: "text-yellow-400",
    icon: Star
  };

  const popup2Content = {
    title: "NIT TRICHY STUDENT SPECIAL! 🎓",
    discountText: "50% OFF",
    description: "Special offer for NIT Trichy students. Use code 'NIT50' to get 50% off from the bill.",
    couponCode: "NIT50",
    bgColor: "from-blue-400 to-purple-500",
    iconColor: "text-blue-400",
    icon: GraduationCap
  };

  // Check if current time is during happy hours (11 AM - 4 PM)
  const now = new Date();
  const currentHour = now.getHours();
  const isHappyHour = currentHour >= 11 && currentHour < 16;

  const popup3Content = {
    title: "HAPPY HOUR SPECIAL! ⏰",
    discountText: "₹99/HR",
    description: `Get PS5 & 8-Ball stations at just ₹99/hour during Happy Hours (11 AM - 4 PM)! Can be stacked with NIT50 for even better deals!`,
    couponCode: "HH99",
    bgColor: "from-green-400 to-teal-500",
    iconColor: "text-green-400",
    icon: Trophy,
    isHappyHour
  };

  const currentContent = currentPopup === 1 ? popup1Content : currentPopup === 2 ? popup2Content : popup3Content;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-gradient-to-br from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark border-2 border-yellow-400/50 text-white max-w-md animate-scale-in shadow-2xl shadow-yellow-400/20">
        <DialogHeader className="text-center space-y-4 pt-2">
          <div className="flex justify-center">
            <Badge className={`bg-gradient-to-r ${currentContent.bgColor} text-black font-bold text-lg px-4 py-2 animate-pulse`}>
              <currentContent.icon className="mr-2 h-5 w-5" />
              {currentContent.discountText}
            </Badge>
          </div>
          
          <DialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 animate-text-gradient">
            🔥 {currentContent.title} 🔥
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center px-2">
          <div className="space-y-2">
            <p className="text-lg font-semibold text-yellow-200">
              {currentContent.description}
            </p>
            
            {/* Happy Hour Indicator for HH99 */}
            {currentPopup === 3 && (
              <div className={`mt-2 p-3 rounded-lg border ${
                isHappyHour 
                  ? 'bg-green-900/40 border-green-400/50 text-green-200' 
                  : 'bg-orange-900/40 border-orange-400/50 text-orange-200'
              }`}>
                <div className="flex items-center justify-center gap-2">
                  {isHappyHour ? (
                    <>
                      <Clock className="h-4 w-4 text-green-400" />
                      <span className="font-semibold">✅ Happy Hours Active!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-orange-400" />
                      <span className="font-semibold">⏰ Outside Happy Hours (11 AM - 4 PM)</span>
                    </>
                  )}
                </div>
                <p className="text-sm mt-1">
                  {isHappyHour 
                    ? "Perfect timing! Apply this coupon now." 
                    : "You can still apply this coupon, but it will only work during Happy Hours."
                  }
                </p>
              </div>
            )}
            
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg border border-purple-400/30">
              <p className="text-sm text-purple-200 font-medium mb-2">
                💫 Coupon Code:
              </p>
              <div className="bg-black/30 rounded-lg px-4 py-2 border border-yellow-400/50">
                <p className="text-xl font-bold text-yellow-400 tracking-wider">
                  {currentContent.couponCode}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-red-400 font-medium">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Limited time offer!</span>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => handleUseCoupon(currentContent.couponCode)}
              className={`w-full bg-gradient-to-r ${currentContent.bgColor} hover:from-yellow-500 hover:to-orange-500 text-black font-bold py-3 text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-400/30`}
            >
              <Percent className="mr-2 h-5 w-5" />
              Use This Coupon
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
              className={`absolute w-2 h-2 ${currentContent.iconColor}/30 rounded-full animate-float`}
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

export default CouponPromotionalPopup;