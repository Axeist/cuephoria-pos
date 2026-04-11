import React from 'react';
import { X } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';

interface ReceiptTitleProps {
  onClose: () => void;
  date?: Date;
}

const ReceiptTitle: React.FC<ReceiptTitleProps> = ({ onClose, date }) => {
  const { activeLocation } = useLocation();
  const isLite = activeLocation?.slug === 'lite';
  const billDate = date ? new Date(date) : new Date();

  const barClass = isLite
    ? 'bg-gradient-to-r from-cyan-700 to-sky-600'
    : 'bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple';
  
  return (
    <div className={`${barClass} p-4 text-white flex justify-between items-center no-print`}>
      <div>
        <h2 className="text-xl font-bold font-heading">Payment Receipt</h2>
        {date && (
          <p className="text-xs text-white/80 mt-1">
            {billDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
            {' '}
            {billDate.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        )}
      </div>
      <button 
        onClick={onClose} 
        className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
        aria-label="Close receipt"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ReceiptTitle;
