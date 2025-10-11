import React, { ReactNode } from 'react';

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
        {children}
      </div>
    </div>
  );
};

export default ReceiptContainer;
