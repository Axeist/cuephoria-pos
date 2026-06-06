import React, { useEffect, useMemo, useState } from 'react';
import { Product } from '@/types/pos.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Truck } from 'lucide-react';
import { getProductMaxStock, getRestockHeadroom } from '@/utils/productStock.utils';

interface RestockDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (product: Product, quantity: number, notes: string) => Promise<void>;
}

const RestockDialog: React.FC<RestockDialogProps> = ({
  product,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxStock = product ? getProductMaxStock(product) : null;
  const headroom = product ? getRestockHeadroom(product) : null;

  useEffect(() => {
    if (open) {
      setQuantity('1');
      setNotes('');
      setError(null);
    }
  }, [open, product?.id]);

  const parsedQty = parseInt(quantity, 10) || 0;
  const projectedStock = product ? product.stock + parsedQty : 0;

  const qtyError = useMemo(() => {
    if (!product) return null;
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return 'Enter a quantity greater than zero.';
    if (headroom !== null && parsedQty > headroom) {
      return headroom === 0
        ? 'This product is already at maximum capacity.'
        : `You can only add up to ${headroom} more units.`;
    }
    return null;
  }, [product, parsedQty, headroom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || qtyError) {
      setError(qtyError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(product, parsedQty, notes.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-500" />
            Restock Product
          </DialogTitle>
          <DialogDescription>
            Record incoming stock for <strong>{product?.name}</strong>. This is logged separately from manual stock adjustments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current stock</span>
              <span className="font-semibold">{product?.stock ?? 0}</span>
            </div>
            {maxStock !== null && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum capacity</span>
                  <span className="font-semibold">{maxStock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Can still add</span>
                  <span className="font-semibold">{headroom ?? 0}</span>
                </div>
              </>
            )}
            <div className="flex justify-between pt-1 border-t border-border/60">
              <span className="text-muted-foreground">After restock</span>
              <span className={`font-semibold ${qtyError ? 'text-destructive' : 'text-emerald-600'}`}>
                {projectedStock}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restock-qty">Quantity to add *</Label>
            <Input
              id="restock-qty"
              type="number"
              min={1}
              max={headroom ?? undefined}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter units received"
              required
              disabled={headroom === 0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restock-notes">Notes (optional)</Label>
            <Textarea
              id="restock-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Supplier, invoice, batch, etc."
              rows={3}
            />
          </div>

          {(error || qtyError) && <p className="text-sm text-destructive">{error || qtyError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !product || headroom === 0 || !!qtyError}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restocking...
                </>
              ) : (
                'Confirm Restock'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RestockDialog;
