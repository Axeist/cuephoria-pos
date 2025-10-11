import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, ArrowLeft } from 'lucide-react';

interface ReceiptActionsProps {
  onPrint: () => void;
  onDownload: () => void;
  onClose: () => void;
  isPrinting: boolean;
  isDownloading: boolean;
}

const ReceiptActions: React.FC<ReceiptActionsProps> = ({ 
  onPrint, 
  onDownload, 
  onClose, 
  isPrinting, 
  isDownloading 
}) => {
  return (
    <div className="bg-gray-100 p-4 flex flex-col gap-3 no-print">
      <div className="flex gap-3 justify-center">
        <Button 
          variant="outline" 
          onClick={onPrint}
          disabled={isPrinting}
          className="flex items-center gap-1 w-full hover:bg-gray-200 transition-colors"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Printing...' : 'Print Receipt'}
        </Button>
        <Button 
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center gap-1 w-full bg-cuephoria-purple hover:bg-cuephoria-purple/80 transition-colors"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </div>
      <Button 
        variant="ghost" 
        onClick={onClose}
        className="flex items-center gap-1 justify-center hover:bg-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to POS
      </Button>
    </div>
  );
};

export default ReceiptActions;
