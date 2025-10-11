import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ReceiptContainerProps {
  children: ReactNode;
  onClose?: () => void;
}

const ReceiptContainer: React.FC<ReceiptContainerProps> = ({ children, onClose }) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] animate-scale-in overflow-hidden relative flex flex-col">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors no-print"
            aria-label="Close receipt"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default ReceiptContainer;
