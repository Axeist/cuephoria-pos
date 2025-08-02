import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Booking {
  id: string;
  customer: {
    name: string;
  };
}

interface BookingDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onBookingDeleted: () => void;
}

export function BookingDeleteDialog({ open, onOpenChange, booking, onBookingDeleted }: BookingDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      // First, delete any related booking_views records
      const { error: viewsError } = await supabase
        .from('booking_views')
        .delete()
        .eq('booking_id', booking.id);

      if (viewsError) {
        console.warn('Error deleting booking views:', viewsError);
        // Continue with booking deletion even if views deletion fails
      }

      // Then delete the booking
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking deleted successfully');
      onBookingDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the booking for {booking.customer.name}? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Booking'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}