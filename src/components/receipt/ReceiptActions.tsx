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
    <div className="bg-muted/40 p-4 flex flex-col gap-3 no-print border-t">
      <div className="flex gap-3 justify-center">
        <Button 
          variant="outline"
          onClick={onPrint}
          disabled={isPrinting}
          className="flex items-center gap-1 w-full border-primary text-primary hover:bg-primary/10"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Printing...' : 'Print Receipt'}
        </Button>
        <Button 
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center gap-1 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </div>
      <Button 
        variant="outline"
        onClick={onClose}
        className="flex items-center gap-1 justify-center border-primary text-primary hover:bg-primary/10"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to POS
      </Button>
    </div>
  );
};

export default ReceiptActions;
