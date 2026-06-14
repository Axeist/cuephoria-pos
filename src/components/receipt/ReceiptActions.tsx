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
  isDownloading,
}) => {
  return (
    <div className="bg-[#0b0b12] border-t border-white/10 p-4 flex flex-col gap-3 no-print">
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onPrint}
          disabled={isPrinting}
          className="flex-1"
        >
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Printing...' : 'Print Receipt'}
        </Button>
        <Button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex-1 border-0"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </div>
      <Button variant="secondary" onClick={onClose} className="w-full">
        <ArrowLeft className="h-4 w-4" />
        Back to POS
      </Button>
    </div>
  );
};

export default ReceiptActions;
