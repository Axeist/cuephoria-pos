
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog, ResponsiveDialogContent } from '@/components/ui/responsive-dialog';
import ProductForm, { ProductFormState } from './ProductForm';
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
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };
  
  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      mobileVariant="fullscreen"
    >
      <ResponsiveDialogContent
        className="overflow-y-auto max-h-[90vh]"
        mobileClassName="px-4 pt-3"
      >
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default ProductDialog;
