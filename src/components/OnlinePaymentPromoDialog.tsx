import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Gift, Zap, Clock, Gamepad2, Trophy, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnlinePaymentPromoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  serviceType: 'ps5' | '8ball' | null;
}

export default function OnlinePaymentPromoDialog({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  serviceType,
}: OnlinePaymentPromoDialogProps) {
  const getServiceInfo = () => {
    if (serviceType === 'ps5') {
      return {
        name: 'PS5',
        icon: Gamepad2,
        gradient: 'from-cuephoria-purple to-cuephoria-lightpurple',
        bgGradient: 'from-cuephoria-purple/20 to-cuephoria-lightpurple/20',
        borderColor: 'border-cuephoria-purple/50',
        textColor: 'text-cuephoria-purple',
      };
    } else if (serviceType === '8ball') {
      return {
        name: '8-Ball Pool',
        icon: Trophy,
        gradient: 'from-emerald-400 to-teal-500',
        bgGradient: 'from-emerald-400/20 to-teal-500/20',
        borderColor: 'border-emerald-400/50',
        textColor: 'text-emerald-300',
      };
    }
    return {
      name: 'Gaming Service',
      icon: Gamepad2,
      gradient: 'from-cuephoria-purple to-cuephoria-lightpurple',
      bgGradient: 'from-cuephoria-purple/20 to-cuephoria-lightpurple/20',
      borderColor: 'border-cuephoria-purple/50',
      textColor: 'text-cuephoria-purple',
    };
  };

  const serviceInfo = getServiceInfo();
  const ServiceIcon = serviceInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-cuephoria-dark via-cuephoria-darker to-cuephoria-dark border-2 border-cuephoria-purple/50 text-white max-w-md animate-scale-in shadow-2xl shadow-cuephoria-purple/30 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cuephoria-purple/20 blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-cuephoria-lightpurple/20 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cuephoria-blue/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <DialogHeader className="text-center space-y-4 pt-2 relative z-10">
          <div className="flex justify-center">
            <div className={cn(
              "relative p-4 rounded-full bg-gradient-to-r",
              serviceInfo.bgGradient,
              "border-2",
              serviceInfo.borderColor
            )}>
              <Gift className={cn("h-8 w-8", serviceInfo.textColor)} />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-cuephoria-purple to-cuephoria-lightpurple">
            🎁 Exclusive Offer! 🎁
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center px-2 relative z-10">
          <div className="space-y-4">
            {/* Shiny "Pay Online" Badge */}
            <div className="flex flex-col items-center justify-center w-full">
              <div className={cn(
                "relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl",
                "bg-gradient-to-r shadow-2xl border-2",
                serviceInfo.gradient,
                serviceInfo.borderColor,
                "transform transition-all duration-300",
                "overflow-hidden"
              )}>
                {/* Shine effect overlay */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer bg-[length:200%_100%]" />
                  {/* Additional shine layers for depth */}
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                </div>
                
                {/* Inner glow */}
                <div className="absolute inset-[2px] rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
                
                <CreditCard className={cn("h-5 w-5 relative z-10 drop-shadow-lg", "text-white")} />
                <span className={cn(
                  "text-xl font-bold uppercase tracking-wide relative z-10",
                  "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                )}>
                  Pay Online
                </span>
                
                {/* Sparkle effects */}
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse z-10 drop-shadow-lg" />
                <Sparkles className="absolute -bottom-1 -left-1 h-3 w-3 text-yellow-300 animate-pulse z-10 drop-shadow-lg" style={{ animationDelay: '0.5s' }} />
              </div>
              
              <p className="text-lg font-semibold text-white mt-5 mb-3">
                and get
              </p>
              
              <div className="flex items-center justify-center gap-2 text-gray-200">
                <ServiceIcon className={cn("h-5 w-5", serviceInfo.textColor)} />
                <span className={cn("text-lg font-semibold", serviceInfo.textColor)}>
                  {serviceInfo.name}
                </span>
              </div>
            </div>

            <div className="relative">
              <Badge className={cn(
                "bg-gradient-to-r text-white font-bold text-xl px-6 py-3 border-2",
                serviceInfo.gradient,
                serviceInfo.borderColor
              )}>
                <Clock className="h-5 w-5 mr-2" />
                15 Minutes FREE!
              </Badge>
              <div className="absolute -top-2 -right-2">
                <Zap className="h-5 w-5 text-yellow-400 animate-pulse" />
              </div>
            </div>

            <p className="text-base text-gray-300 font-medium leading-relaxed">
              That's right! Pay online now and we'll add <span className={cn("font-bold", serviceInfo.textColor)}>15 extra minutes</span> to your {serviceInfo.name} session. 
              <br />
              <span className="text-yellow-400">More gaming time = More fun! 🎮</span>
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={onAccept}
              className={cn(
                "w-full bg-gradient-to-r text-white font-bold py-3 text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl",
                serviceInfo.gradient,
                "hover:shadow-cuephoria-purple/30"
              )}
              size="lg"
            >
              <Zap className="mr-2 h-5 w-5" />
              Hell Yeah! 🚀
            </Button>
            
            <Button
              onClick={onDecline}
              variant="outline"
              className="w-full border-gray-500/50 text-gray-300 hover:bg-gray-800/50 hover:text-white hover:border-gray-400 transition-all duration-300"
              size="lg"
            >
              Nah, I don't need freebies 😎
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

