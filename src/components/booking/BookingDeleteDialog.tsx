import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteViaAdminApi } from '@/services/adminRecordsApi';

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
  onBookingDeleted: (bookingId: string) => void;
}

export function BookingDeleteDialog({ open, onOpenChange, booking, onBookingDeleted }: BookingDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      const server = await deleteViaAdminApi({ type: 'booking', id: booking.id });
      if (!server.ok) {
        throw new Error(server.error || 'Could not delete booking on the server.');
      }
      toast.success('Booking deleted successfully');
      onBookingDeleted(booking.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete booking');
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
