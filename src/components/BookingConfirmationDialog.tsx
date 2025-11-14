import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Download, Share2, Copy, Calendar, Clock, MapPin, Tag, CreditCard, Receipt } from 'lucide-react';
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
    transactionFee?: number;
    totalWithFee?: number;
    couponCode?: string;
    discountAmount?: number;
    paymentMode?: string; // 'venue', 'razorpay', etc.
    paymentTxnId?: string; // Payment transaction ID
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
    const shareText = `🎮 Booking Confirmed at Cuephoria Gaming Lounge! 

Booking ID: ${bookingData.bookingId}

Customer: ${bookingData.customerName}

Stations: ${bookingData.stationNames.join(', ')}

Date: ${format(new Date(bookingData.date), 'EEEE, MMMM d, yyyy')}

Time: ${bookingData.startTime} - ${bookingData.endTime}

Total Amount: ₹${bookingData.totalAmount}
${bookingData.transactionFee ? `\nTransaction Fee (2.5%): ₹${bookingData.transactionFee}` : ''}
${bookingData.totalWithFee && bookingData.totalWithFee !== bookingData.totalAmount ? `\nAmount Paid: ₹${bookingData.totalWithFee}` : ''}
${bookingData.couponCode ? `\nCoupon: ${bookingData.couponCode}` : ''}
${bookingData.paymentMode && bookingData.paymentMode !== 'venue' ? `\nPayment: ${bookingData.paymentMode === 'razorpay' ? 'Razorpay (Online)' : bookingData.paymentMode}` : '\nPayment: At Venue'}
${bookingData.paymentTxnId ? `\nTransaction ID: ${bookingData.paymentTxnId}` : ''}

📍 Cuephoria Gaming Lounge

📞 Contact: +91 86376 25155

🌐 Visit: https://cuephoria.in

Please arrive on time and show this confirmation at reception.`;

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

            {/* Payment Information */}
            {bookingData.paymentMode && bookingData.paymentMode !== 'venue' && (
              <div className="space-y-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    Payment Method: {bookingData.paymentMode === 'razorpay' ? 'Razorpay (Online)' : bookingData.paymentMode}
                  </span>
                </div>
                {bookingData.paymentTxnId && (
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-green-300" />
                    <div className="flex-1">
                      <span className="text-xs text-gray-400">Transaction ID: </span>
                      <span className="text-xs font-mono text-green-300 break-all">
                        {bookingData.paymentTxnId}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(bookingData.paymentTxnId!);
                        toast.success('Transaction ID copied!');
                      }}
                      className="h-6 w-6 p-0 hover:bg-green-500/20"
                    >
                      <Copy className="h-3 w-3 text-green-300" />
                    </Button>
                  </div>
                )}
                <Badge variant="outline" className="bg-green-500/20 border-green-500/30 text-green-400 text-xs">
                  ✅ Payment Completed
                </Badge>
              </div>
            )}

            {/* Total Amount */}
            <div className="text-center space-y-2">
              <div>
                <p className="text-sm text-gray-400">Booking Amount</p>
                <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple">
                  ₹{bookingData.totalAmount}
                </p>
              </div>
              
              {bookingData.transactionFee && bookingData.transactionFee > 0 && (
                <>
                  <Separator className="bg-border" />
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Transaction Fee (2.5%)</span>
                      <span className="text-gray-300">+₹{bookingData.transactionFee}</span>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 mt-2">
                      <p className="text-xs text-blue-300/90">
                        💡 Includes 15 mins free gameplay bonus
                      </p>
                    </div>
                    {bookingData.totalWithFee && bookingData.totalWithFee !== bookingData.totalAmount && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-sm text-gray-400">Amount Paid</p>
                        <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                          ₹{bookingData.totalWithFee}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {!bookingData.paymentMode || bookingData.paymentMode === 'venue' ? (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                  <p className="text-xs text-yellow-400 font-medium">
                    💰 Payment at Venue
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Please pay when you arrive
                  </p>
                </div>
              ) : (
                <p className="text-xs text-green-400 mt-1 font-medium">
                  ✅ Payment Received
                </p>
              )}
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