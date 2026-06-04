import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Percent, AlertCircle } from 'lucide-react';
import type { CouponPromoPopup, PublicBookingPopupConfig } from '@/types/publicBookingPopups';

interface CouponPromotionalPopupProps {
  config: PublicBookingPopupConfig;
  onCouponSelect?: (coupon: string) => void;
  blockWhenOpen?: boolean;
}

const CouponPromotionalPopup: React.FC<CouponPromotionalPopupProps> = ({
  config,
  onCouponSelect,
  blockWhenOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasScheduledRef = useRef(false);

  const popups = useMemo(
    () =>
      [...(config.coupon_popups ?? [])]
        .filter((p) => p.enabled && p.coupon_code.trim())
        .sort((a, b) => a.sort_order - b.sort_order),
    [config.coupon_popups],
  );

  const enabled = config.coupon_promo_enabled && popups.length > 0;

  useEffect(() => {
    if (blockWhenOpen && isOpen) setIsOpen(false);
  }, [blockWhenOpen, isOpen]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    hasScheduledRef.current = false;
    setActiveIndex(0);
    setIsOpen(false);

    if (!enabled || blockWhenOpen) return;

    let cumulativeMs = 0;
    popups.forEach((popup, idx) => {
      cumulativeMs += (popup.delay_seconds ?? 30) * 1000;
      const timer = setTimeout(() => {
        if (!blockWhenOpen) {
          setActiveIndex(idx);
          setIsOpen(true);
        }
      }, cumulativeMs);
      timersRef.current.push(timer);
    });
    hasScheduledRef.current = true;

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [enabled, blockWhenOpen, popups]);

  if (!enabled) return null;

  const current = popups[activeIndex];
  if (!current) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const hasHappyHour =
    current.happy_hour_start != null && current.happy_hour_end != null;
  const isHappyHour = hasHappyHour
    ? currentHour >= (current.happy_hour_start as number) &&
      currentHour < (current.happy_hour_end as number)
    : false;

  const handleClose = () => setIsOpen(false);

  const handleUseCoupon = (coupon: string) => {
    onCouponSelect?.(coupon);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} modal>
      <DialogContent
        className="bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12] border-2 border-primary/40 shadow-2xl text-white max-w-[90vw] sm:max-w-md overflow-hidden p-4 sm:p-6"
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          margin: 0,
        }}
      >
        <DialogHeader className="text-center space-y-2 sm:space-y-4 pt-1 sm:pt-2">
          {current.discount_label ? (
            <div className="flex justify-center">
              <Badge className="bg-primary/90 text-primary-foreground font-bold text-sm sm:text-lg px-4 sm:px-6 py-2 sm:py-3">
                {current.discount_label}
              </Badge>
            </div>
          ) : null}
          <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
            {current.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 text-center px-1 sm:px-2">
          <p className="text-sm sm:text-base text-gray-200">{current.description}</p>

          {hasHappyHour && (
            <div
              className={`p-2 sm:p-3 rounded-lg border ${
                isHappyHour
                  ? 'bg-green-900/40 border-green-400/50 text-green-200'
                  : 'bg-orange-900/40 border-orange-400/50 text-orange-200'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold">
                {isHappyHour ? (
                  <>
                    <Clock className="h-4 w-4" />
                    Active now ({current.happy_hour_start}:00–{current.happy_hour_end}:00)
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Outside window ({current.happy_hour_start}:00–{current.happy_hour_end}:00)
                  </>
                )}
              </div>
            </div>
          )}

          <div className="p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-muted-foreground mb-1.5">Coupon code</p>
            <p className="text-base sm:text-xl font-bold text-primary tracking-wider">
              {current.coupon_code}
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <Button
              onClick={() => handleUseCoupon(current.coupon_code)}
              className="w-full bg-primary hover:bg-primary/90 font-bold"
            >
              <Percent className="mr-2 h-5 w-5" />
              Use this coupon
            </Button>
            <Button onClick={handleClose} variant="outline" className="w-full border-white/20">
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CouponPromotionalPopup;
