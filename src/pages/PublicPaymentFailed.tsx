// src/pages/PublicPaymentFailed.tsx
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, XCircle, RefreshCw, Sparkles } from 'lucide-react';

export default function PublicPaymentFailed() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0b12] via-black to-[#0b0b12] flex items-center justify-center p-6">
      {/* Animated background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-24 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cuephoria-purple/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo Section */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 blur-xl animate-pulse"></div>
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria Logo"
              className="h-20 md:h-24 relative z-10 drop-shadow-[0_0_25px_rgba(239,68,68,0.3)] animate-float"
            />
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl animate-scale-in">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 animate-pulse"></div>
                <XCircle className="w-20 h-20 text-red-500 relative z-10 animate-scale-in" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400 animate-text-gradient">
            Payment Failed
          </h1>

          {/* Main Message */}
          <p className="text-gray-300 mb-6 text-base leading-relaxed">
            Your payment didn't go through. No booking was created.
          </p>

          {/* Error Details */}
          {error && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 text-left">{decodeURIComponent(error)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order ID */}
          {orderId && orderId !== 'unknown' && (
            <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Order ID</p>
              <p className="text-sm text-gray-300 font-mono">{orderId}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center mt-8">
            <Link 
              to="/public/booking" 
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90 px-6 py-3 text-white text-sm font-semibold transition-all duration-300 shadow-lg shadow-cuephoria-purple/30 hover:shadow-cuephoria-purple/50 hover:scale-105"
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              Try Again
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-2">Need help?</p>
            <p className="text-xs text-gray-400">
              Contact our support team or visit us at the venue to complete your booking.
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <Sparkles className="h-3 w-3 text-cuephoria-lightpurple/50" />
              Powered by Cuephoria Gaming Lounge
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
