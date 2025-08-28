// src/pages/PublicPaymentFailed.tsx
import { Link } from 'react-router-dom';

export default function PublicPaymentFailed() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-gray-200 p-6">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Payment Failed</h1>
        <p className="text-sm mb-6">
          Your payment didn’t go through. No booking was created. Please try again or choose “Pay at Venue”.
        </p>
        <Link to="/public/booking" className="inline-flex rounded-md bg-cuephoria-purple/80 hover:bg-cuephoria-purple px-4 py-2 text-white">
          Rebook
        </Link>
      </div>
    </div>
  );
}
