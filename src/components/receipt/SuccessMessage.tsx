import React, { useEffect, useState } from 'react';
import { Check, X, BadgeCheck, Clock } from 'lucide-react';

interface SuccessMessageProps {
  onClose: () => void;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ onClose }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time once when component mounts
    setCurrentTime(new Date());
  }, []);

  return (
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 flex items-center justify-between animate-fade-in shadow-lg no-print">
      <div className="flex items-center gap-3 flex-1">
        <div className="bg-white/20 rounded-full p-2 animate-pulse">
          <Check className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg">Transaction Successful!</span>
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2 text-xs text-white/90">
            <Clock className="h-3 w-3" />
            <span>
              {currentTime.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
              {' at '}
              {currentTime.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
          <p className="text-xs text-white/80 mt-1">
            Payment has been processed successfully. Receipt is ready for download.
          </p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="hover:bg-white/20 rounded-full p-2 transition-colors ml-2"
        aria-label="Close success message"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default SuccessMessage;
