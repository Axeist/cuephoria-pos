import React from 'react';
import { useLocation } from '@/context/LocationContext';

const ReceiptFooter: React.FC = () => {
  const { activeLocation } = useLocation();
  const isLite = activeLocation?.slug === 'lite';

  if (isLite) {
    return (
      <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-6 text-center receipt-footer">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-cyan-700 mb-1">Thank You for Visiting!</h3>
          <p className="text-xs text-gray-600">We hope you enjoyed your time at Cuephoria Lite</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 terms-section">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Terms &amp; Conditions:</h4>
          <ul className="text-[10px] text-gray-600 space-y-1 text-left">
            <li>• Goods once sold cannot be returned or exchanged</li>
            <li>• Please check the bill before leaving the counter</li>
            <li>• Gaming session charges are non-refundable</li>
            <li>• Management reserves the right to admission</li>
          </ul>
        </div>

        <div className="text-xs text-gray-600 mb-3">
          <p className="font-semibold mb-1">Cuephoria Lite</p>
          <p>
            Call: <span className="font-medium">+91 75500 25155</span>
          </p>
          <p className="mt-1">
            Visit: <span className="font-medium">www.cuephoria.in</span>
          </p>
        </div>

        <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-2">
          <p>For support: contact@cuephoria.in</p>
        </div>

        <div className="mt-3 text-center">
          <p className="text-lg font-bold text-cyan-700">★ ★ ★</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t-2 border-dashed border-gray-400 pt-4 mt-6 text-center receipt-footer">
      {/* Thank You Message */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-[#6E59A5] mb-1">
          Thank You for Visiting!
        </h3>
        <p className="text-xs text-gray-600">
          We hope you enjoyed your experience at Cuephoria
        </p>
      </div>
      
      {/* Terms & Conditions - With page-break protection */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 terms-section">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Terms & Conditions:</h4>
        <ul className="text-[10px] text-gray-600 space-y-1 text-left">
          <li>• Goods once sold cannot be returned or exchanged</li>
          <li>• Please check the bill before leaving the counter</li>
          <li>• Gaming session charges are non-refundable</li>
          <li>• Membership benefits are subject to terms and conditions</li>
          <li>• Management reserves the right to admission</li>
        </ul>
      </div>
      
      {/* Social Media & Contact */}
      <div className="text-xs text-gray-600 mb-3">
        <p className="font-semibold mb-1">Stay Connected!</p>
        <p>Follow us on Instagram & Facebook: <span className="font-medium">@cuephoriaclub</span></p>
        <p className="mt-1">Visit us: <span className="font-medium">www.cuephoria.in</span></p>
      </div>
      
      {/* Powered By */}
      <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-2">
        <p>Powered by Cuephoria Tech</p>
        <p className="mt-1">For support: contact@cuephoria.in</p>
      </div>
      
      {/* Decorative Bottom */}
      <div className="mt-3 text-center">
        <p className="text-lg font-bold text-[#6E59A5]">★ ★ ★</p>
      </div>
    </div>
  );
};

export default ReceiptFooter;
