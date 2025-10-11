import React from 'react';
import { Bill } from '@/types/pos.types';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

interface ReceiptHeaderProps {
  bill: Bill;
}

const ReceiptHeader: React.FC<ReceiptHeaderProps> = ({ bill }) => {
  const billDate = new Date(bill.createdAt);
  const isComplimentary = bill.paymentMethod?.toLowerCase() === 'complimentary';
  
  return (
    <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
      {/* Company Logo/Name */}
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-[#6E59A5] mb-1" style={{ fontFamily: 'Arial Black, sans-serif' }}>
          CUEPHORIA
        </h1>
        <p className="text-sm text-gray-600 uppercase tracking-wider">
          Gaming Lounge & 8 Ball Club
        </p>
      </div>
      
      {/* Contact Information */}
      <div className="text-center space-y-1 text-xs text-gray-700 mb-4">
        <div className="flex items-center justify-center gap-1">
          <MapPin className="h-3 w-3" />
          <p>
            Roof Top, No.1, Shivani Complex, Vaithiyalingam St,<br />
            Muthu Nagar, Thiruverumbur, Tamil Nadu 620013
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>+91 86376 25155</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>+91 75500 25155</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-1">
          <Mail className="h-3 w-3" />
          <span>contact@cuephoria.in</span>
        </div>
        
        <div className="flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" />
          <span>11:00 AM - 11:00 PM, Every day</span>
        </div>
      </div>
      
      {/* Invoice Title */}
      <div className="text-center mb-3">
        <h2 className="text-2xl font-bold text-gray-800">
          {isComplimentary ? 'COMPLIMENTARY RECEIPT' : 'TAX INVOICE'}
        </h2>
      </div>
      
      {/* Bill Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-gray-600">Invoice No:</p>
          <p className="font-semibold font-mono">{bill.id.substring(0, 12).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-600">Date & Time:</p>
          <p className="font-semibold">
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
