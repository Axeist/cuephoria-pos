// src/pages/PublicPaymentFailed.tsx
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function PublicPaymentFailed() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-gray-200 p-6">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-xl font-bold mb-2">Payment Failed</h1>
        <p className="text-sm mb-4 text-gray-400">
          Your payment didn't go through. No booking was created.
        </p>
        
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">{decodeURIComponent(error)}</p>
          </div>
        )}
        
        {orderId && orderId !== 'unknown' && (
          <p className="text-xs text-gray-500 mb-4">
            Order ID: {orderId}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <Link 
            to="/public/booking" 
            className="inline-flex rounded-md bg-cuephoria-purple/80 hover:bg-cuephoria-purple px-4 py-2 text-white text-sm"
          >
            Try Again
          </Link>
          <Link 
            to="/public/booking" 
            className="inline-flex rounded-md border border-white/20 hover:bg-white/5 px-4 py-2 text-sm"
          >
            Pay at Venue
          </Link>
        </div>
      </div>
    </div>
  );
}
