import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Download, Share2, Copy, Calendar, Clock, MapPin, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BookingConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: {
    bookingId: string;
    customerName: string;
    stationNames: string[];
    date: string;
    startTime: string;
    endTime: string;
    totalAmount: number;
    couponCode?: string;
    discountAmount?: number;
  };
}

export default function BookingConfirmationDialog({ 
  isOpen, 
  onClose, 
  bookingData 
}: BookingConfirmationDialogProps) {
  const handleSaveScreenshot = () => {
    toast.success('Please take a screenshot of this confirmation for your records');
  };

  const handleShare = async () => {
    const shareText = `🎮 Booking Confirmed! 
Booking ID: ${bookingData.bookingId}
Customer: ${bookingData.customerName}
Stations: ${bookingData.stationNames.join(', ')}
Date: ${format(new Date(bookingData.date), 'EEEE, MMMM d, yyyy')}
Time: ${bookingData.startTime} - ${bookingData.endTime}
Total: ₹${bookingData.totalAmount}
${bookingData.couponCode ? `Coupon: ${bookingData.couponCode}` : ''}

🎯 Cuephoria Gaming Lounge`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cuephoria Booking Confirmation',
          text: shareText,
        });
      } catch (error) {
        // Fallback to copy
        navigator.clipboard.writeText(shareText);
        toast.success('Booking details copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Booking details copied to clipboard!');
    }
  };

  const handleCopyBookingId = () => {
    navigator.clipboard.writeText(bookingData.bookingId);
    toast.success('Booking ID copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border text-foreground">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
            Booking Confirmed!
          </DialogTitle>
        </DialogHeader>

        <Card className="bg-muted/20 border-border/50">
          <CardContent className="p-4 space-y-4">
            {/* Booking ID */}
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">Booking ID</p>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="bg-cuephoria-purple/20 border-cuephoria-purple text-cuephoria-purple px-3 py-1 font-mono text-sm">
                  {bookingData.bookingId}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyBookingId}
                  className="h-6 w-6 p-0 hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Booking Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cuephoria-blue" />
                <span className="text-sm text-gray-300">
                  {bookingData.stationNames.join(', ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cuephoria-lightpurple" />
                <span className="text-sm text-gray-300">
                  {format(new Date(bookingData.date), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cuephoria-orange" />
                <span className="text-sm text-gray-300">
                  {bookingData.startTime} - {bookingData.endTime}
                </span>
              </div>

              {bookingData.couponCode && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    {bookingData.couponCode} Applied
                  </span>
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            {/* Total Amount */}
            <div className="text-center">
              <p className="text-sm text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">
                ₹{bookingData.totalAmount}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Payment at venue
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleSaveScreenshot}
            className="w-full bg-cuephoria-purple/20 hover:bg-cuephoria-purple/30 border border-cuephoria-purple text-cuephoria-purple"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Save as Screenshot
          </Button>

          <Button
            onClick={handleShare}
            className="w-full bg-cuephoria-blue/20 hover:bg-cuephoria-blue/30 border border-cuephoria-blue text-cuephoria-blue"
            variant="outline"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Confirmation
          </Button>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:from-cuephoria-purple/90 hover:to-cuephoria-lightpurple/90"
          >
            Close
          </Button>
        </div>

        <p className="text-xs text-center text-gray-400">
          Please save this confirmation for your records. Show this at the reception when you arrive.
        </p>
      </DialogContent>
    </Dialog>
  );
}