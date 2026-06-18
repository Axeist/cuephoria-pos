import React, { useState, useEffect } from 'react';
import { Bill, CartItem, Product } from '@/types/pos.types';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, Plus, Save, X, Search } from 'lucide-react';
import { usePOS } from '@/context/POSContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReceiptItemsProps {
  bill: Bill;
  onUpdateItems?: (items: CartItem[]) => void;
  editable?: boolean;
}

const ReceiptItems: React.FC<ReceiptItemsProps> = ({ bill, onUpdateItems, editable = false }) => {
  const { products, updateProduct } = usePOS();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>(bill.items);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  
  // Filter products based on search query
  const filteredProducts = products
    .filter(p => p.category !== 'membership' && p.stock > 0)
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setEditingItem({ ...items[index] });
  };

  const handleSaveItem = () => {
    if (editingItemIndex !== null && editingItem) {
      const updatedItems = [...items];
      // Recalculate total
      const updatedItem = {
        ...editingItem,
        total: editingItem.price * editingItem.quantity
      };
      updatedItems[editingItemIndex] = updatedItem;
      setItems(updatedItems);
      setEditingItemIndex(null);
      setEditingItem(null);
      
      if (onUpdateItems) {
        onUpdateItems(updatedItems);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingItemIndex(null);
    setEditingItem(null);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = [...items];
    const removedItem = updatedItems[index];
    
    // If this is a product with stock, we need to restore the stock
    if (removedItem.type === 'product') {
      const product = products.find(p => p.id === removedItem.id);
      if (product) {
        // Update the product stock (increase it back)
        updateProduct({
          ...product,
          stock: product.stock + removedItem.quantity
        });
      }
    }
    
    updatedItems.splice(index, 1);
    setItems(updatedItems);
    
    if (onUpdateItems) {
      onUpdateItems(updatedItems);
    }
  };
  
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setIsCommandOpen(false);
    
    // Auto-fill product information
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      setAvailableStock(selectedProduct.stock || 0);
      setSelectedProductName(selectedProduct.name);
      // Reset quantity to 1 when a new product is selected
      setNewItemQuantity(1);
    }
  };
  
  const handleAddItem = () => {
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
    
    // Use sellingPrice if available, otherwise fall back to price
    const finalPrice = selectedProduct.sellingPrice || selectedProduct.price;
    
    const itemToAdd: CartItem = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: finalPrice, // Use the selling price or fallback to regular price
      quantity: newItemQuantity,
      total: finalPrice * newItemQuantity,
      type: 'product',
      category: selectedProduct.category
    };
    
    const updatedItems = [...items, itemToAdd];
    setItems(updatedItems);
    
    // Update product stock
    updateProduct({
      ...selectedProduct,
      stock: selectedProduct.stock - newItemQuantity
    });
    
    // Reset form
    setSelectedProductId('');
    setSelectedProductName('');
    setNewItemQuantity(1);
    setSearchQuery('');
    setIsCommandOpen(false);
    setShowAddProductDialog(false);
    
    if (onUpdateItems) {
      onUpdateItems(updatedItems);
    }
  };

  // Reset fields when dialog opens
  const handleOpenAddDialog = () => {
    setSelectedProductId('');
    setSelectedProductName('');
    setNewItemQuantity(1);
    setSearchQuery('');
    setIsCommandOpen(false);
    setShowAddProductDialog(true);
  };

  if (!editable) {
    // Original read-only version
    return (
      <div className="space-y-1 mb-4">
        <div className="text-sm font-medium border-b pb-1 mb-2">Items</div>
        {items.map((item, index) => (
          <div key={index} className="receipt-item text-sm">
            <div>
              <span>{item.name}</span>
              {item.quantity > 1 && <span className="text-gray-600"> x{item.quantity}</span>}
            </div>
            <CurrencyDisplay amount={item.total} />
          </div>
        ))}
      </div>
    );
  }

  // Editable version with table
  return (
    <div className="space-y-3 mb-4">
      <div className="text-sm font-medium border-b pb-1 flex justify-between items-center">
        <span>Items</span>
        {editable && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs" 
            onClick={handleOpenAddDialog}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        )}
      </div>

      <Table className="border border-gray-700 rounded-md overflow-hidden">
        <TableHeader className="bg-gray-800">
          <TableRow>
            <TableHead className="text-xs font-medium text-gray-300">Item</TableHead>
            <TableHead className="text-xs font-medium text-gray-300 text-right">Price</TableHead>
            <TableHead className="text-xs font-medium text-gray-300 text-right">Qty</TableHead>
            <TableHead className="text-xs font-medium text-gray-300 text-right">Total</TableHead>
            {editable && <TableHead className="w-20"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={index} className="hover:bg-gray-700/50">
              {editingItemIndex === index ? (
                // Editing mode - only quantity can be edited
                <>
                  <TableCell>
                    <div className="font-medium">{editingItem?.name}</div>
                    <div className="text-xs text-gray-400">{editingItem?.category}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={editingItem?.price || 0} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-right"
                      value={editingItem?.quantity || 1}
                      min="1"
                      onChange={(e) => {
                        if (!editingItem) return;
                        const newQuantity = parseInt(e.target.value) || 1;
                        const product = products.find(p => p.id === editingItem.id);
                        
                        // Calculate max available quantity (current stock + current quantity in item)
                        const currentQuantityInItem = items[editingItemIndex].quantity;
                        const maxAvailable = (product?.stock || 0) + currentQuantityInItem;
                        
                        if (newQuantity > maxAvailable) {
                          toast({
                            title: "Insufficient Stock",
                            description: `Only ${maxAvailable} items available in stock`,
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        setEditingItem({...editingItem, quantity: newQuantity});
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={(editingItem?.price || 0) * (editingItem?.quantity || 1)} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleSaveItem}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCancelEdit}>
                      <X className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </>
              ) : (
                // View mode
                <>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-gray-400">{item.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><CurrencyDisplay amount={item.price} /></TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right"><CurrencyDisplay amount={item.total} /></TableCell>
                  {editable && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditItem(index)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemoveItem(index)}>
                        <Trash className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  )}
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Product Dialog */}
      <Dialog 
        open={showAddProductDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCommandOpen(false);
          }
          setShowAddProductDialog(open);
        }}
      >
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a product from your inventory to this transaction.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="product-select" className="text-sm font-medium">Select Product</label>
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="w-full justify-between bg-gray-700 border-gray-600 text-white"
                  onClick={() => setIsCommandOpen(!isCommandOpen)}
                >
                  {selectedProductName || "Choose a product"}
                  <span className="ml-auto opacity-70">
                    <Search className="h-4 w-4" />
                  </span>
                </Button>
                
                {isCommandOpen && (
                  <div className="absolute mt-1 w-full z-[10000] rounded-md border border-gray-700 bg-gray-800 shadow-lg">
                    <Command className="rounded-lg overflow-hidden">
                      <CommandInput 
                        placeholder="Search products..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        className="text-white"
                      />
                      <CommandList className="max-h-[300px] overflow-y-auto py-2">
                        <CommandEmpty className="py-6 text-center text-sm text-gray-400">
                          No products match your search
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.map(product => (
                            <CommandItem 
                              key={product.id} 
                              value={product.id}
                              onSelect={() => handleProductSelect(product.id)}
                              className={`py-2 ${selectedProductId === product.id ? 'bg-gray-600' : ''}`}
                            >
                              <div className="flex flex-col">
                                <span>{product.name}</span>
                                <span className="text-xs text-gray-400">
                                  Price: <CurrencyDisplay amount={product.price} /> | 
                                  Category: {product.category} | 
                                  Stock: {product.stock}
                                </span>
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
              <label htmlFor="item-quantity" className="text-sm font-medium">Quantity</label>
              <Input 
                id="item-quantity"
                type="number" 
                value={newItemQuantity} 
                onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                className="bg-gray-700 border-gray-600 text-white"
                min="1"
                max={availableStock}
              />
              {selectedProductId && (
                <p className="text-xs text-gray-400 mt-1">
                  Available stock: {availableStock}
                </p>
              )}
            </div>
            
            {selectedProductId && (
              <div className="border border-gray-700 rounded p-2 bg-gray-700/30 mt-2">
                <h5 className="text-xs font-medium mb-1">Selected Product</h5>
                {(() => {
                  const product = products.find(p => p.id === selectedProductId);
                  if (!product) return <p className="text-xs text-gray-400">Product not found</p>;
                  
                  // Calculate selling price and profit information
                  const sellingPrice = product.sellingPrice || product.price;
                  const profit = product.buyingPrice ? sellingPrice - product.buyingPrice : undefined;
                  const totalProfit = profit !== undefined ? profit * newItemQuantity : undefined;
                  
                  return (
                    <div className="space-y-1 text-xs">
                      <p><span className="text-gray-400">Name:</span> {product.name}</p>
                      <p><span className="text-gray-400">Price:</span> ₹{sellingPrice.toFixed(2)}</p>
                      <p><span className="text-gray-400">Category:</span> {product.category}</p>
                      <p><span className="text-gray-400">Stock:</span> {product.stock}</p>
                      <p><span className="text-gray-400">Total:</span> ₹{(sellingPrice * newItemQuantity).toFixed(2)}</p>
                      {profit !== undefined && (
                        <p><span className="text-gray-400">Profit/Unit:</span> <span className="text-green-400">₹{profit.toFixed(2)}</span></p>
                      )}
                      {totalProfit !== undefined && (
                        <p><span className="text-gray-400">Total Profit:</span> <span className="text-green-400">₹{totalProfit.toFixed(2)}</span></p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4 border-t border-gray-700 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCommandOpen(false);
                setShowAddProductDialog(false);
              }} 
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button 
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80 text-white"
              onClick={handleAddItem}
              disabled={!selectedProductId || newItemQuantity < 1 || newItemQuantity > availableStock}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceiptItems;
