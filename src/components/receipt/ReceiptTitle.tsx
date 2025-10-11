import React from 'react';
import { X } from 'lucide-react';

interface ReceiptTitleProps {
  onClose: () => void;
  date?: Date;
}

const ReceiptTitle: React.FC<ReceiptTitleProps> = ({ onClose, date }) => {
  const billDate = date ? new Date(date) : new Date();
  
  return (
    <div className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple p-4 text-white flex justify-between items-center no-print">
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
