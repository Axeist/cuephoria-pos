import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Gift, Tag, Clock, AlertCircle, User as UserIcon } from 'lucide-react';
import { usePOS, Customer } from '@/context/POSContext';
import { useToast } from '@/hooks/use-toast';
import { CurrencyDisplay } from '@/components/ui/currency';

interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId: string;
  stationName: string;
  baseRate: number;
  stationCategory?: string | null;
  slotDuration?: number | null;
  stationType?: 'ps5' | '8ball' | 'vr';
  onConfirm: (customerId: string, customerName: string, finalRate: number, couponCode?: string) => void;
}

const StartSessionDialog: React.FC<StartSessionDialogProps> = ({
  open,
  onOpenChange,
  stationId,
  stationName,
  baseRate,
  stationCategory,
  slotDuration,
  stationType,
  onConfirm,
}) => {
  const { customers } = usePOS();
  const { toast } = useToast();
  
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<string>('none');
  const [finalRate, setFinalRate] = useState(baseRate);
  
  // Helper to get rate label based on station type and category
  const getRateLabel = (): string => {
    if (stationCategory === 'nit_event') {
      if (slotDuration === 15) {
        return '15 Min Rate';
      } else if (slotDuration === 30) {
        return '30 Min Rate';
      }
    }
    if (stationType === 'vr') {
      return '15 Min Rate';
    }
    return 'Hourly Rate';
  };
  
  // Helper to get rate suffix
  const getRateSuffix = (): string => {
    if (stationCategory === 'nit_event') {
      if (slotDuration === 15) {
        return '/15mins';
      } else if (slotDuration === 30) {
        return '/30mins';
      }
    }
    if (stationType === 'vr') {
      return '/15mins';
    }
    return '/hour';
  };

  const filteredCustomers = customerSearchQuery.trim() === ''
    ? customers.slice(0, 10)
    : customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.phone.includes(customerSearchQuery)
      ).slice(0, 10);

  // Validate Happy Hour timing
  const isHappyHour = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentHour = now.getHours();
    return (dayOfWeek >= 1 && dayOfWeek <= 5) && (currentHour >= 11 && currentHour < 16);
  };

  // Calculate final rate based on coupon
  useEffect(() => {
    if (!selectedCoupon || selectedCoupon === 'none') {
      setFinalRate(baseRate);
      return;
    }

    let newRate = baseRate;

    switch (selectedCoupon) {
      case 'HH99':
        if (!isHappyHour()) {
          toast({
            title: 'Invalid Timing',
            description: 'HH99 is only valid Mon-Fri, 11 AM - 4 PM',
            variant: 'destructive',
          });
          setSelectedCoupon('none');
          return;
        }
        newRate = 99;
        break;
      
      case 'CUEPHORIA20':
        newRate = baseRate * 0.80;
        break;
      
      case 'CUEPHORIA35':
        newRate = baseRate * 0.65;
        break;
      
      case 'NIT35':
        newRate = baseRate * 0.65;
        break;
      
      case 'AAVEG50':
        newRate = baseRate * 0.50;
        break;
      
      case 'GAMEINSIDER50':
        newRate = baseRate * 0.50;
        break;
      
      case 'AXEIST':
        newRate = 0;
        break;
      
      default:
        newRate = baseRate;
    }

    setFinalRate(Math.round(newRate));
  }, [selectedCoupon, baseRate]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleConfirm = () => {
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Please select a customer to start the session',
        variant: 'destructive',
      });
      return;
    }

    onConfirm(
      selectedCustomer.id,
      selectedCustomer.name,
      finalRate,
      selectedCoupon !== 'none' ? selectedCoupon : undefined
    );
    
    // Reset state
    setSelectedCustomer(null);
    setSelectedCoupon('none');
    setCustomerSearchQuery('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedCustomer(null);
    setSelectedCoupon('none');
    setCustomerSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-cuephoria-purple" />
            Start Session - {stationName}
          </DialogTitle>
          <DialogDescription>
            Select customer and apply coupon if applicable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Select Customer
            </Label>
            
            {!selectedCustomer ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    className="pl-10"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto border rounded-lg p-2 bg-muted/20">
                  {filteredCustomers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full text-left p-3 rounded-md hover:bg-cuephoria-purple/10 border border-transparent hover:border-cuephoria-purple/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                            </div>
                            {customer.isMember && (
                              <span className="text-xs bg-cuephoria-purple/20 text-cuephoria-purple px-2 py-1 rounded-full">
                                Member
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No customers found</p>
                  )}
                </div>
              </>
            ) : (
              <div className="border rounded-lg p-4 bg-cuephoria-purple/5 border-cuephoria-purple/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-lg">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    {selectedCustomer.isMember && (
                      <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full mt-1 inline-block">
                        Member
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Coupon Selection */}
          {selectedCustomer && (
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Apply Coupon (Optional)
              </Label>
              
              <Select value={selectedCoupon} onValueChange={setSelectedCoupon}>
                <SelectTrigger>
                  <SelectValue placeholder="No coupon (regular price)" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="none">No coupon - Regular Price</SelectItem>
                  <SelectItem value="HH99">
                    🎮 HH99 - ₹99/hour (Mon-Fri 11AM-4PM)
                  </SelectItem>
                  <SelectItem value="CUEPHORIA20">
                    🎉 CUEPHORIA20 - 20% OFF
                  </SelectItem>
                  <SelectItem value="CUEPHORIA35">
                    🎓 CUEPHORIA35 - 35% OFF (Student ID Required)
                  </SelectItem>
                  <SelectItem value="NIT35">
                    🏫 NIT35 - 35% OFF (NIT Students)
                  </SelectItem>
                  <SelectItem value="AAVEG50">
                    🎓 AAVEG50 - 50% OFF (NIT College Freshers)
                  </SelectItem>
                  <SelectItem value="GAMEINSIDER50">
                    🎮 GAMEINSIDER50 - 50% OFF (GameInsider Enrollment Required)
                  </SelectItem>
                  <SelectItem value="AXEIST">
                    👑 AXEIST - 100% OFF (VIP)
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedCoupon === 'HH99' && !isHappyHour() && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Note:</strong> HH99 is only valid Mon-Fri, 11 AM - 4 PM. Currently outside Happy Hour.
                  </p>
                </div>
              )}

              {selectedCoupon !== 'none' && selectedCoupon === 'CUEPHORIA35' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Student ID verification required at checkout
                  </p>
                </div>
              )}

              {selectedCoupon !== 'none' && selectedCoupon === 'GAMEINSIDER50' && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Enrollment Verification Required:</strong> Verify customer's name/email against GameInsider enrollment list before applying discount.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Price Summary */}
          {selectedCustomer && (
            <div className="border rounded-lg p-4 bg-gradient-to-r from-cuephoria-purple/10 to-transparent">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Base {getRateLabel()}</span>
                  <div className="flex items-baseline gap-1">
                    <CurrencyDisplay amount={baseRate} className="text-sm" />
                    <span className="text-xs text-muted-foreground">{getRateSuffix()}</span>
                  </div>
                </div>
                
                {selectedCoupon !== 'none' && finalRate !== baseRate && (
                  <>
                    <div className="flex justify-between items-center text-cuephoria-orange">
                      <span className="text-sm">Discount ({selectedCoupon})</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-semibold">- ₹{baseRate - finalRate}</span>
                        <span className="text-xs text-muted-foreground">{getRateSuffix()}</span>
                      </div>
                    </div>
                    <div className="border-t pt-2" />
                  </>
                )}
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Final {getRateLabel()}</span>
                  <div className="flex items-baseline gap-1">
                    <CurrencyDisplay amount={finalRate} className="text-cuephoria-lightpurple text-xl" />
                    <span className="text-sm text-muted-foreground">{getRateSuffix()}</span>
                  </div>
                </div>

                {finalRate === 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 text-center mt-2">
                    🎉 This session is completely FREE!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCustomer}
            className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
          >
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartSessionDialog;
