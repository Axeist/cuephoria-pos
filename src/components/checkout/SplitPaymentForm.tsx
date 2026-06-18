
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyDisplay } from "@/components/ui/currency";
import { toast } from "@/hooks/use-toast";

interface SplitPaymentFormProps {
  total: number;
  cashAmount: number;
  upiAmount: number;
  onCashAmountChange: (amount: number) => void;
  onUpiAmountChange: (amount: number) => void;
}

const SplitPaymentForm: React.FC<SplitPaymentFormProps> = ({
  total,
  cashAmount,
  upiAmount,
  onCashAmountChange,
  onUpiAmountChange,
}) => {
  
  // Handle cash amount change
  const handleCashChange = (value: number) => {
    if (value < 0) value = 0;
    if (value > total) value = total;
    
    onCashAmountChange(value);
    onUpiAmountChange(total - value);
  };
  
  // Handle UPI amount change
  const handleUPIChange = (value: number) => {
    if (value < 0) value = 0;
    if (value > total) value = total;
    
    onUpiAmountChange(value);
    onCashAmountChange(total - value);
  };
  
  const validateSplit = () => {
    const sum = cashAmount + upiAmount;
    return Math.abs(sum - total) <= 0.01;
  };
  
  const errorMessage = validateSplit() ? null : (
    <div className="text-red-500 text-sm">
      Split amounts must equal total of <CurrencyDisplay amount={total} />
    </div>
  );
  
  return (
    <div className="space-y-4 bg-muted/30 p-3 rounded-lg">
      <div className="flex justify-between">
        <span>Total Amount:</span>
        <CurrencyDisplay amount={total} className="font-bold" />
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="cashAmount">Cash Amount</Label>
          <Input 
            id="cashAmount"
            type="number"
            min={0}
            max={total}
            step={0.01}
            value={cashAmount}
            onChange={(e) => handleCashChange(parseFloat(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="upiAmount">UPI Amount</Label>
          <Input 
            id="upiAmount"
            type="number"
            min={0}
            max={total}
            step={0.01}
            value={upiAmount}
            onChange={(e) => handleUPIChange(parseFloat(e.target.value) || 0)}
          />
        </div>
        
        {errorMessage}
        
        <div className="flex justify-between text-sm">
          <Button 
            type="button" 
            size="sm" 
            variant="outline"
            onClick={() => {
              handleCashChange(total);
            }}
          >
            All Cash
          </Button>
          
          <Button 
            type="button" 
            size="sm" 
            variant="outline"
            onClick={() => {
              handleCashChange(Math.floor(total / 2));
            }}
          >
            50/50 Split
          </Button>
          
          <Button 
            type="button" 
            size="sm" 
            variant="outline"
            onClick={() => {
              handleUPIChange(total);
            }}
          >
            All UPI
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentForm;
