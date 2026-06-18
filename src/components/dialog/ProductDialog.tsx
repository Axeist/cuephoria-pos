
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ProductForm, { ProductFormState } from '../product/ProductForm';
import { Product } from '@/types/pos.types';

interface ProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  selectedProduct: Product | null;
  onSubmit: (e: React.FormEvent, formData: ProductFormState) => void;
  isSubmitting: boolean;
}

const ProductDialog: React.FC<ProductDialogProps> = ({
  isOpen,
  onOpenChange,
  isEditMode,
  selectedProduct,
  onSubmit,
  isSubmitting
}) => {
  // Use a controlled open state to ensure proper dialog behavior
  const handleOpenChange = (open: boolean) => {
    // When dialog is closing, ensure we call the parent's onOpenChange
    onOpenChange(open);
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <ProductForm
          isEditMode={isEditMode}
          selectedProduct={selectedProduct}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProductDialog;
