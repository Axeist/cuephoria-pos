import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShoppingCart, X, User, Plus, Search, ArrowRight, Trash2, ReceiptIcon, Download, Check, Award, Gift, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePOS, Customer, Product, Bill } from '@/context/POSContext';
import { CurrencyDisplay, formatCurrency } from '@/components/ui/currency';
import CustomerCard from '@/components/CustomerCard';
import ProductCard from '@/components/ProductCard';
import Receipt from '@/components/Receipt';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import SplitPaymentForm from '@/components/checkout/SplitPaymentForm';
import { getCartInfo } from '@/utils/cartStorage';
import SavedCartsManager from '@/components/SavedCartsManager';
import { useIsMobile } from '@/hooks/use-mobile';

const POS = () => {
  const {
    products,
    customers,
    stations,
    cart,
    selectedCustomer,
    discount,
    discountType,
    loyaltyPointsUsed,
    isSplitPayment,
    setIsSplitPayment,
    cashAmount,
    setCashAmount,
    upiAmount,
    setUpiAmount,
    updateSplitAmounts,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    selectCustomer,
    setDiscount,
    setLoyaltyPointsUsed,
    calculateTotal,
    completeSale,
  } = usePOS();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState('all');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isCompDialogOpen, setIsCompDialogOpen] = useState(false);
  const [compNote, setCompNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'credit' | 'split'>('cash');
  const [customDiscountAmount, setCustomDiscountAmount] = useState(discount.toString());
  const [customDiscountType, setCustomDiscountType] = useState<'percentage' | 'fixed'>(discountType);
  const [customLoyaltyPoints, setCustomLoyaltyPoints] = useState(loyaltyPointsUsed.toString());
  const [lastCompletedBill, setLastCompletedBill] = useState<Bill | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCompletingSale, setIsCompletingSale] = useState(false);

  // Custom Date/Time States
  const [customBillDate, setCustomBillDate] = useState('');
  const [customBillTime, setCustomBillTime] = useState('');
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);

  // Initialize custom date/time when dialogs open
  useEffect(() => {
    if (isCheckoutDialogOpen || isCompDialogOpen) {
      const now = new Date();
      setCustomBillDate(now.toISOString().split('T')[0]);
      setCustomBillTime(now.toTimeString().slice(0, 5));
      setUseCustomDateTime(false);
    }
  }, [isCheckoutDialogOpen, isCompDialogOpen]);

  const productsWithStock = products.filter(product => 
    product.category === 'membership' || product.stock > 0
  );

  const categoryCounts = productsWithStock.reduce((acc, product) => {
    const category = product.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  categoryCounts.all = productsWithStock.length;

  const categoryOrder = ['food', 'drinks', 'tobacco', 'challenges', 'membership'];

  const getSortedProducts = (productList: Product[]) => {
    if (activeTab === 'all') {
      return productList.sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a.category);
        const bIndex = categoryOrder.indexOf(b.category);
        
        if (aIndex === bIndex) {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
        
        return aIndex - bIndex;
      });
    }
    return productList;
  };

  const filteredProducts = activeTab === 'all'
    ? getSortedProducts(productsWithStock)
    : productsWithStock.filter(product => product.category === activeTab);

  const searchedProducts = productSearchQuery.trim() === ''
    ? filteredProducts
    : filteredProducts.filter(product =>
        product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
      );

  const filteredCustomers = customerSearchQuery.trim() === ''
    ? customers
    : customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.phone.includes(customerSearchQuery)
      );

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateCartItem(id, newQuantity);
  };

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
  };

  const handleSelectCustomer = (customer: Customer) => {
    const cartInfo = getCartInfo(customer.id);
    
    selectCustomer(customer.id);
    setIsCustomerDialogOpen(false);
    
    if (cartInfo.hasCart) {
      toast({
        title: 'Cart Restored',
        description: `${customer.name}'s cart with ${cartInfo.itemCount} item(s) has been restored.`,
        variant: 'default',
        duration: 3000,
      });
    } else {
      toast({
        title: 'Customer Selected',
        description: `${customer.name} has been selected for this transaction.`,
        variant: 'default',
      });
    }
  };

  const handleApplyDiscount = () => {
    const amount = Number(customDiscountAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Invalid Discount',
        description: 'Please enter a valid discount amount',
        variant: 'destructive',
      });
      return;
    }
    setDiscount(amount, customDiscountType);
  };

  const handleApplyLoyaltyPoints = () => {
    const points = Number(customLoyaltyPoints);
    if (isNaN(points) || points < 0) {
      toast({
        title: 'Invalid Points',
        description: 'Please enter a valid number of loyalty points',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedCustomer && points > selectedCustomer.loyaltyPoints) {
      toast({
        title: 'Too Many Points',
        description: `Customer only has ${selectedCustomer.loyaltyPoints} points available`,
        variant: 'destructive',
      });
      return;
    }
    
    setLoyaltyPointsUsed(points);
  };

  const handlePaymentMethodChange = (value: 'cash' | 'upi' | 'credit' | 'split') => {
    setPaymentMethod(value);
    if (value === 'split') {
      setIsSplitPayment(true);
      
      const total = calculateTotal();
      const defaultCashAmount = Math.floor(total / 2);
      setCashAmount(defaultCashAmount);
      setUpiAmount(total - defaultCashAmount);
    } else {
      setIsSplitPayment(false);
    }
  };

  const handleCompleteSale = async () => {
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Please select a customer before completing the sale',
        variant: 'destructive',
      });
      return;
    }
    
    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to the cart before completing the sale',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCompletingSale(true);
    
    try {
      // Prepare custom timestamp if enabled
      let customTimestamp = undefined;
      if (useCustomDateTime && customBillDate && customBillTime) {
        customTimestamp = new Date(`${customBillDate}T${customBillTime}`);
      }
      
      console.log("Starting completeSale process...");
      const bill = await completeSale(paymentMethod, undefined, undefined, customTimestamp);
      console.log("CompleteSale returned:", bill);
      
      if (bill) {
        setIsCheckoutDialogOpen(false);
        setLastCompletedBill(bill);
        
        setShowSuccess(true);
        
        toast({
          title: 'Sale Completed',
          description: `Total: ${formatCurrency(bill.total)}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to complete the sale. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in handleCompleteSale:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while completing the sale',
        variant: 'destructive',
      });
    } finally {
      setIsCompletingSale(false);
    }
  };

  const handleComplimentary = async () => {
    if (!selectedCustomer) {
      toast({
        title: 'No Customer Selected',
        description: 'Please select a customer before marking as complimentary',
        variant: 'destructive',
      });
      return;
    }
    
    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to the cart',
        variant: 'destructive',
      });
      return;
    }

    setIsCompDialogOpen(true);
  };

  const handleConfirmComplimentary = async () => {
    setIsCompletingSale(true);
    
    try {
      // Prepare custom timestamp if enabled
      let customTimestamp = undefined;
      if (useCustomDateTime && customBillDate && customBillTime) {
        customTimestamp = new Date(`${customBillDate}T${customBillTime}`);
      }
      
      const bill = await completeSale('complimentary', 'complimentary', compNote, customTimestamp);
      
      if (bill) {
        setIsCompDialogOpen(false);
        setCompNote('');
        
        toast({
          title: 'Marked as Complimentary',
          description: `Items given free. Stock updated.`,
          variant: 'default',
        });
        
        clearCart();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to process complimentary transaction.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in handleConfirmComplimentary:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsCompletingSale(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  let discountValue = 0;
  if (discountType === 'percentage') {
    discountValue = subtotal * (discount / 100);
  } else {
    discountValue = discount;
  }
  const total = calculateTotal();

  return (
    <div className="flex-1 p-3 sm:p-6 md:p-8 pt-3 sm:pt-6">
      {/* Mobile-optimized header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 animate-slide-down">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight gradient-text font-heading">Point of Sale</h2>
      </div>

      {/* Mobile-optimized grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Cart Section - Mobile optimized */}
        <Card className={`lg:col-span-1 ${isMobile ? 'h-auto min-h-[300px]' : 'h-[calc(100vh-12rem)]'} flex flex-col animate-slide-up`}>
          <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-cuephoria-purple/20 to-transparent px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base sm:text-xl font-heading">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-2 text-cuephoria-lightpurple" />
                Cart
              </CardTitle>
              <Button 
                variant="ghost" 
                size={isMobile ? "sm" : "default"}
                onClick={clearCart}
                className="hover:text-red-500 transition-colors h-8 sm:h-10 px-2 sm:px-4 text-xs sm:text-sm"
              >
                Clear
              </Button>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {cart.length} {cart.length === 1 ? 'item' : 'items'} in cart
            </CardDescription>
          </CardHeader>
          <CardContent className={`flex-grow overflow-auto px-3 sm:px-6 ${isMobile ? 'max-h-[400px]' : ''}`}>
            {cart.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {cart.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between border-b pb-2 sm:pb-3 animate-fade-in ${isMobile ? 'grid grid-cols-[2fr_1fr] gap-2' : 'grid grid-cols-[2fr_1fr_1fr] gap-2'}`} 
                    style={{animationDelay: `${index * 50}ms`}}
                  >
                    <div className="flex flex-col justify-center">
                      <p className="font-medium font-quicksand truncate text-sm sm:text-base">{item.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground indian-rupee">
                        {item.price.toLocaleString('en-IN')} each
                      </p>
                    </div>
                    {!isMobile && (
                      <div className="flex items-center justify-center space-x-1.5 sm:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-6 sm:w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-col items-end gap-1">
                      {isMobile && (
                        <div className="flex items-center space-x-1 mb-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-[10px]"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-6 text-center text-xs">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 text-[10px]"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <div className="indian-rupee font-mono text-right text-sm sm:text-base">
                          {item.total.toLocaleString('en-IN')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-destructive hover:bg-red-500/10"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full animate-fade-in py-8">
                <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4 animate-pulse-soft" />
                <h3 className="text-lg sm:text-xl font-medium font-heading">Cart Empty</h3>
                <p className="text-muted-foreground mt-2 text-center text-xs sm:text-sm px-4">
                  Add products to the cart to begin
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-3 sm:pt-4 flex flex-col bg-gradient-to-r from-transparent to-cuephoria-purple/10 px-3 sm:px-6 pb-3 sm:pb-4">
            <div className="w-full text-sm sm:text-base">
              <div className="flex justify-between py-1">
                <span className="text-xs sm:text-sm">Subtotal</span>
                <CurrencyDisplay amount={subtotal} className="text-xs sm:text-base" />
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-cuephoria-purple">
                  <span className="text-xs sm:text-sm">
                    Discount {discountType === 'percentage' ? `(${discount}%)` : ''}
                  </span>
                  <CurrencyDisplay amount={discountValue} className="text-cuephoria-purple text-xs sm:text-base" />
                </div>
              )}
              {loyaltyPointsUsed > 0 && (
                <div className="flex justify-between py-1 text-cuephoria-orange">
                  <span className="text-xs sm:text-sm">Loyalty Points Used</span>
                  <CurrencyDisplay amount={loyaltyPointsUsed} className="text-cuephoria-orange text-xs sm:text-base" />
                </div>
              )}
              <div className="flex justify-between py-1 text-base sm:text-lg font-bold border-t mt-2 pt-2">
                <span>Total</span>
                <CurrencyDisplay amount={total} className="text-cuephoria-lightpurple" />
              </div>
            </div>
            
            {/* Mobile-optimized action buttons */}
            <div className="flex flex-col space-y-2 sm:space-y-3 w-full mt-3 sm:mt-4">
              <div className="flex space-x-2">
                <Button
                  variant={selectedCustomer ? "outline" : "default"}
                  size={isMobile ? "sm" : "default"}
                  className={`flex-1 btn-hover-effect ${selectedCustomer ? "" : "bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple"} h-10 sm:h-11 text-xs sm:text-sm rounded-lg`}
                  onClick={() => setIsCustomerDialogOpen(true)}
                >
                  <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="truncate">{selectedCustomer ? selectedCustomer.name : 'Select Customer'}</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="default"
                  size={isMobile ? "sm" : "default"}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 transition-all duration-300 active:scale-95 h-10 sm:h-11 text-xs sm:text-sm rounded-lg font-medium"
                  disabled={cart.length === 0 || !selectedCustomer}
                  onClick={() => setIsCheckoutDialogOpen(true)}
                >
                  <ReceiptIcon className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Checkout
                </Button>
                
                <Button 
                  variant="default"
                  size={isMobile ? "sm" : "default"}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 transition-all duration-300 active:scale-95 h-10 sm:h-11 text-xs sm:text-sm rounded-lg font-medium"
                  disabled={cart.length === 0 || !selectedCustomer}
                  onClick={handleComplimentary}
                >
                  <Gift className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Comp
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Products Section - Mobile optimized */}
        <Card className={`lg:col-span-2 ${isMobile ? 'h-auto min-h-[500px]' : 'h-[calc(100vh-12rem)]'} flex flex-col animate-slide-up delay-200`}>
          <CardHeader className="pb-2 sm:pb-3 bg-gradient-to-r from-transparent to-cuephoria-blue/10 flex-shrink-0 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-xl font-heading mb-2 sm:mb-3">Products</CardTitle>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="pl-8 font-quicksand h-9 sm:h-10 text-sm rounded-lg"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <div className="flex flex-col flex-grow min-h-0">
            <Tabs
              defaultValue="all"
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col flex-grow min-h-0 animate-scale-in"
            >
              {/* Mobile-optimized category tabs */}
              <div className="px-2 sm:px-3 md:px-6 bg-gradient-to-r from-cuephoria-purple/10 to-cuephoria-blue/10 flex-shrink-0">
                <TabsList className={`${isMobile ? 'flex w-full overflow-x-auto scrollbar-hide gap-1 mb-3 h-auto p-1' : 'grid w-full grid-cols-6 gap-1 mb-4 h-auto p-1'}`}>
                  <TabsTrigger
                    value="all"
                    className="text-[10px] sm:text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-cuephoria-purple data-[state=active]:text-white rounded-lg"
                  >
                    All ({categoryCounts.all || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="food"
                    className="text-[10px] sm:text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-cuephoria-orange data-[state=active]:text-white rounded-lg"
                  >
                    Food ({categoryCounts.food || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="drinks"
                    className="text-[10px] sm:text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-cuephoria-blue data-[state=active]:text-white rounded-lg"
                  >
                    Drinks ({categoryCounts.drinks || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="tobacco"
                    className="text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-red-500 data-[state=active]:text-white"
                  >
                    Tobacco ({categoryCounts.tobacco || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="challenges"
                    className="text-xs px-2 py-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-green-500 data-[state=active]:text-white"
                  >
                    Challenges ({categoryCounts.challenges || 0})
                  </TabsTrigger>
                  <TabsTrigger
                    value="membership"
                    className="text-xs px-1 py-2 whitespace-nowrap flex-shrink-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-1"
                  >
                    <Award className="h-3 w-3" />
                    Membership ({categoryCounts.membership || 0})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value={activeTab}
                className="flex-grow min-h-0 m-0 p-6 overflow-auto"
              >
                {searchedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                    {searchedProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className="animate-scale-in"
                        style={{ animationDelay: `${(index % 8) * 50}ms` }}
                      >
                        <ProductCard 
                          product={product} 
                          className="h-full flex flex-col"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                    <h3 className="text-xl font-medium font-heading">No Products Found</h3>
                    <p className="text-muted-foreground mt-2">
                      Try a different search or category
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>

      {/* SavedCartsManager */}
      <div className="mt-6">
        <SavedCartsManager />
      </div>

      {/* Customer Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Select Customer</DialogTitle>
            <DialogDescription>
              Choose a customer to start or resume their transaction
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-8 font-quicksand"
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-[60vh] overflow-auto">
            {filteredCustomers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer, index) => {
                  const cartInfo = getCartInfo(customer.id);
                  
                  return (
                    <div 
                      key={customer.id} 
                      className="relative animate-scale-in"
                      style={{animationDelay: `${(index % 6) * 100}ms`}}
                    >
                      {cartInfo.hasCart && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-cuephoria-orange to-cuephoria-lightpurple text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10 shadow-lg animate-pulse">
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span className="font-bold">{cartInfo.itemCount}</span>
                        </div>
                      )}
                      <CustomerCard
                        customer={customer}
                        isSelectable={true}
                        onSelect={handleSelectCustomer}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium font-heading">No Customers Found</h3>
                <p className="text-muted-foreground mt-2">
                  Try a different search or add a new customer
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Complimentary Dialog */}
      <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Gift className="h-5 w-5 text-orange-500" />
              Mark as Complimentary
            </DialogTitle>
            <DialogDescription>
              Items will be given for free. Stock will be reduced but no payment will be recorded.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedCustomer && (
              <div className="border border-orange-200 dark:border-orange-800 rounded-md p-3 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20 dark:to-transparent animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="font-medium">{selectedCustomer.name}</span>
                </div>
              </div>
            )}

            <div className="space-y-2 animate-slide-up delay-100">
              <Label htmlFor="comp-note" className="font-heading">
                Reason/Note (Optional)
              </Label>
              <Textarea
                id="comp-note"
                placeholder="e.g., Owner consumption, Friend - Raj, Staff meal, etc."
                value={compNote}
                onChange={(e) => setCompNote(e.target.value)}
                className="resize-none font-quicksand"
                rows={3}
              />
            </div>

            {/* Custom Date/Time Section for Complimentary */}
            <div className="space-y-3 border-t pt-3 animate-slide-up delay-200">
              <div className="flex items-center justify-between">
                <h4 className="font-medium font-heading flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Custom Bill Date/Time
                </h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="comp-use-custom-datetime"
                    checked={useCustomDateTime}
                    onCheckedChange={(checked) => setUseCustomDateTime(checked as boolean)}
                  />
                  <Label htmlFor="comp-use-custom-datetime" className="font-quicksand text-sm cursor-pointer">
                    Enable
                  </Label>
                </div>
              </div>
              
              {useCustomDateTime && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="comp-bill-date" className="text-sm font-quicksand">Date</Label>
                    <Input
                      id="comp-bill-date"
                      type="date"
                      value={customBillDate}
                      onChange={(e) => setCustomBillDate(e.target.value)}
                      className="font-quicksand"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-bill-time" className="text-sm font-quicksand">Time</Label>
                    <Input
                      id="comp-bill-time"
                      type="time"
                      value={customBillTime}
                      onChange={(e) => setCustomBillTime(e.target.value)}
                      className="font-quicksand"
                    />
                  </div>
                </div>
              )}
              
              {useCustomDateTime && customBillDate && customBillTime && (
                <p className="text-xs text-muted-foreground bg-orange-50 dark:bg-orange-950/20 p-2 rounded animate-fade-in flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Bill will be dated: {new Date(`${customBillDate}T${customBillTime}`).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              )}
            </div>

            <div className="border rounded-md p-3 bg-gradient-to-r from-cuephoria-purple/10 to-cuephoria-orange/10 animate-slide-up delay-300">
              <h4 className="font-medium mb-2 font-heading">Items</h4>
              <div className="space-y-1 max-h-32 overflow-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="font-quicksand">{item.name} x {item.quantity}</span>
                    <span className="font-mono font-semibold indian-rupee">
                      {item.total.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold border-t mt-2 pt-2">
                <span className="font-heading">Total Value</span>
                <CurrencyDisplay amount={total} className="text-orange-600" />
              </div>
            </div>
          </div>
          
          <DialogFooter className="animate-slide-up delay-400">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCompDialogOpen(false);
                setCompNote('');
              }}
              className="hover:bg-muted transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmComplimentary}
              disabled={isCompletingSale}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-90 transition-all duration-300"
            >
              <Gift className="mr-2 h-4 w-4" />
              {isCompletingSale ? 'Processing...' : 'Confirm Complimentary'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Complete Transaction</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {selectedCustomer && (
              <div className="border rounded-md p-3 bg-gradient-to-r from-cuephoria-purple/10 to-transparent animate-fade-in">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium flex items-center">
                      <User className="h-4 w-4 mr-2 text-cuephoria-lightpurple" /> {selectedCustomer.name}
                    </div>
                    <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                  </div>
                  {selectedCustomer.isMember && (
                    <div className="bg-cuephoria-purple text-white text-xs px-2 py-1 rounded">
                      Member
                    </div>
                  )}
                </div>
                <div className="mt-2 text-sm">
                  Available Points: <span className="font-semibold">{selectedCustomer.loyaltyPoints}</span>
                </div>
              </div>
            )}
            
            <div className="space-y-3 animate-slide-up delay-100">
              <h4 className="font-medium font-heading">Apply Discount</h4>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={customDiscountAmount}
                    onChange={(e) => setCustomDiscountAmount(e.target.value)}
                    placeholder="Discount amount"
                    className="font-quicksand"
                  />
                </div>
                <select
                  className="px-3 py-2 rounded-md border border-input bg-background font-quicksand"
                  value={customDiscountType}
                  onChange={(e) => setCustomDiscountType(e.target.value as 'percentage' | 'fixed')}
                >
                  <option value="percentage">%</option>
                  <option value="fixed">₹</option>
                </select>
                <Button 
                  onClick={handleApplyDiscount}
                  className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
                >
                  Apply
                </Button>
              </div>
            </div>
            
            {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
              <div className="space-y-3 animate-slide-up delay-200">
                <h4 className="font-medium font-heading">Use Loyalty Points</h4>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    value={customLoyaltyPoints}
                    onChange={(e) => setCustomLoyaltyPoints(e.target.value)}
                    placeholder="Points to use"
                    className="font-quicksand"
                  />
                  <Button 
                    onClick={handleApplyLoyaltyPoints}
                    className="bg-cuephoria-orange hover:bg-cuephoria-orange/80"
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customer has {selectedCustomer.loyaltyPoints} points (₹1 per point)
                </p>
              </div>
            )}
            
            <div className="border-t pt-4 mt-2 animate-slide-up delay-300">
              <div className="flex justify-between py-1">
                <span>Subtotal</span>
                <CurrencyDisplay amount={subtotal} />
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1 text-cuephoria-purple">
                  <span>
                    Discount {discountType === 'percentage' ? `(${discount}%)` : ''}
                  </span>
                  <CurrencyDisplay amount={discountValue} className="text-cuephoria-purple" />
                </div>
              )}
              {loyaltyPointsUsed > 0 && (
                <div className="flex justify-between py-1 text-cuephoria-orange">
                  <span>Loyalty Points Used</span>
                  <CurrencyDisplay amount={loyaltyPointsUsed} className="text-cuephoria-orange" />
                </div>
              )}
              <div className="flex justify-between py-1 text-lg font-bold border-t mt-2 pt-2">
                <span>Total</span>
                <CurrencyDisplay amount={total} className="text-cuephoria-lightpurple" />
              </div>
            </div>
            
            <div className="space-y-3 animate-slide-up delay-400">
              <h4 className="font-medium font-heading">Payment Method</h4>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => handlePaymentMethodChange(value as 'cash' | 'upi' | 'credit' | 'split')}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="font-quicksand">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="font-quicksand">UPI</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit" className="font-quicksand">Credit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="split" id="split" />
                  <Label htmlFor="split" className="font-quicksand">Split</Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === 'split' && (
              <div className="mt-4 animate-slide-up delay-450">
                <SplitPaymentForm 
                  total={total}
                  cashAmount={cashAmount}
                  upiAmount={upiAmount}
                  onCashAmountChange={setCashAmount}
                  onUpiAmountChange={setUpiAmount}
                />
              </div>
            )}

            {/* Custom Date/Time Section for Checkout */}
            <div className="space-y-3 border-t pt-4 animate-slide-up delay-500">
              <div className="flex items-center justify-between">
                <h4 className="font-medium font-heading flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cuephoria-purple" />
                  Custom Bill Date/Time
                </h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-custom-datetime"
                    checked={useCustomDateTime}
                    onCheckedChange={(checked) => setUseCustomDateTime(checked as boolean)}
                  />
                  <Label htmlFor="use-custom-datetime" className="font-quicksand text-sm cursor-pointer">
                    Enable
                  </Label>
                </div>
              </div>
              
              {useCustomDateTime && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="bill-date" className="text-sm font-quicksand">Date</Label>
                    <Input
                      id="bill-date"
                      type="date"
                      value={customBillDate}
                      onChange={(e) => setCustomBillDate(e.target.value)}
                      className="font-quicksand"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bill-time" className="text-sm font-quicksand">Time</Label>
                    <Input
                      id="bill-time"
                      type="time"
                      value={customBillTime}
                      onChange={(e) => setCustomBillTime(e.target.value)}
                      className="font-quicksand"
                    />
                  </div>
                </div>
              )}
              
              {useCustomDateTime && customBillDate && customBillTime && (
                <p className="text-xs text-muted-foreground bg-cuephoria-purple/10 p-2 rounded animate-fade-in flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Bill will be dated: {new Date(`${customBillDate}T${customBillTime}`).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter className="animate-slide-up delay-600">
            <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteSale} 
              disabled={isCompletingSale}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90"
            >
              {isCompletingSale ? 'Processing...' : `Complete Sale (${formatCurrency(total)})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog - UPDATED FOR FASTER LOADING */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md animate-scale-in text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading mb-2 flex items-center justify-center gap-2">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-4">
            <h3 className="text-2xl font-bold mb-2">Payment Successful!</h3>
            <DialogDescription className="text-center mb-4">
              Your transaction has been completed successfully.
            </DialogDescription>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg w-full mb-4">
              <p className="font-bold text-3xl mb-2 text-green-600">
                <CurrencyDisplay amount={lastCompletedBill?.total || 0} />
              </p>
              <p className="text-sm text-muted-foreground">
                {lastCompletedBill ? new Date(lastCompletedBill.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                }) : ''}
              </p>
            </div>
            
            <div className="flex flex-col gap-2 w-full">
              <Button 
                onClick={() => {
                  setShowSuccess(false);
                  // Small delay before showing receipt for better UX
                  setTimeout(() => {
                    setShowReceipt(true);
                  }, 100);
                }}
                className="w-full bg-cuephoria-purple hover:bg-cuephoria-purple/90"
              >
                <ReceiptIcon className="mr-2 h-4 w-4" />
                View Receipt
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setShowSuccess(false);
                  setLastCompletedBill(null);
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt */}
      {showReceipt && lastCompletedBill && selectedCustomer && (
        <Receipt 
          bill={lastCompletedBill} 
          customer={selectedCustomer} 
          onClose={() => setShowReceipt(false)} 
        />
      )}
    </div>
  );
};

export default POS;
