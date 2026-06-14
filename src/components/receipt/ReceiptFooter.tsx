import React from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

const ReceiptFooter: React.FC = () => {
  const { settings } = useAppSettings();
  const { businessInfo, receiptSettings } = settings;
  const footerMessage =
    receiptSettings.footerMessage || 'Thank you for visiting!';

  return (
    <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-6 text-center receipt-footer">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-primary mb-1">{footerMessage}</h3>
        {businessInfo.name ? (
          <p className="text-xs text-gray-600">
            We hope you enjoyed your experience at {businessInfo.name}
          </p>
        ) : null}
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4 terms-section">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Terms &amp; Conditions:</h4>
        <ul className="text-[10px] text-gray-600 space-y-1 text-left">
          <li>• Goods once sold cannot be returned or exchanged</li>
          <li>• Please check the bill before leaving the counter</li>
          <li>• Gaming session charges are non-refundable</li>
          <li>• Membership benefits are subject to terms and conditions</li>
          <li>• Management reserves the right to admission</li>
        </ul>
      </div>

      {(businessInfo.phone || businessInfo.website || businessInfo.email) && (
        <div className="text-xs text-gray-600 mb-3">
          {businessInfo.name ? (
            <p className="font-semibold mb-1">{businessInfo.name}</p>
          ) : null}
          {businessInfo.phone ? (
            <p>
              Call: <span className="font-medium">{businessInfo.phone}</span>
            </p>
          ) : null}
          {businessInfo.website ? (
            <p className="mt-1">
              Visit: <span className="font-medium">{businessInfo.website}</span>
            </p>
          ) : null}
        </div>
      )}

      {businessInfo.email ? (
        <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-2">
          <p>For support: {businessInfo.email}</p>
        </div>
      ) : null}

      <div className="mt-3 text-center">
        <p className="text-lg font-bold text-primary">★ ★ ★</p>
      </div>
    </div>
  );
};

export default ReceiptFooter;
