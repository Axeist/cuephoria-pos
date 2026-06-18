
import React, { useState } from 'react';
import { Bill, Customer } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Button } from '@/components/ui/button';
import { Pencil, Save, X } from 'lucide-react';

interface ReceiptSummaryProps {
  bill: Bill;
  customer?: Customer;
  onUpdateBill?: (updatedBill: Partial<Bill>) => void;
  editable?: boolean;
}

const ReceiptSummary: React.FC<ReceiptSummaryProps> = ({ 
  bill, 
  customer,
  onUpdateBill,
  editable = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    subtotal: bill.subtotal,
    discount: bill.discount,
    discountType: bill.discountType,
    loyaltyPointsUsed: bill.loyaltyPointsUsed,
    paymentMethod: bill.paymentMethod,
    isSplitPayment: bill.isSplitPayment || false,
    cashAmount: bill.cashAmount || 0,
    upiAmount: bill.upiAmount || 0
  });

  // Calculate loyalty points based on correct formula
  const calculateLoyaltyPoints = (total: number, isMember: boolean): number => {
    // Members: 5 points per ₹100 spent
    // Non-members: 2 points per ₹100 spent
    const pointsRate = isMember ? 5 : 2;
    return Math.floor((total / 100) * pointsRate);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditValues({
        subtotal: bill.subtotal,
        discount: bill.discount,
        discountType: bill.discountType,
        loyaltyPointsUsed: bill.loyaltyPointsUsed,
        paymentMethod: bill.paymentMethod,
        isSplitPayment: bill.isSplitPayment || false,
        cashAmount: bill.cashAmount || 0,
        upiAmount: bill.upiAmount || 0
      });
    }
  };

  const handleSaveChanges = () => {
    // Calculate the new discount value based on type
    let discountValue = 0;
    if (editValues.discountType === 'percentage') {
      discountValue = editValues.subtotal * (editValues.discount / 100);
    } else {
      discountValue = editValues.discount;
    }

    // Calculate new total
    const total = Math.max(0, editValues.subtotal - discountValue - editValues.loyaltyPointsUsed);

    // Determine final payment method and amounts based on split payment setting
    let finalPaymentMethod: 'cash' | 'upi' | 'split';
    let finalCashAmount = 0;
    let finalUpiAmount = 0;
    let finalIsSplitPayment = false;

    if (editValues.isSplitPayment) {
      // Validate split payment amounts
      const totalPayment = editValues.cashAmount + editValues.upiAmount;
      if (Math.abs(totalPayment - total) > 0.01) {
        alert(`Split payment amounts must sum to the total (₹${total}). Current sum: ₹${totalPayment}`);
        return;
      }
      
      finalPaymentMethod = 'split';
      finalCashAmount = editValues.cashAmount;
      finalUpiAmount = editValues.upiAmount;
      finalIsSplitPayment = true;
    } else {
      // Regular payment method - reset split amounts
      finalPaymentMethod = editValues.paymentMethod as 'cash' | 'upi';
      finalCashAmount = editValues.paymentMethod === 'cash' ? total : 0;
      finalUpiAmount = editValues.paymentMethod === 'upi' ? total : 0;
      finalIsSplitPayment = false;
    }

    // Calculate loyalty points earned using the corrected formula
    const loyaltyPointsEarned = calculateLoyaltyPoints(total, customer?.isMember || false);

    if (onUpdateBill) {
      onUpdateBill({
        subtotal: editValues.subtotal,
        discount: editValues.discount,
        discountType: editValues.discountType,
        discountValue,
        loyaltyPointsUsed: editValues.loyaltyPointsUsed,
        loyaltyPointsEarned,
        total,
        paymentMethod: finalPaymentMethod,
        isSplitPayment: finalIsSplitPayment,
        cashAmount: finalCashAmount,
        upiAmount: finalUpiAmount
      });
    }

    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setEditValues(prev => {
      const newValues = { ...prev, [field]: value };
      
      // Handle payment method changes
      if (field === 'paymentMethod') {
        // Reset split payment when changing regular payment method
        newValues.isSplitPayment = false;
        
        // Calculate current total for amount distribution
        let discountValue = 0;
        if (newValues.discountType === 'percentage') {
          discountValue = newValues.subtotal * (newValues.discount / 100);
        } else {
          discountValue = newValues.discount;
        }
        const currentTotal = Math.max(0, newValues.subtotal - discountValue - newValues.loyaltyPointsUsed);
        
        // Set amounts based on payment method
        if (value === 'cash') {
          newValues.cashAmount = currentTotal;
          newValues.upiAmount = 0;
        } else if (value === 'upi') {
          newValues.cashAmount = 0;
          newValues.upiAmount = currentTotal;
        }
      }
      
      // Handle split payment toggle
      if (field === 'isSplitPayment') {
        if (value === true) {
          // Calculate current total for 50/50 split
          let discountValue = 0;
          if (newValues.discountType === 'percentage') {
            discountValue = newValues.subtotal * (newValues.discount / 100);
          } else {
            discountValue = newValues.discount;
          }
          const currentTotal = Math.max(0, newValues.subtotal - discountValue - newValues.loyaltyPointsUsed);
          
          // Initialize with 50/50 split
          const defaultCash = Math.floor(currentTotal / 2);
          newValues.cashAmount = defaultCash;
          newValues.upiAmount = currentTotal - defaultCash;
          newValues.paymentMethod = 'split';
        } else {
          // Reset to single payment method
          newValues.paymentMethod = 'cash';
          
          // Calculate current total
          let discountValue = 0;
          if (newValues.discountType === 'percentage') {
            discountValue = newValues.subtotal * (newValues.discount / 100);
          } else {
            discountValue = newValues.discount;
          }
          const currentTotal = Math.max(0, newValues.subtotal - discountValue - newValues.loyaltyPointsUsed);
          
          newValues.cashAmount = currentTotal;
          newValues.upiAmount = 0;
        }
      }
      
      return newValues;
    });
  };

  // Calculate total during edit for validation
  const calculateEditTotal = () => {
    let discountValue = 0;
    if (editValues.discountType === 'percentage') {
      discountValue = editValues.subtotal * (editValues.discount / 100);
    } else {
      discountValue = editValues.discount;
    }
    return Math.max(0, editValues.subtotal - discountValue - editValues.loyaltyPointsUsed);
  };

  // Read-only view
  if (!editable || !isEditing) {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium">Payment Summary</div>
          {editable && !isEditing && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleEditToggle}>
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}
        </div>
        
        <div className="receipt-item">
          <span>Subtotal:</span>
          <CurrencyDisplay amount={bill.subtotal} />
        </div>
        
        {bill.discount > 0 && (
          <div className="receipt-item text-cuephoria-purple">
            <span>
              Discount {bill.discountType === 'percentage' ? `(${bill.discount}%)` : ''}:
            </span>
            <CurrencyDisplay amount={bill.discountValue} className="text-cuephoria-purple" />
          </div>
        )}
        
        {bill.loyaltyPointsUsed > 0 && (
          <div className="receipt-item text-cuephoria-orange">
            <span>Loyalty Points:</span>
            <CurrencyDisplay amount={bill.loyaltyPointsUsed} className="text-cuephoria-orange" />
          </div>
        )}
        
        <div className="receipt-total flex justify-between font-bold">
          <span>Total:</span>
          <CurrencyDisplay amount={bill.total} />
        </div>
        
        <div className="text-xs text-gray-600 mt-4">
          {bill.isSplitPayment ? (
            <div>
              <div>Payment Method: Split Payment</div>
              <div className="ml-2 mt-1">
                <div>Cash: <CurrencyDisplay amount={bill.cashAmount || 0} /></div>
                <div>UPI: <CurrencyDisplay amount={bill.upiAmount || 0} /></div>
              </div>
            </div>
          ) : (
            <div>Payment Method: {bill.paymentMethod.toUpperCase()}</div>
          )}
          
          {bill.loyaltyPointsEarned > 0 && (
            <div className="mt-1">Points Earned: {bill.loyaltyPointsEarned} 
              <span className="text-xs text-gray-500 ml-1">
                ({customer?.isMember ? '5 points' : '2 points'} per ₹100)
              </span>
            </div>
          )}
          
          {customer && (
            <div className="mt-1">
              <span className="text-xs">Available Points: {customer.loyaltyPoints}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Maximum points that can be used (either all available points or the subtotal)
  const maxLoyaltyPointsUsed = customer ? Math.min(customer.loyaltyPoints, Math.floor(editValues.subtotal)) : bill.loyaltyPointsUsed;
  
  const currentTotal = calculateEditTotal();

  // Editable view
  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Edit Payment Summary</div>
        <div className="space-x-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsEditing(false)}>
            <X className="h-3 w-3 mr-1" /> Cancel
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="h-7 px-2 text-xs bg-cuephoria-purple hover:bg-cuephoria-purple/80" 
            onClick={handleSaveChanges}
          >
            <Save className="h-3 w-3 mr-1" /> Save
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-800/30 p-3 rounded-md border border-gray-700 space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Subtotal</label>
          <input
            type="number"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            value={editValues.subtotal}
            onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value))}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Discount</label>
            <input
              type="number"
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              value={editValues.discount}
              onChange={(e) => handleInputChange('discount', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Discount Type</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              value={editValues.discountType}
              onChange={(e) => handleInputChange('discountType', e.target.value as 'percentage' | 'fixed')}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="text-xs text-gray-400 mb-1 flex justify-between">
            <span>Loyalty Points Used</span>
            {customer && (
              <span className="text-gray-400">Available: {customer.loyaltyPoints}</span>
            )}
          </label>
          <input
            type="number"
            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            value={editValues.loyaltyPointsUsed}
            max={maxLoyaltyPointsUsed}
            onChange={(e) => handleInputChange('loyaltyPointsUsed', parseInt(e.target.value))}
          />
        </div>
        
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="splitPayment"
              className="mr-2"
              checked={editValues.isSplitPayment}
              onChange={(e) => handleInputChange('isSplitPayment', e.target.checked)}
            />
            <label htmlFor="splitPayment" className="text-xs text-gray-400">Split Payment</label>
          </div>
          
          {editValues.isSplitPayment ? (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Cash Amount</label>
                <input
                  type="number"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={editValues.cashAmount}
                  onChange={(e) => handleInputChange('cashAmount', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">UPI Amount</label>
                <input
                  type="number"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={editValues.upiAmount}
                  onChange={(e) => {
                    const upiAmount = parseFloat(e.target.value);
                    // Auto-adjust cash amount to match total
                    const cashAmount = Math.max(0, currentTotal - upiAmount);
                    setEditValues(prev => ({
                      ...prev,
                      upiAmount,
                      cashAmount
                    }));
                  }}
                />
              </div>
              {Math.abs((editValues.cashAmount + editValues.upiAmount) - currentTotal) > 0.01 && (
                <div className="col-span-2 text-red-400 text-xs">
                  Split amounts must equal total: ₹{currentTotal.toFixed(2)}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Payment Method</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                value={editValues.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value as 'cash' | 'upi')}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="receipt-total flex justify-between font-bold mt-2">
        <span>New Total:</span>
        <CurrencyDisplay amount={currentTotal} />
      </div>
    </div>
  );
};

export default ReceiptSummary;
