import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Ticket, Loader2, ArrowLeft } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { usePermissions } from '@/context/PermissionsContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PromoCouponFormDialog from '@/components/coupons/PromoCouponFormDialog';
import {
  deletePromoCouponAdmin,
  fetchPromoCouponsAdmin,
  upsertPromoCouponAdmin,
} from '@/services/promoCouponService';
import type { PromoCoupon } from '@/types/promoCoupon.types';
import { MobilePageShell } from '@/components/mobile/MobilePageShell';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CouponManagement() {
  const { activeLocationId } = useLocation();
  const { can } = usePermissions();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<PromoCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCoupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canManage = can('coupons.manage') || can('bookings.coupons_manage');

  const load = useCallback(async () => {
    if (!activeLocationId || !canManage) {
      setCoupons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchPromoCouponsAdmin(activeLocationId);
      setCoupons(rows);
    } catch (err) {
      toast({
        title: 'Failed to load coupons',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeLocationId, canManage, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (coupon: Partial<PromoCoupon> & { code: string }) => {
    await upsertPromoCouponAdmin({
      ...coupon,
      locationId: coupon.locationId ?? activeLocationId,
    });
    toast({ title: 'Coupon saved' });
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePromoCouponAdmin(deleteId);
      toast({ title: 'Coupon deleted' });
      setDeleteId(null);
      await load();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (!canManage) {
    return (
      <MobilePageShell>
        <p className="p-6 text-muted-foreground">You do not have permission to manage coupons.</p>
      </MobilePageShell>
    );
  }

  return (
    <MobilePageShell>
      <MobilePageHeader
        title="Promo coupons"
        subtitle="Unified coupon rules for public booking, POS, and venue pay"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings?tab=booking">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Booking settings
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Configure eligibility, discounts, and channels in one place. Legacy booking-settings
            coupons are migrated automatically.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New coupon
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : coupons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No coupons yet. Create your first promo code.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span>{c.emoji ?? '🏷️'}</span>
                      <span className="font-mono">{c.code}</span>
                      {!c.enabled && <Badge variant="secondary">Disabled</Badge>}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    {c.discountType} {c.discountValue}
                    {c.discountType === 'percentage' ? '%' : c.discountType === 'flat_rate' ? '/hr' : '₹'}
                  </Badge>
                  <Badge variant="outline">{c.discountScope.replace(/_/g, ' ')}</Badge>
                  {c.channels.map((ch) => (
                    <Badge key={ch} variant="secondary">
                      {ch}
                    </Badge>
                  ))}
                  {c.stackable && <Badge variant="secondary">Stackable</Badge>}
                  {c.memberOnly && <Badge variant="secondary">Members</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PromoCouponFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        locationId={activeLocationId}
        onSave={handleSave}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Existing bookings are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
