import React from 'react';
import { Bill } from '@/types/pos.types';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';

interface ReceiptHeaderProps {
  bill: Bill;
}

const ReceiptHeader: React.FC<ReceiptHeaderProps> = ({ bill }) => {
  const { settings } = useAppSettings();
  const { businessInfo, receiptSettings } = settings;
  const billDate = new Date(bill.createdAt);
  const isComplimentary = bill.paymentMethod?.toLowerCase() === 'complimentary';
  const showGstin =
    receiptSettings.showGST &&
    (bill.gstinSnapshot || businessInfo.gstin);

  return (
    <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4 receipt-header">
      <div className="text-center mb-4">
        <h1
          className="text-4xl font-bold text-primary mb-1"
          style={{ fontFamily: 'Arial Black, sans-serif' }}
        >
          {businessInfo.name || 'Business Name'}
        </h1>
        {businessInfo.tagline ? (
          <p className="text-sm text-gray-600 uppercase tracking-wider">
            {businessInfo.tagline}
          </p>
        ) : null}
      </div>

      <div className="text-center space-y-1 text-xs text-gray-700 mb-4">
        {businessInfo.address ? (
          <div className="flex items-center justify-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <p>{businessInfo.address}</p>
          </div>
        ) : null}

        {businessInfo.phone ? (
          <div className="flex items-center justify-center gap-1 mt-2">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{businessInfo.phone}</span>
          </div>
        ) : null}

        {businessInfo.email ? (
          <div className="flex items-center justify-center gap-1">
            <Mail className="h-3 w-3 shrink-0" />
            <span>{businessInfo.email}</span>
          </div>
        ) : null}

        {businessInfo.businessHours ? (
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{businessInfo.businessHours}</span>
          </div>
        ) : null}

        {showGstin ? (
          <div className="mt-2 font-semibold">
            GSTIN: {bill.gstinSnapshot || businessInfo.gstin}
          </div>
        ) : null}
      </div>

      <div className="text-center mb-3">
        <h2 className="text-2xl font-bold text-gray-800">
          {isComplimentary ? 'COMPLIMENTARY RECEIPT' : 'TAX INVOICE'}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-600">Invoice No:</p>
          <p className="font-semibold font-mono">{bill.id.substring(0, 12).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-600">Date &amp; Time:</p>
          <p className="font-semibold">
            {billDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}{' '}
            {billDate.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </p>
        </div>
      </div>

      {isComplimentary && bill.compNote && (
        <div className="mt-3 bg-amber-50 border border-amber-300 rounded p-2">
          <p className="text-xs text-gray-600">Reason:</p>
          <p className="text-xs font-medium text-amber-800 italic">{bill.compNote}</p>
        </div>
      )}
    </div>
  );
};

export default ReceiptHeader;
