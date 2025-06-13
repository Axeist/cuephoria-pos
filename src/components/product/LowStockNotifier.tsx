
import React, { useEffect } from 'react';
import { Product } from '@/types/pos.types';
import { notificationService } from '@/services/notificationService';

interface LowStockNotifierProps {
  products: Product[];
}

const LowStockNotifier: React.FC<LowStockNotifierProps> = ({ products }) => {
  useEffect(() => {
    // Check for low stock products and send notifications
    const checkLowStock = async () => {
      const lowStockProducts = products.filter(product => 
        product.stock <= 2 && 
        product.stock > 0 &&
        product.category !== 'membership' &&
        product.category !== 'challenges'
      );

      const outOfStockProducts = products.filter(product => 
        product.stock === 0 &&
        product.category !== 'membership' &&
        product.category !== 'challenges'
      );

      // Send low stock notifications
      for (const product of lowStockProducts) {
        await notificationService.notifyLowStock(product.name, product.stock);
      }

      // Send out of stock notifications
      for (const product of outOfStockProducts) {
        await notificationService.notifyProductSoldOut(product.name);
      }
    };

    if (products.length > 0) {
      checkLowStock();
    }
  }, [products]);

  return null; // This component doesn't render anything
};

export default LowStockNotifier;
