import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Percent, GraduationCap, Sparkles, Trophy, AlertCircle, Instagram, Gift } from 'lucide-react';

interface CouponPromotionalPopupProps {
  onCouponSelect?: (coupon: string) => void;
  blockWhenOpen?: boolean; // Block showing when another popup is open
}

const CouponPromotionalPopup: React.FC<CouponPromotionalPopupProps> = ({ onCouponSelect, blockWhenOpen = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCount, setShowCount] = useState(0);
  const [currentPopup, setCurrentPopup] = useState<1 | 2 | 3 | 4>(4);
  const hasShownRef = useRef(false);

  // Effect to close popup when blocked
  useEffect(() => {
    if (blockWhenOpen && isOpen) {
      setIsOpen(false);
    }
  }, [blockWhenOpen, isOpen]);

  // Main effect to show OP15 popup first
  useEffect(() => {
    // Skip if already shown or blocked
    if (hasShownRef.current || blockWhenOpen) {
      return;
    }
    
    // Show OP15 popup after 2 seconds
    const timer = setTimeout(() => {
      if (!blockWhenOpen && !hasShownRef.current) {
        setIsOpen(true);
        setShowCount(1);
        setCurrentPopup(4); // OP15 popup first
        hasShownRef.current = true;
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [blockWhenOpen]);

  // Subsequent popups
  useEffect(() => {
    if (blockWhenOpen || showCount === 0) return;
    
    if (showCount === 1) {
      const timer = setTimeout(() => {
        if (!blockWhenOpen) {
          setIsOpen(true);
          setShowCount(2);
          setCurrentPopup(3); // HH99
        }
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [showCount, blockWhenOpen]);

  useEffect(() => {
    if (blockWhenOpen || showCount !== 2) return;
    
    const timer = setTimeout(() => {
      if (!blockWhenOpen) {
        setIsOpen(true);
        setShowCount(3);
        setCurrentPopup(1); // CUEPHORIA25
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [showCount, blockWhenOpen]);

  useEffect(() => {
    if (blockWhenOpen || showCount !== 3) return;
    
    const timer = setTimeout(() => {
      if (!blockWhenOpen) {
        setIsOpen(true);
        setShowCount(4);
        setCurrentPopup(2); // NIT50
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [showCount, blockWhenOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleUseCoupon = (coupon: string) => {
    onCouponSelect?.(coupon);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  // Debug: Log when popup should be visible
  useEffect(() => {
    if (isOpen) {
      console.log('CouponPromotionalPopup is open, currentPopup:', currentPopup);
    }
  }, [isOpen, currentPopup]);

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

  const popup4Content = {
    title: "🔥 EXCLUSIVE INSTAGRAM COLLAB! 🔥",
    discountText: "50% OFF + 15 MINS FREE",
    description: `🎮 Special collaboration with @ordinaryperson.official! 🎮\n\nGet 50% OFF on your booking + 15 minutes FREE gaming session!\n\n✨ Don't miss this exclusive influencer offer! ✨`,
    couponCode: "OP15",
    bgColor: "from-pink-500 via-purple-500 to-indigo-500",
    iconColor: "text-pink-400",
    icon: Instagram,
    instagramHandle: "ordinaryperson.official",
    instagramUrl: "https://www.instagram.com/ordinaryperson.official"
  };

  const currentContent = 
    currentPopup === 1 ? popup1Content : 
    currentPopup === 2 ? popup2Content : 
    currentPopup === 3 ? popup3Content : 
    popup4Content;

  // Special styling for OP15 popup
  const isOP15Popup = currentPopup === 4;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent className={`${
        isOP15Popup 
          ? 'bg-gradient-to-br from-pink-900/95 via-purple-900/95 to-indigo-900/95 border-4 border-pink-400 shadow-2xl shadow-pink-500/50' 
          : 'bg-gradient-to-br from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark border-2 border-yellow-400/50 shadow-2xl shadow-yellow-400/20'
      } text-white max-w-[90vw] sm:max-w-md animate-scale-in overflow-hidden p-4 sm:p-6 relative`}
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        margin: 0
      }}>
        {/* Special glow effect for OP15 */}
        {isOP15Popup && (
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 animate-pulse pointer-events-none" />
        )}
        
        <DialogHeader className="text-center space-y-2 sm:space-y-4 pt-1 sm:pt-2 relative z-10">
          <div className="flex justify-center">
            <Badge className={`bg-gradient-to-r ${currentContent.bgColor} ${
              isOP15Popup ? 'text-white shadow-lg shadow-pink-500/50 scale-110' : 'text-black'
            } font-bold text-sm sm:text-lg px-4 sm:px-6 py-2 sm:py-3 animate-pulse ${
              isOP15Popup ? 'ring-2 ring-pink-400 ring-offset-2 ring-offset-transparent' : ''
            }`}>
              <currentContent.icon className={`mr-1.5 sm:mr-2 h-5 w-5 sm:h-6 sm:w-6 ${isOP15Popup ? 'animate-spin-slow' : ''}`} />
              {currentContent.discountText}
            </Badge>
          </div>
          
          <DialogTitle className={`${
            isOP15Popup 
              ? 'text-xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 drop-shadow-lg' 
              : 'text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400'
          } text-center animate-text-gradient`}>
            {isOP15Popup ? (
              <span className="inline-block animate-bounce">
                🔥 {currentContent.title} 🔥
              </span>
            ) : (
              <>🔥 {currentContent.title} 🔥</>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 text-center px-1 sm:px-2 relative z-10">
          <div className="space-y-2">
            <p className={`${
              isOP15Popup 
                ? 'text-base sm:text-xl font-bold text-white leading-relaxed whitespace-pre-line' 
                : 'text-sm sm:text-lg font-semibold text-yellow-200'
            }`}>
              {currentContent.description}
            </p>
            
            {/* Happy Hour Indicator for HH99 */}
            {currentPopup === 3 && (
              <div className={`mt-2 p-2 sm:p-3 rounded-lg border ${
                isHappyHour 
                  ? 'bg-green-900/40 border-green-400/50 text-green-200' 
                  : 'bg-orange-900/40 border-orange-400/50 text-orange-200'
              }`}>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  {isHappyHour ? (
                    <>
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
                      <span className="text-xs sm:text-sm font-semibold">✅ Happy Hours Active!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
                      <span className="text-xs sm:text-sm font-semibold">⏰ Outside Happy Hours (11 AM - 4 PM)</span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm mt-1">
                  {isHappyHour 
                    ? "Perfect timing! Apply this coupon now." 
                    : "You can still apply this coupon, but it will only work during Happy Hours."
                  }
                </p>
              </div>
            )}

            {/* Instagram Branding for OP15 - Enhanced */}
            {currentPopup === 4 && popup4Content.instagramHandle && (
              <div className="mt-4 p-4 sm:p-5 rounded-xl border-2 bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-indigo-500/30 border-pink-400/80 text-white shadow-lg shadow-pink-500/30 backdrop-blur-sm animate-pulse-slow">
                <div className="flex flex-col items-center gap-3 mb-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Instagram className="h-6 w-6 sm:h-8 sm:w-8 text-pink-400 animate-pulse" />
                    <a 
                      href={popup4Content.instagramUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-lg sm:text-2xl font-extrabold text-pink-200 hover:text-white transition-all duration-300 underline decoration-2 hover:scale-110 inline-block"
                    >
                      @{popup4Content.instagramHandle}
                    </a>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm sm:text-base bg-purple-500/40 px-4 py-2 rounded-full">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 animate-spin-slow" />
                    <span className="font-bold text-yellow-200">Influencer Collaboration</span>
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 animate-spin-slow" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm sm:text-lg mb-3 bg-gradient-to-r from-purple-600/50 to-pink-600/50 px-4 py-3 rounded-lg border border-purple-300/50">
                  <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-300 animate-bounce" />
                  <span className="font-bold text-yellow-100">15 minutes FREE gaming session included! 🎁</span>
                </div>
                <p className="text-xs sm:text-sm text-center text-pink-100 font-medium">
                  ✨ Exclusive offer in collaboration with Ordinary Person ✨
                </p>
              </div>
            )}
            
            <div className={`mt-3 sm:mt-4 p-3 sm:p-4 ${
              isOP15Popup 
                ? 'bg-gradient-to-r from-purple-600/50 via-pink-600/50 to-indigo-600/50 rounded-xl border-2 border-pink-400/60 shadow-lg shadow-pink-500/20' 
                : 'bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg border border-purple-400/30'
            }`}>
              <p className={`text-xs sm:text-sm ${
                isOP15Popup ? 'text-white font-bold' : 'text-purple-200 font-medium'
              } mb-1.5 sm:mb-2`}>
                💫 Coupon Code:
              </p>
              <div className={`${
                isOP15Popup 
                  ? 'bg-black/50 rounded-xl px-4 sm:px-6 py-2 sm:py-3 border-2 border-pink-400/80 shadow-lg' 
                  : 'bg-black/30 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 border border-yellow-400/50'
              }`}>
                <p className={`${
                  isOP15Popup 
                    ? 'text-xl sm:text-3xl font-extrabold text-pink-300 tracking-widest animate-pulse' 
                    : 'text-base sm:text-xl font-bold text-yellow-400 tracking-wider'
                }`}>
                  {currentContent.couponCode}
                </p>
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-center gap-1.5 sm:gap-2 ${
            isOP15Popup ? 'text-yellow-300 font-bold' : 'text-red-400 font-medium'
          } text-xs sm:text-sm`}>
            <Clock className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isOP15Popup ? 'animate-spin' : 'animate-pulse'}`} />
            <span>{isOP15Popup ? '🔥 EXCLUSIVE LIMITED TIME OFFER! 🔥' : 'Limited time offer!'}</span>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Button
              onClick={() => handleUseCoupon(currentContent.couponCode)}
              className={`w-full bg-gradient-to-r ${currentContent.bgColor} ${
                isOP15Popup 
                  ? 'hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-extrabold shadow-lg shadow-pink-500/50 hover:shadow-pink-500/70' 
                  : 'hover:from-yellow-500 hover:to-orange-500 text-black font-bold'
              } py-3 sm:py-4 text-base sm:text-xl transition-all duration-300 hover:scale-110 ${
                isOP15Popup ? 'hover:shadow-2xl animate-pulse-slow' : 'hover:shadow-xl hover:shadow-yellow-400/30'
              }`}
            >
              <Percent className={`mr-2 h-5 w-5 sm:h-6 sm:w-6 ${isOP15Popup ? 'animate-bounce' : ''}`} />
              {isOP15Popup ? '🎮 CLAIM THIS OFFER NOW! 🎮' : 'Use This Coupon'}
            </Button>
            
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full border-cuephoria-grey/30 text-cuephoria-grey hover:bg-cuephoria-grey/10 hover:text-white py-2.5 sm:py-3 text-sm sm:text-base"
            >
              Maybe Later
            </Button>
          </div>
        </div>

        {/* Animated background elements - Enhanced for OP15 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(isOP15Popup ? 20 : 8)].map((_, i) => (
            <div
              key={i}
              className={`absolute ${
                isOP15Popup ? 'w-3 h-3' : 'w-2 h-2'
              } ${
                isOP15Popup 
                  ? i % 3 === 0 ? 'bg-pink-400/40' : i % 3 === 1 ? 'bg-purple-400/40' : 'bg-indigo-400/40'
                  : `${currentContent.iconColor}/30`
              } rounded-full animate-float`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${isOP15Popup ? 3 + Math.random() * 2 : 2 + Math.random() * 2}s`
              }}
            />
          ))}
          {/* Additional sparkle effects for OP15 */}
          {isOP15Popup && (
            <>
              {[...Array(10)].map((_, i) => {
                const randomLeft = Math.random() * 100;
                const randomTop = Math.random() * 100;
                return (
                  <div
                    key={`sparkle-${i}`}
                    className="absolute animate-ping"
                    style={{
                      left: `${randomLeft}%`,
                      top: `${randomTop}%`,
                      animationDelay: `${i * 0.4}s`,
                      animationDuration: `${2 + Math.random() * 1.5}s`
                    }}
                  >
                    <Sparkles 
                      className={`w-3 h-3 ${
                        i % 2 === 0 ? 'text-pink-400/60' : 'text-purple-400/60'
                      }`} 
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CouponPromotionalPopup;
