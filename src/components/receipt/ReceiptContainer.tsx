import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ReceiptContainerProps {
  children: ReactNode;
  onClose?: () => void;
}

const ReceiptContainer: React.FC<ReceiptContainerProps> = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const overlay = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] animate-fade-in p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] animate-scale-in overflow-hidden relative flex flex-col">
        {children}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
};

export default ReceiptContainer;
