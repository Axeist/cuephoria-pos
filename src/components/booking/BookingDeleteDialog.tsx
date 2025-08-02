import React, { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Trash2 } from 'lucide-react';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  station?: {
    name: string;
  };
  customer?: {
    name: string;
  };
}

interface BookingDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onDelete: () => void;
}

export const BookingDeleteDialog: React.FC<BookingDeleteDialogProps> = ({
  open,
  onOpenChange,
  booking,
  onDelete
}) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking deleted successfully');
      onDelete();
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
      <AlertDialogContent className="bg-gray-900 border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="h-5 w-5" />
            Delete Booking
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Are you sure you want to delete this booking? This action cannot be undone.
            
            <div className="mt-4 p-4 bg-black/30 rounded-lg border border-gray-700">
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Customer:</span> <span className="text-white">{booking.customer?.name}</span></div>
                <div><span className="text-gray-400">Station:</span> <span className="text-white">{booking.station?.name}</span></div>
                <div><span className="text-gray-400">Date:</span> <span className="text-white">{new Date(booking.booking_date).toLocaleDateString()}</span></div>
                <div><span className="text-gray-400">Time:</span> <span className="text-white">{booking.start_time} - {booking.end_time}</span></div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Deleting...' : 'Delete Booking'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};