import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Trash2, Search, Edit2, Plus, X, Save, CreditCard, Wallet, Gift, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
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
  
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerCommandOpen, setIsCustomerCommandOpen] = useState<boolean>(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState<boolean>(false);
  
  // Safe filtering with null checks - ensure we always return an array
  const filteredProducts = React.useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    
    return products
      .filter(product => {
        if (!product) return false;
        
        // If no search query, show all available products
        if (!productSearchQuery.trim()) {
          return product.stock > 0 && product.category !== 'membership';
        }
        
        const query = productSearchQuery.toLowerCase().trim();
        const matchesSearch = (
          product.name?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
        
        return matchesSearch && product.stock > 0 && product.category !== 'membership';
      })
      .filter(Boolean); // Remove any null/undefined values
  }, [products, productSearchQuery]);
  
  // Real-time customer search from database
  useEffect(() => {
    const searchCustomers = async () => {
      if (!customerSearchQuery.trim()) {
        setCustomerSearchResults([]);
        setIsSearchingCustomers(false);
        return;
      }

      setIsSearchingCustomers(true);
      const query = customerSearchQuery.trim().toLowerCase();
      const normalizedSearchPhone = customerSearchQuery.replace(/\D/g, '');

      try {
        // Build multiple queries for different fields and combine results
        const searchPattern = `%${query}%`;
        const phonePattern = normalizedSearchPhone ? `%${normalizedSearchPhone}%` : '';
        
        // Execute parallel queries for each search field
        const queries = [
          supabase.from('customers').select('*').ilike('name', searchPattern).limit(50),
          normalizedSearchPhone ? supabase.from('customers').select('*').ilike('phone', phonePattern).limit(50) : null,
          supabase.from('customers').select('*').ilike('email', searchPattern).limit(50),
          supabase.from('customers').select('*').ilike('custom_id', searchPattern).limit(50)
        ].filter(Boolean) as Promise<any>[];

        const results = await Promise.all(queries);
        
        // Combine and deduplicate results by id
        const allResults: any[] = [];
        const seenIds = new Set<string>();
        
        results.forEach(({ data, error }) => {
          if (error) {
            console.error('Customer search query error:', error);
            return;
          }
          if (data && Array.isArray(data)) {
            data.forEach((customer: any) => {
              if (customer && !seenIds.has(customer.id)) {
                seenIds.add(customer.id);
                allResults.push(customer);
              }
            });
          }
        });

        // Transform database results to Customer format
        if (allResults.length > 0) {
          const transformedResults: Customer[] = allResults.map((customer: any) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            customerId: customer.custom_id || `CUE${customer.phone.slice(-4)}${Date.now().toString(36).slice(-4).toUpperCase()}`,
            isMember: customer.is_member || false,
            loyaltyPoints: customer.loyalty_points || 0,
            totalSpent: customer.total_spent || 0,
            totalPlayTime: customer.total_play_time || 0,
            createdAt: new Date(customer.created_at || customer.createdAt),
            membershipPlan: customer.membership_plan || undefined,
            membershipStartDate: customer.membership_start_date ? new Date(customer.membership_start_date) : undefined,
            membershipExpiryDate: customer.membership_expiry_date ? new Date(customer.membership_expiry_date) : undefined,
            membershipHoursLeft: customer.membership_hours_left || undefined
          }));
          setCustomerSearchResults(transformedResults);
        } else {
          setCustomerSearchResults([]);
        }
      } catch (err) {
        console.error('Error searching customers:', err);
        // Fallback to local search
        const localResults = (customers || []).filter(customer => {
          if (!customer) return false;
          const normalizedCustomerPhone = customer.phone?.replace(/\D/g, '') || '';
          return (
            customer.name?.toLowerCase().includes(query) ||
            normalizedCustomerPhone.includes(normalizedSearchPhone) ||
            customer.email?.toLowerCase().includes(query) ||
            customer.customerId?.toLowerCase().includes(query)
          );
        });
        setCustomerSearchResults(localResults);
      } finally {
        setIsSearchingCustomers(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchCustomers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery, customers]);
  
  // Use search results if there's a query, otherwise use all customers
  const filteredCustomers = customerSearchQuery.trim() ? customerSearchResults : (customers || []);
  
  const filteredBills = (bills || []).filter(bill => {
    if (!bill || !searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    if (bill.id?.toLowerCase().includes(query)) return true;
    
    const customer = (customers || []).find(c => c && c.id === bill.customerId);
    if (customer) {
      const customerName = customer.name?.toLowerCase() || '';
      const customerPhone = customer.phone?.toLowerCase() || '';
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
    // Validate products are available before opening
    if (!products || !Array.isArray(products)) {
      toast({
        title: "Error",
        description: "Products data is not available. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    
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
    
    if (!products || !Array.isArray(products)) {
      toast({
        title: "Error",
        description: "Products data is not available.",
        variant: "destructive"
      });
      return;
    }
    
    const selectedProduct = products.find(p => p && p.id === productId);
    if (selectedProduct) {
      const stock = selectedProduct.stock || 0;
      setAvailableStock(stock);
      setSelectedProductName(selectedProduct.name || 'Unknown Product');
      setNewItemQuantity(Math.min(1, stock));
    }
  };
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside product dropdown
      const productDropdown = target.closest('[data-product-dropdown]');
      const productInput = target.closest('input[placeholder*="Search products"]');
      
      // Check if click is outside customer dropdown
      const customerCombobox = target.closest('[role="combobox"]');
      const customerDropdown = target.closest('[cmdk-root]');
      
      if (!productDropdown && !productInput) {
        setIsCommandOpen(false);
      }
      
      if (!customerCombobox && !customerDropdown) {
        setIsCustomerCommandOpen(false);
      }
    };
    
    // Also close when dialog closes
    if (!isEditDialogOpen) {
      setIsCustomerCommandOpen(false);
    }
    if (!isAddItemDialogOpen) {
      setIsCommandOpen(false);
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditDialogOpen, isAddItemDialogOpen]);
  
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
    const foundCustomer = (customers || []).find(c => c && c.id === bill.customerId) || null;
    setEditingCustomer(foundCustomer);
    setCustomerSearchQuery(foundCustomer?.name || '');
    setIsEditing(true);
    
    console.log('RecentTransactions: All states set, opening dialog');
    
    // Open dialog after state updates (this fixes the issue)
    setTimeout(() => {
      setIsEditDialogOpen(true);
      console.log('RecentTransactions: Dialog opened');
    }, 0);
  };
  
  const handleCustomerSelect = (customerId: string) => {
    // First try to find in search results, then fallback to all customers
    const selectedCustomer = customerSearchResults.find(c => c && c.id === customerId) || 
                             (customers || []).find(c => c && c.id === customerId);
    if (selectedCustomer) {
      setEditingCustomer(selectedCustomer);
      setCustomerSearchQuery(selectedCustomer.name || '');
      setIsCustomerCommandOpen(false);
    } else {
      toast({
        title: "Error",
        description: "Customer not found. Please try searching again.",
        variant: "destructive"
      });
    }
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
    try {
      if (!selectedProductId) {
        toast({
          title: "Selection Required",
          description: "Please select a product from the list",
          variant: "destructive"
        });
        return;
      }
      
      if (!products || !Array.isArray(products)) {
        toast({
          title: "Error",
          description: "Products data is not available. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      const selectedProduct = products.find(p => p && p.id === selectedProductId);
      
      if (!selectedProduct) {
        toast({
          title: "Product Not Found",
          description: "The selected product could not be found",
          variant: "destructive"
        });
        return;
      }
      
      if (newItemQuantity <= 0 || !Number.isFinite(newItemQuantity)) {
        toast({
          title: "Invalid Quantity",
          description: "Quantity must be a valid number greater than zero",
          variant: "destructive"
        });
        return;
      }
      
      const currentStock = Number(selectedProduct.stock) || 0;
      const quantity = Number(newItemQuantity);
      
      if (quantity > currentStock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${currentStock} items available in stock`,
          variant: "destructive"
        });
        return;
      }
      
      const productPrice = Number(selectedProduct.price) || 0;
      const itemToAdd: CartItem = {
        id: selectedProduct.id,
        name: selectedProduct.name || 'Unknown Product',
        price: productPrice,
        quantity: quantity,
        total: productPrice * quantity,
        type: 'product',
        category: selectedProduct.category || 'other'
      };
      
      // Ensure editedItems is an array
      const currentItems = Array.isArray(editedItems) ? editedItems : [];
      setEditedItems([...currentItems, itemToAdd]);
      
      if (updateProduct) {
        updateProduct({
          ...selectedProduct,
          stock: currentStock - quantity
        });
      }
      
      // Reset form
      setSelectedProductId('');
      setSelectedProductName('');
      setNewItemQuantity(1);
      setAvailableStock(0);
      setProductSearchQuery('');
      setIsCommandOpen(false);
      setIsAddItemDialogOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
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
    if (!editingBill || !editingCustomer) {
      toast({
        title: "Validation Error",
        description: "Please select a customer before saving.",
        variant: "destructive"
      });
      return;
    }
    
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
        // Create updated bill with new customer if changed
        const billToUpdate = {
          ...editingBill,
          customerId: editingCustomer.id
        };
        
        const updatedBill = await updateBill(
          billToUpdate,
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
            description: `The transaction has been successfully updated${editingCustomer.id !== editingBill.customerId ? ' and customer changed' : ''}.`,
            variant: "default"
          });
          
          setIsEditing(false);
          setIsEditDialogOpen(false);
          setIsCustomerCommandOpen(false);
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
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl">Edit Transaction</DialogTitle>
            <DialogDescription className="text-gray-400">
              Modify transaction details including customer, products, discount, loyalty points, and payment method.
            </DialogDescription>
          </DialogHeader>
          
          {editingBill && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Header Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 mb-1">Bill ID</h3>
                  <p className="text-white text-xs font-mono break-all">{editingBill.id}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-xs font-semibold text-gray-400 mb-2">Customer</h3>
                  <div className="relative z-50">
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCustomerCommandOpen}
                      className="w-full justify-between bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-9"
                      onClick={() => setIsCustomerCommandOpen(!isCustomerCommandOpen)}
                    >
                      <span className="truncate">{editingCustomer?.name || "Select customer..."}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    
                    {isCustomerCommandOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-[10001]">
                        <Command className="rounded-lg border border-gray-600 bg-gray-800 text-white shadow-2xl">
                          <CommandInput 
                            placeholder="Search by name, phone, email, or ID..." 
                            value={customerSearchQuery}
                            onValueChange={setCustomerSearchQuery}
                            className="border-gray-600"
                          />
                          <CommandList className="max-h-60 overflow-y-auto">
                            {isSearchingCustomers ? (
                              <div className="py-4 text-center text-gray-400">
                                <div className="inline-block h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />
                                Searching...
                              </div>
                            ) : (
                              <>
                                <CommandEmpty>No customers found</CommandEmpty>
                                <CommandGroup>
                                  {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer) => {
                                      if (!customer || !customer.id) return null;
                                      return (
                                        <CommandItem
                                          key={customer.id}
                                          value={`${customer.name || ''} ${customer.phone || ''} ${customer.email || ''} ${customer.customerId || ''}`}
                                          onSelect={() => handleCustomerSelect(customer.id)}
                                          className="flex justify-between cursor-pointer hover:bg-gray-700 py-3 px-3"
                                        >
                                        <div className="flex flex-col flex-1 min-w-0">
                                          <span className="font-medium truncate">{customer.name}</span>
                                          <span className="text-xs text-gray-400 truncate">
                                            {customer.phone} {customer.email && `• ${customer.email}`}
                                          </span>
                                        </div>
                                        {customer.id === editingCustomer?.id && (
                                          <span className="text-xs text-purple-400 ml-2 flex-shrink-0">✓</span>
                                        )}
                                      </CommandItem>
                                    );
                                    }).filter(Boolean)
                                  ) : (
                                    <div className="py-4 text-center text-gray-400 text-sm">
                                      {customerSearchQuery.trim() ? 'No customers found' : 'Start typing to search...'}
                                    </div>
                                  )}
                                </CommandGroup>
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 mb-1">Date</h3>
                  <p className="text-white text-xs">
                    {new Date(editingBill.createdAt).toLocaleDateString()} 
                    {' '}
                    {new Date(editingBill.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              
              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-300">Items</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                    className="flex items-center gap-1 bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30"
                  onClick={handleOpenAddItemDialog}
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
              
                {editedItems.length === 0 ? (
                  <div className="border border-gray-700 rounded-md p-8 text-center bg-gray-800/30">
                    <p className="text-gray-400">No items in this transaction</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30"
                      onClick={handleOpenAddItemDialog}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add First Item
                    </Button>
                  </div>
                ) : (
              <div className="border border-gray-700 rounded-md overflow-hidden">
                    <div className="table-container overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader className="bg-gray-900">
                    <TableRow>
                            <TableHead className="text-gray-400 min-w-[150px] sm:min-w-[200px]">Name</TableHead>
                            <TableHead className="text-gray-400 w-[100px]">Type</TableHead>
                            <TableHead className="text-gray-400 w-[120px]">Price</TableHead>
                            <TableHead className="text-gray-400 w-[100px]">Quantity</TableHead>
                            <TableHead className="text-gray-400 w-[120px]">Total</TableHead>
                            <TableHead className="text-gray-400 w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedItems.map((item, index) => (
                            <TableRow key={index} className="border-gray-700 hover:bg-gray-800/50">
                              <TableCell className="p-2">
                          <Input 
                            value={item.name} 
                            onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                                  className="bg-gray-700 border-gray-600 text-white text-sm h-9"
                          />
                        </TableCell>
                              <TableCell className="p-2">
                          <Select 
                            value={item.type} 
                            onValueChange={(value) => handleUpdateItem(index, 'type', value as 'product' | 'session')}
                          >
                                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-9 text-sm">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700 text-white">
                              <SelectItem value="product">Product</SelectItem>
                              <SelectItem value="session">Session</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                              <TableCell className="p-2">
                          <Input 
                            type="number" 
                            value={item.price} 
                                  onChange={(e) => handleUpdateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                  className="bg-gray-700 border-gray-600 text-white text-sm h-9"
                                  min="0"
                                  step="0.01"
                          />
                        </TableCell>
                              <TableCell className="p-2">
                          <Input 
                            type="number" 
                            value={item.quantity} 
                                  onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="bg-gray-700 border-gray-600 text-white text-sm h-9"
                            min="1"
                          />
                        </TableCell>
                              <TableCell className="p-2 text-white font-medium">
                          <CurrencyDisplay amount={item.total} />
                        </TableCell>
                              <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
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
                  </div>
                )}
              </div>
              
              {/* Settings Section */}
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
              
              {/* Summary Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-gray-700 mt-4 bg-gray-800/30 p-4 rounded-lg">
                <div className="space-y-1">
                  <p className="text-gray-400 text-sm">
                    Subtotal: <span className="text-white font-medium">
                      <CurrencyDisplay amount={calculateUpdatedBill().subtotal} />
                    </span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    Discount ({editingDiscountType === 'percentage' ? `${editingDiscount}%` : 'fixed'}): 
                    <span className="text-white ml-1 font-medium">
                      <CurrencyDisplay amount={calculateUpdatedBill().discountValue} />
                    </span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    Points Used: <span className="text-white font-medium">{editingLoyaltyPointsUsed}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    Total: <CurrencyDisplay amount={calculateUpdatedBill().total} />
                  </p>
                </div>
              </div>
            </div>
          )}
              
          <DialogFooter className="flex-shrink-0 border-t border-gray-700 pt-4 mt-4">
                <Button
                  variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setIsCustomerCommandOpen(false);
              }}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isSaving || !editingCustomer}
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
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Transaction</DialogTitle>
            <DialogDescription className="text-gray-400">
              Search and select a product to add to this transaction
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product" className="text-white text-sm font-medium">Product</Label>
              <div className="relative z-40" data-product-dropdown>
                {!products || !Array.isArray(products) ? (
                  <div className="rounded-lg border border-gray-600 bg-gray-800 text-white p-4">
                    <p className="text-sm text-gray-400">Loading products...</p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search products by name or category..." 
                        value={productSearchQuery}
                        onChange={(e) => {
                          setProductSearchQuery(e.target.value);
                          setIsCommandOpen(true);
                        }}
                        onFocus={() => setIsCommandOpen(true)}
                        className="pl-9 bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    
                    {isCommandOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-hidden" data-product-dropdown>
                        <ScrollArea className="max-h-60">
                          {Array.isArray(filteredProducts) && filteredProducts.length > 0 ? (
                            <div className="p-1">
                              {filteredProducts
                                .filter((product): product is NonNullable<typeof product> => {
                                  return Boolean(product && product.id && product.name);
                                })
                                .map((product) => (
                                  <div
                                    key={product.id}
                                    onClick={() => {
                                      handleProductSelect(product.id);
                                      setIsCommandOpen(false);
                                    }}
                                    className="flex justify-between items-center cursor-pointer hover:bg-gray-700 py-3 px-3 rounded-md transition-colors"
                                  >
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="font-medium truncate text-white">{product.name}</span>
                                      <span className="text-xs text-gray-400 capitalize">{product.category || 'other'}</span>
                                    </div>
                                    <div className="text-right ml-4 flex-shrink-0">
                                      <span className="font-semibold text-purple-300 block"><CurrencyDisplay amount={product.price || 0} /></span>
                                      <span className="text-xs text-gray-400">Stock: {product.stock || 0}</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="py-4 text-center text-gray-400 text-sm">
                              {productSearchQuery.trim() ? 'No products found' : 'Start typing to search...'}
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedProductName && (
                <div className="mt-2 p-2 bg-purple-600/20 border border-purple-500/30 rounded text-sm">
                  <span className="text-purple-300">Selected: {selectedProductName}</span>
                </div>
              )}
            </div>
            
            {selectedProductId && (
            <div className="space-y-2">
                <Label htmlFor="quantity" className="text-white text-sm font-medium">Quantity</Label>
                <div className="flex items-center space-x-3">
                <Input
                  id="quantity"
                  type="number"
                  value={newItemQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setNewItemQuantity(Math.max(1, Math.min(val, availableStock)));
                    }}
                  className="bg-gray-700 border-gray-600 text-white"
                  min="1"
                  max={availableStock}
                />
                  <div className="flex flex-col">
                    <p className="text-xs text-gray-400">Available: <span className="text-white font-medium">{availableStock}</span></p>
                    {newItemQuantity > availableStock && (
                      <p className="text-xs text-red-400">Exceeds available stock</p>
                )}
              </div>
            </div>
                {availableStock > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-8"
                      disabled={newItemQuantity <= 1}
                    >
                      -
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewItemQuantity(Math.min(availableStock, newItemQuantity + 1))}
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 h-8"
                      disabled={newItemQuantity >= availableStock}
                    >
                      +
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddItemDialogOpen(false);
                setIsCommandOpen(false);
                setProductSearchQuery('');
                setSelectedProductId('');
                setSelectedProductName('');
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewItem}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!selectedProductId || newItemQuantity <= 0 || newItemQuantity > availableStock}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RecentTransactions;
