import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Trash2, Search, Edit2, Plus, X, Save, CreditCard, Wallet, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePOS } from '@/context/POSContext';
import { CurrencyDisplay } from '@/components/ui/currency';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bill, CartItem, Customer } from '@/types/pos.types';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface RecentTransactionsProps {
  className?: string;
  bills: Bill[];
  customers: Customer[];
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ className, bills, customers }) => {
  const { 
    setBills, 
    setCustomers, 
    deleteBill, 
    products, 
    updateProduct, 
    updateCustomer,
    updateBill,
    stations
  } = usePOS();
  
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editedItems, setEditedItems] = useState<CartItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [availableStock, setAvailableStock] = useState<number>(0);
  
  const [editingDiscount, setEditingDiscount] = useState<number>(0);
  const [editingDiscountType, setEditingDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [editingLoyaltyPointsUsed, setEditingLoyaltyPointsUsed] = useState<number>(0);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<'cash' | 'upi' | 'split' | 'credit' | 'complimentary' | 'razorpay'>('cash');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  const [editingSplitPayment, setEditingSplitPayment] = useState<boolean>(false);
  const [editingCashAmount, setEditingCashAmount] = useState<number>(0);
  const [editingUpiAmount, setEditingUpiAmount] = useState<number>(0);
  
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  
  const filteredProducts = products.filter(product => {
    if (!productSearchQuery.trim()) return true;
    
    const query = productSearchQuery.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  }).filter(product => product.stock > 0);
  
  const filteredBills = bills.filter(bill => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    if (bill.id.toLowerCase().includes(query)) return true;
    
    const customer = customers.find(c => c.id === bill.customerId);
    if (customer) {
      const customerName = customer.name.toLowerCase();
      const customerPhone = customer.phone.toLowerCase();
      const customerEmail = customer.email?.toLowerCase() || '';
      
      return customerName.includes(query) || 
             customerPhone.includes(query) || 
             customerEmail.includes(query);
    }
    
    return false;
  });
  
  const sortedBills = [...filteredBills].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Calculate items per page based on active sessions count
  const activeSessionsCount = stations.filter(station => station.isOccupied && station.currentSession).length;
  const itemsPerPage = Math.max(activeSessionsCount, 5); // Minimum 5 items, or match active sessions
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBills = sortedBills.slice(startIndex, endIndex);
  
  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  // Reset to page 1 when active sessions count changes (items per page changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSessionsCount]);
  
  const getCurrentCustomerInfo = () => {
    if (!editingBill) return null;
    return customers.find(c => c.id === editingBill.customerId);
  };

  const currentCustomer = getCurrentCustomerInfo();
  
  const validateLoyaltyPoints = (value: number) => {
    if (!currentCustomer) return value;
    const maxPoints = currentCustomer.loyaltyPoints + (editingBill?.loyaltyPointsUsed || 0);
    return Math.min(value, maxPoints);
  };
  
  const handleOpenAddItemDialog = () => {
    setSelectedProductId('');
    setSelectedProductName('');
    setNewItemQuantity(1);
    setAvailableStock(0);
    setProductSearchQuery('');
    setIsCommandOpen(false);
    setIsAddItemDialogOpen(true);
  };
  
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setIsCommandOpen(false);
    
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      setAvailableStock(selectedProduct.stock || 0);
      setSelectedProductName(selectedProduct.name);
      setNewItemQuantity(1);
    }
  };
  
  const handleDeleteClick = (bill: Bill) => {
    setBillToDelete(bill);
    setIsConfirmOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!billToDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteBill(billToDelete.id, billToDelete.customerId);
      
      if (success) {
        setBillToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting bill:", error);
    } finally {
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };
  
  const handleEditClick = (bill: Bill) => {
    console.log('RecentTransactions: Edit clicked for bill:', bill.id);
    
    // Set all editing states first
    setEditingBill(bill);
    setEditedItems([...bill.items]);
    setEditingDiscount(bill.discount);
    setEditingDiscountType(bill.discountType);
    setEditingLoyaltyPointsUsed(bill.loyaltyPointsUsed);
    setEditingPaymentMethod(bill.paymentMethod);
    setEditingSplitPayment(bill.isSplitPayment || false);
    setEditingCashAmount(bill.cashAmount || 0);
    setEditingUpiAmount(bill.upiAmount || 0);
    setEditingCustomer(customers.find(c => c.id === bill.customerId) || null);
    setIsEditing(true);
    
    console.log('RecentTransactions: All states set, opening dialog');
    
    // Open dialog after state updates (this fixes the issue)
    setTimeout(() => {
      setIsEditDialogOpen(true);
      console.log('RecentTransactions: Dialog opened');
    }, 0);
  };
  
  const handleUpdateItem = (index: number, field: keyof CartItem, value: any) => {
    const updatedItems = [...editedItems];
    updatedItems[index] = { 
      ...updatedItems[index], 
      [field]: value 
    };
    
    if (field === 'price' || field === 'quantity') {
      updatedItems[index].total = updatedItems[index].price * updatedItems[index].quantity;
    }
    
    setEditedItems(updatedItems);
  };
  
  const handleRemoveItem = (index: number) => {
    const removedItem = editedItems[index];
    
    if (removedItem.type === 'product') {
      const product = products.find(p => p.id === removedItem.id);
      if (product) {
        updateProduct({
          ...product,
          stock: product.stock + removedItem.quantity
        });
      }
    }
    
    const updatedItems = [...editedItems];
    updatedItems.splice(index, 1);
    setEditedItems(updatedItems);
  };
  
  const handleLoyaltyPointsChange = (value: string) => {
    const points = parseInt(value) || 0;
    const validatedPoints = validateLoyaltyPoints(points);
    setEditingLoyaltyPointsUsed(validatedPoints);
    
    if (points > validatedPoints) {
      toast({
        title: "Maximum Points Exceeded",
        description: `You can only use up to ${currentCustomer?.loyaltyPoints + (editingBill?.loyaltyPointsUsed || 0)} points`,
        variant: "destructive"
      });
    }
  };
  
  const handleAddNewItem = () => {
    if (!selectedProductId) {
      toast({
        title: "Selection Required",
        description: "Please select a product from the list",
        variant: "destructive"
      });
      return;
    }
    
    const selectedProduct = products.find(p => p.id === selectedProductId);
    
    if (!selectedProduct) {
      toast({
        title: "Product Not Found",
        description: "The selected product could not be found",
        variant: "destructive"
      });
      return;
    }
    
    if (newItemQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be greater than zero",
        variant: "destructive"
      });
      return;
    }
    
    if (newItemQuantity > selectedProduct.stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${selectedProduct.stock} items available in stock`,
        variant: "destructive"
      });
      return;
    }
    
    const itemToAdd: CartItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      quantity: newItemQuantity,
      total: selectedProduct.price * newItemQuantity,
      type: 'product',
      category: selectedProduct.category
    };
    
    setEditedItems([...editedItems, itemToAdd]);
    
    updateProduct({
      ...selectedProduct,
      stock: selectedProduct.stock - newItemQuantity
    });
    
    setSelectedProductId('');
    setSelectedProductName('');
    setNewItemQuantity(1);
    setProductSearchQuery('');
    setIsCommandOpen(false);
    setIsAddItemDialogOpen(false);
  };
  
  const handlePaymentMethodChange = (value: 'cash' | 'upi' | 'split' | 'credit' | 'complimentary' | 'razorpay') => {
    setEditingPaymentMethod(value);
    
    if (value === 'split') {
      setEditingSplitPayment(true);
      const total = calculateUpdatedBill().total;
      if (editingCashAmount === 0 && editingUpiAmount === 0) {
        setEditingCashAmount(Math.floor(total / 2));
        setEditingUpiAmount(total - Math.floor(total / 2));
      }
    } else {
      setEditingSplitPayment(false);
    }
  };
  
  const handleSplitAmountChange = (type: 'cash' | 'upi', amount: number) => {
    const total = calculateUpdatedBill().total;
    
    if (type === 'cash') {
      setEditingCashAmount(amount);
      setEditingUpiAmount(Math.max(0, total - amount));
    } else {
      setEditingUpiAmount(amount);
      setEditingCashAmount(Math.max(0, total - amount));
    }
  };
  
  const calculateUpdatedBill = () => {
    if (!editingBill) return { subtotal: 0, discountValue: 0, total: 0 };
    
    const subtotal = editedItems.reduce((sum, item) => sum + item.total, 0);
    
    let discountValue = 0;
    if (editingDiscountType === 'percentage') {
      discountValue = subtotal * (editingDiscount / 100);
    } else {
      discountValue = editingDiscount;
    }
    
    const total = Math.max(0, subtotal - discountValue - editingLoyaltyPointsUsed);
    
    return { subtotal, discountValue, total };
  };
  
  const calculateLoyaltyPointsEarned = (total: number, isMember: boolean) => {
    const pointsRate = isMember ? 5 : 2;
    return Math.floor((total / 100) * pointsRate);
  };
  
  const handleSaveChanges = async () => {
    if (!editingBill || !editingCustomer) return;
    
    setIsSaving(true);
    
    try {
      const { subtotal, discountValue, total } = calculateUpdatedBill();
      
      if (editingSplitPayment) {
        const totalSplitAmount = editingCashAmount + editingUpiAmount;
        if (Math.abs(totalSplitAmount - total) > 0.01) {
          toast({
            title: "Invalid Split",
            description: `Split amounts (₹${totalSplitAmount.toFixed(2)}) don't match total (₹${total.toFixed(2)})`,
            variant: "destructive"
          });
          setIsSaving(false);
          return;
        }
      }
      
      if (updateBill) {
        const updatedBill = await updateBill(
          editingBill,
          editedItems,
          editingCustomer,
          editingDiscount,
          editingDiscountType,
          editingLoyaltyPointsUsed,
          editingSplitPayment,
          editingCashAmount,
          editingUpiAmount,
          editingPaymentMethod
        );
        
        if (updatedBill) {
          toast({
            title: "Transaction Updated",
            description: "The transaction has been successfully updated.",
            variant: "default"
          });
          
          setIsEditing(false);
          setIsEditDialogOpen(false);
        }
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update the transaction. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card className={`bg-[#1A1F2C] border-gray-700 shadow-xl h-full flex flex-col ${className}`}>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-xl font-bold text-white font-heading">Recent Transactions</CardTitle>
          <CardDescription className="text-gray-400">Latest sales and billing information</CardDescription>
        </div>
        <div className="relative flex w-full items-center">
          <Input
            placeholder="Search by ID, name, phone or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-8 bg-gray-800 border-gray-700 text-white"
          />
          <Search className="absolute right-2 h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
        {sortedBills.length > 0 ? (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {paginatedBills.map(bill => {
                const customer = customers.find(c => c.id === bill.customerId);
                const date = new Date(bill.createdAt);
                const isComplimentary = bill.paymentMethod === 'complimentary';
                const isRazorpay = bill.paymentMethod === 'razorpay';
                
                return (
                  <div 
                    key={bill.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isComplimentary 
                        ? 'bg-orange-950/20 border-orange-800/50' 
                        : isRazorpay
                        ? 'bg-indigo-950/20 border-indigo-800/50'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isComplimentary 
                          ? 'bg-orange-500/30' 
                          : isRazorpay
                          ? 'bg-indigo-500/30'
                          : 'bg-[#6E59A5]/30'
                      }`}>
                        {isComplimentary ? (
                          <Gift className="h-5 w-5 text-orange-400" />
                        ) : isRazorpay ? (
                          <CreditCard className="h-5 w-5 text-indigo-400" />
                        ) : (
                          <User className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{customer?.name || 'Unknown Customer'}</p>
                          {isComplimentary && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 text-xs px-2 py-0.5">
                              Comp
                            </Badge>
                          )}
                          {isRazorpay && (
                            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50 text-xs px-2 py-0.5">
                              Razorpay
                            </Badge>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <p className="text-xs text-gray-400">
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-xs text-gray-400">ID: {bill.id.substring(0, 8)}</p>
                        </div>
                        {isComplimentary && bill.compNote && (
                          <p className="text-xs text-orange-400 mt-1 italic">Note: {bill.compNote}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`font-semibold ${
                        isComplimentary ? 'text-orange-400' : isRazorpay ? 'text-indigo-400' : 'text-white'
                      }`}>
                        <CurrencyDisplay amount={bill.total} />
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          onClick={() => handleEditClick(bill)}
                          type="button"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => handleDeleteClick(bill)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            </ScrollArea>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedBills.length)} of {sortedBills.length} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm text-gray-400 px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center p-6 text-gray-400">
            <p>No transactions found</p>
          </div>
        )}
      </CardContent>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this transaction? This will revert the sale, 
              update inventory, and adjust customer loyalty points. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify transaction details including products, discount, loyalty points, and payment method.
            </DialogDescription>
          </DialogHeader>
          
          {editingBill && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400">Bill ID</h3>
                  <p className="text-white text-xs font-mono">{editingBill.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400">Customer</h3>
                  <p className="text-white">
                    {customers.find(c => c.id === editingBill.customerId)?.name || 'Unknown Customer'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400">Date</h3>
                  <p className="text-white">
                    {new Date(editingBill.createdAt).toLocaleDateString()} 
                    {' '}
                    {new Date(editingBill.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={handleOpenAddItemDialog}
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
              
              <div className="border border-gray-700 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-900">
                    <TableRow>
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Price</TableHead>
                      <TableHead className="text-gray-400">Quantity</TableHead>
                      <TableHead className="text-gray-400">Total</TableHead>
                      <TableHead className="text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedItems.map((item, index) => (
                      <TableRow key={index} className="border-gray-700">
                        <TableCell>
                          <Input 
                            value={item.name} 
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.type} 
                            onValueChange={(value) => handleUpdateItem(index, 'type', value as 'product' | 'session')}
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700 text-white">
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="session">Session</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.price} 
                            onChange={(e) => handleUpdateItem(index, 'price', parseFloat(e.target.value))}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value))}
                            className="bg-gray-700 border-gray-600 text-white"
                            min="1"
                          />
                        </TableCell>
                        <TableCell className="text-white">
                          <CurrencyDisplay amount={item.total} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-700 pt-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300">Discount</h3>
                  <div className="flex space-x-2">
                    <Input 
                      type="number" 
                      value={editingDiscount} 
                      onChange={(e) => setEditingDiscount(parseFloat(e.target.value))}
                      className="bg-gray-700 border-gray-600 text-white flex-1"
                      min="0"
                    />
                    <Select
                      value={editingDiscountType}
                      onValueChange={(value) => setEditingDiscountType(value as 'percentage' | 'fixed')}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-24">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">₹</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300">
                    Loyalty Points Used 
                    {currentCustomer && (
                      <span className="text-xs ml-2 text-cuephoria-orange">
                        (Available: {currentCustomer.loyaltyPoints + editingBill.loyaltyPointsUsed})
                      </span>
                    )}
                  </h3>
                  <Input 
                    type="number" 
                    value={editingLoyaltyPointsUsed} 
                    onChange={(e) => handleLoyaltyPointsChange(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    min="0"
                    max={currentCustomer ? currentCustomer.loyaltyPoints + editingBill.loyaltyPointsUsed : 0}
                  />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300">Payment Method</h3>
                  <RadioGroup 
                    value={editingPaymentMethod} 
                    onValueChange={(value) => handlePaymentMethodChange(value as 'cash' | 'upi' | 'split' | 'credit' | 'complimentary' | 'razorpay')}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" className="text-purple-400" />
                      <Label htmlFor="cash" className="flex items-center gap-1 cursor-pointer">
                        <Wallet className="h-4 w-4" /> Cash
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upi" id="upi" className="text-purple-400" />
                      <Label htmlFor="upi" className="flex items-center gap-1 cursor-pointer">
                        <CreditCard className="h-4 w-4" /> UPI
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="credit" id="credit" className="text-purple-400" />
                      <Label htmlFor="credit" className="flex items-center gap-1 cursor-pointer">
                        <CreditCard className="h-4 w-4" /> Credit
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="razorpay" id="razorpay" className="text-purple-400" />
                      <Label htmlFor="razorpay" className="flex items-center gap-1 cursor-pointer">
                        <CreditCard className="h-4 w-4" /> Razorpay
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="split" id="split" className="text-purple-400" />
                      <Label htmlFor="split" className="flex items-center gap-1 cursor-pointer">
                        <X className="h-4 w-4" /> Split
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {editingPaymentMethod === 'split' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/40 rounded-md border border-gray-700">
                  <div className="space-y-2">
                    <Label htmlFor="cashAmount" className="text-sm text-gray-300">Cash Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400">₹</span>
                      <Input 
                        id="cashAmount"
                        type="number" 
                        value={editingCashAmount} 
                        onChange={(e) => handleSplitAmountChange('cash', parseFloat(e.target.value) || 0)}
                        className="pl-7 bg-gray-700 border-gray-600 text-white"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upiAmount" className="text-sm text-gray-300">UPI Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400">₹</span>
                      <Input 
                        id="upiAmount"
                        type="number" 
                        value={editingUpiAmount} 
                        onChange={(e) => handleSplitAmountChange('upi', parseFloat(e.target.value) || 0)}
                        className="pl-7 bg-gray-700 border-gray-600 text-white"
                        min="0"
                      />
                    </div>
                  </div>
                  {Math.abs((editingCashAmount + editingUpiAmount) - calculateUpdatedBill().total) > 0.01 && (
                    <div className="col-span-2 text-red-400 text-xs">
                      Split amounts must equal total: ₹{calculateUpdatedBill().total.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between pt-4 border-t border-gray-700 mt-4">
                <div>
                  <p className="text-gray-400 text-sm">
                    Subtotal: <span className="text-white">
                      <CurrencyDisplay amount={calculateUpdatedBill().subtotal} />
                    </span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    Discount ({editingDiscountType === 'percentage' ? `${editingDiscount}%` : 'fixed'}): 
                    <span className="text-white ml-1">
                      <CurrencyDisplay amount={calculateUpdatedBill().discountValue} />
                    </span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    Points Used: <span className="text-white">{editingLoyaltyPointsUsed}</span>
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    Total: <CurrencyDisplay amount={calculateUpdatedBill().total} />
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>Saving Changes...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add Item to Transaction</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select a product to add to this transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product" className="text-white">Product</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isCommandOpen}
                  className="w-full justify-between bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  onClick={() => setIsCommandOpen(!isCommandOpen)}
                >
                  {selectedProductName || "Select product..."}
                </Button>
                
                {isCommandOpen && (
                  <div className="absolute top-full mt-2 w-full z-[10000]">
                    <Command className="rounded-lg border border-gray-600 bg-gray-800 text-white shadow-md">
                      <CommandInput 
                        placeholder="Search products..." 
                        value={productSearchQuery}
                        onValueChange={setProductSearchQuery}
                        className="border-gray-600"
                      />
                      <CommandList className="max-h-60">
                        <CommandEmpty>No products found</CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.id}
                              onSelect={() => handleProductSelect(product.id)}
                              className="flex justify-between cursor-pointer hover:bg-gray-700"
                            >
                              <div className="flex flex-col">
                                <span>{product.name}</span>
                                <span className="text-xs text-gray-400">{product.category}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold"><CurrencyDisplay amount={product.price} /></span>
                                <span className="text-xs text-gray-400 block">Stock: {product.stock}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-white">Quantity</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="quantity"
                  type="number"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="bg-gray-700 border-gray-600 text-white"
                  min="1"
                  max={availableStock}
                />
                {availableStock > 0 && (
                  <p className="text-xs text-gray-400">Available: {availableStock}</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAddItemDialogOpen(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewItem}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Add to Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RecentTransactions;
