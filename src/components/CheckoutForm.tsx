
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { usePOS } from '@/context/POSContext';
import { CreditCard, Banknote, Smartphone, SplitSquareHorizontal } from 'lucide-react';
import SplitPaymentForm from '@/components/checkout/SplitPaymentForm';

interface CheckoutFormProps {
  onComplete: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onComplete }) => {
  const { 
    completeSale, 
    calculateTotal, 
    isSplitPayment, 
    setIsSplitPayment,
    cashAmount,
    upiAmount,
    setCashAmount,
    setUpiAmount
  } = usePOS();
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'credit'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const total = calculateTotal();

  const handlePaymentSubmit = async () => {
    setIsProcessing(true);
    try {
      const actualPaymentMethod = isSplitPayment ? 'split' : paymentMethod;
      await completeSale(actualPaymentMethod);
      onComplete();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplitPaymentToggle = (enabled: boolean) => {
    setIsSplitPayment(enabled);
    if (enabled) {
      // Initialize split amounts
      setCashAmount(Math.floor(total / 2));
      setUpiAmount(total - Math.floor(total / 2));
    } else {
      setCashAmount(0);
      setUpiAmount(0);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-center">
          Complete Payment
        </CardTitle>
        <div className="text-center text-2xl font-bold text-green-600">
          ₹{total.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSplitPayment ? (
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Payment Method:</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(value) => setPaymentMethod(value as 'cash' | 'upi' | 'credit')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Banknote className="h-5 w-5 text-green-600" />
                  <span>Cash Payment</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                  <span>UPI Payment</span>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit" className="flex items-center space-x-2 cursor-pointer flex-1">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                  <span>Credit Payment</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        ) : (
          <SplitPaymentForm 
            total={total}
            cashAmount={cashAmount}
            upiAmount={upiAmount}
            onCashAmountChange={setCashAmount}
            onUpiAmountChange={setUpiAmount}
          />
        )}

        <div className="space-y-3">
          <Button 
            variant="outline" 
            onClick={() => handleSplitPaymentToggle(!isSplitPayment)}
            className="w-full flex items-center gap-2"
          >
            <SplitSquareHorizontal className="h-4 w-4" />
            {isSplitPayment ? 'Use Single Payment' : 'Split Payment (Cash + UPI)'}
          </Button>

          <Button 
            onClick={handlePaymentSubmit}
            disabled={isProcessing || (isSplitPayment && (cashAmount + upiAmount !== total))}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : `Complete Payment ₹${total.toFixed(2)}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckoutForm;
