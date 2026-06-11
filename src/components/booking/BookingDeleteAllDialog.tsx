import React, { useState } from 'react';
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
import { toast } from 'sonner';
import { deleteViaAdminApi } from '@/services/adminRecordsApi';
import { supabase } from '@/integrations/supabase/client';

interface BookingDeleteAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookings: Array<{ id: string; customer: { name: string } }>;
  onBookingsDeleted: (deletedIds: string[]) => void;
}

export function BookingDeleteAllDialog({
  open,
  onOpenChange,
  bookings,
  onBookingsDeleted,
}: BookingDeleteAllDialogProps) {
  const [loading, setLoading] = useState(false);

  const customerName = bookings[0]?.customer.name ?? 'this customer';
  const count = bookings.length;

  const handleDeleteAll = async () => {
    if (count === 0) return;

    setLoading(true);
    try {
      const ids = bookings.map((b) => b.id);
      const deletedIds: string[] = [];

      for (const id of ids) {
        const server = await deleteViaAdminApi({ type: 'booking', id });
        if (server.ok) {
          deletedIds.push(id);
          continue;
        }
        await supabase.from('booking_views').delete().eq('booking_id', id);
        const { data: row } = await supabase.from('bookings').delete().eq('id', id).select('id').maybeSingle();
        if (row?.id) deletedIds.push(row.id);
      }

      if (deletedIds.length === 0) {
        throw new Error('Bookings could not be deleted (no rows affected).');
      }

      if (deletedIds.length < ids.length) {
        toast.warning(`Deleted ${deletedIds.length} of ${ids.length} bookings`);
      } else {
        toast.success(`Deleted ${deletedIds.length} booking${deletedIds.length !== 1 ? 's' : ''}`);
      }

      onBookingsDeleted(deletedIds);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting bookings:', error);
      toast.error('Failed to delete bookings');
    } finally {
      setLoading(false);
    }
  };

  if (count === 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all bookings</AlertDialogTitle>
          <AlertDialogDescription>
            Delete all {count} booking{count !== 1 ? 's' : ''} for {customerName} in this group?
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAll}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : `Delete ${count} booking${count !== 1 ? 's' : ''}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
