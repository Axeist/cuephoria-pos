import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Trash2, Gift, Download, Eye } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CurrencyDisplay } from '@/components/ui/currency';
import { Button } from '@/components/ui/button';
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
import Receipt from '@/components/Receipt';
import { generatePDF } from '@/components/receipt/receiptUtils';
import { useToast } from '@/hooks/use-toast';

interface BillItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  price: number;
  type: 'product' | 'session';
  category?: string;
}

interface Bill {
  id: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  discountValue?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  total: number;
  paymentMethod: string;
  isSplitPayment?: boolean;
  splitPayment?: any[];
  cashAmount?: number;
  upiAmount?: number;
  compNote?: string;
  status?: string;
  createdAt: Date | string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isMember: boolean;
  loyaltyPoints: number;
  totalSpent: number;
  createdAt: Date;
}

interface ExpandableBillRowProps {
  bill: Bill;
  getCustomerName: (customerId: string) => string;
  getCustomerPhone?: (customerId: string) => string;
  getCustomer?: (customerId: string) => Customer | undefined;
  searchTerm?: string;
  onDelete?: (bill: Bill) => void;
}

const ExpandableBillRow: React.FC<ExpandableBillRowProps> = ({ 
  bill, 
  getCustomerName, 
  getCustomerPhone,
  getCustomer,
  searchTerm = '',
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const billDate = new Date(bill.createdAt);
  const firstItemName = bill.items.length > 0 ? bill.items[0].name : '';
  const itemCount = bill.items.length;
  const customerName = getCustomerName(bill.customerId);
  const customerPhone = getCustomerPhone ? getCustomerPhone(bill.customerId) : '';
  const customer = getCustomer ? getCustomer(bill.customerId) : undefined;
  
  const isComplimentary = bill.paymentMethod?.toLowerCase() === 'complimentary';
  const isSplit = bill.isSplitPayment || (bill.splitPayment && bill.splitPayment.length > 0);

  const matchesSearch = !searchTerm || 
    customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customerPhone.includes(searchTerm) ||
    bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!matchesSearch) {
    return null;
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(bill);
    }
    setShowDeleteDialog(false);
  };

  const handleViewReceipt = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowReceipt(true);
  };

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!customer) {
      toast({
        title: "Error",
        description: "Customer information not found",
        variant: "destructive"
      });
      return;
    }

    setIsDownloadingPDF(true);

    try {
      // Create a temporary hidden receipt for PDF generation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      document.body.appendChild(tempDiv);

      // Import and render the receipt content (without dialog wrapper)
      const { default: ReceiptContent } = await import('@/components/receipt/ReceiptContent');
      const { default: ReceiptHeader } = await import('@/components/receipt/ReceiptHeader');
      const { default: CustomerInfo } = await import('@/components/receipt/CustomerInfo');
      const { default: ReceiptItems } = await import('@/components/receipt/ReceiptItems');
      const { default: ReceiptSummary } = await import('@/components/receipt/ReceiptSummary');
      const { default: ReceiptFooter } = await import('@/components/receipt/ReceiptFooter');

      // Create receipt HTML
      tempDiv.innerHTML = `
        <div class="p-6 text-black bg-white" style="width: 800px; padding: 40px; background: white; color: black;">
          ${await renderReceiptHTML(bill, customer)}
        </div>
      `;

      await generatePDF(tempDiv.firstChild as HTMLElement, bill.id, customer.name);
      
      document.body.removeChild(tempDiv);

      toast({
        title: "Success",
        description: "Receipt downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive"
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const renderReceiptHTML = async (bill: Bill, customer: Customer): Promise<string> => {
    const billDate = new Date(bill.createdAt);
    const isComp = bill.paymentMethod?.toLowerCase() === 'complimentary';
    
    return `
      <!-- Header -->
      <div class="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
        <div class="text-center mb-4">
          <h1 class="text-4xl font-bold mb-1" style="color: #6E59A5; font-family: Arial Black, sans-serif;">CUEPHORIA</h1>
          <p class="text-sm text-gray-600 uppercase tracking-wider">Gaming Cafe & Snooker Club</p>
        </div>
        
        <div class="text-center space-y-1 text-xs text-gray-700 mb-4">
          <p>📍 Roof Top, No.1, Shivani Complex, Vaithiyalingam St,<br>Muthu Nagar, Thiruverumbur, Tamil Nadu 620013</p>
          <p>📞 +91 86376 25155 | +91 75500 25155</p>
          <p>✉️ contact@cuephoria.in</p>
          <p>🕐 11:00 AM - 11:00 PM, Every day</p>
        </div>
        
        <div class="text-center mb-3">
          <h2 class="text-2xl font-bold">${isComp ? 'COMPLIMENTARY RECEIPT' : 'TAX INVOICE'}</h2>
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p class="text-gray-600">Invoice No:</p>
            <p class="font-semibold font-mono">${bill.id.substring(0, 12).toUpperCase()}</p>
          </div>
          <div class="text-right">
            <p class="text-gray-600">Date & Time:</p>
            <p class="font-semibold">${billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          </div>
        </div>
        
        ${isComp && bill.compNote ? `
          <div class="mt-3 bg-amber-50 border border-amber-300 rounded p-2">
            <p class="text-xs text-gray-600">Reason:</p>
            <p class="text-xs font-medium text-amber-800 italic">${bill.compNote}</p>
          </div>
        ` : ''}
      </div>

      <!-- Customer Info -->
      <div class="border-b border-gray-300 pb-3 mb-3">
        <h4 class="text-xs font-semibold text-gray-600 mb-2">Bill To:</h4>
        <p class="font-semibold">${customer.name}</p>
        <p class="text-sm text-gray-600">${customer.phone}</p>
        ${customer.email ? `<p class="text-sm text-gray-600">${customer.email}</p>` : ''}
      </div>

      <!-- Items -->
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="text-align: left; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">Item</th>
            <th style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">Qty</th>
            <th style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">Price</th>
            <th style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map(item => `
            <tr>
              <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${item.name}</td>
              <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${item.quantity}</td>
              <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">₹${item.price.toLocaleString('en-IN')}</td>
              <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">₹${item.total.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Summary -->
      <div class="border-t-2 border-gray-300 pt-3 mt-3">
        <div class="flex justify-between text-sm mb-2">
          <span>Subtotal:</span>
          <span>₹${bill.subtotal.toLocaleString('en-IN')}</span>
        </div>
        ${(bill.discountValue || 0) > 0 ? `
          <div class="flex justify-between text-sm mb-2" style="color: #6E59A5;">
            <span>Discount:</span>
            <span>₹${bill.discountValue?.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        ${(bill.loyaltyPointsUsed || 0) > 0 ? `
          <div class="flex justify-between text-sm mb-2" style="color: #f59e0b;">
            <span>Loyalty Points Used:</span>
            <span>${bill.loyaltyPointsUsed}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-lg font-bold border-t border-gray-300 pt-2 mt-2">
          <span>Total:</span>
          <span>₹${bill.total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Payment Method -->
      ${!isComp ? `
        <div class="mt-4 mb-6 flex items-center justify-between border-t border-gray-300 pt-3">
          <span class="text-sm font-semibold">Payment Method:</span>
          <span class="px-4 py-1 rounded-full font-semibold text-sm ${
            bill.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' : 
            bill.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-800' : 
            'bg-orange-100 text-orange-800'
          }">${bill.paymentMethod.toUpperCase()}</span>
        </div>
      ` : ''}

      <!-- Footer -->
      <div class="border-t-2 border-dashed border-gray-400 pt-4 mt-6 text-center">
        <div class="mb-4">
          <h3 class="text-lg font-bold mb-1" style="color: #6E59A5;">Thank You for Visiting!</h3>
          <p class="text-xs text-gray-600">We hope you enjoyed your experience at Cuephoria</p>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-3 mb-4">
          <h4 class="text-xs font-semibold text-gray-700 mb-2">Terms & Conditions:</h4>
          <ul class="text-xs text-gray-600 space-y-1 text-left" style="list-style-position: inside;">
            <li>• Goods once sold cannot be returned or exchanged</li>
            <li>• Please check the bill before leaving the counter</li>
            <li>• Gaming session charges are non-refundable</li>
            <li>• Membership benefits are subject to terms and conditions</li>
            <li>• Management reserves the right to admission</li>
          </ul>
        </div>
        
        <div class="text-xs text-gray-600 mb-3">
          <p class="font-semibold mb-1">Stay Connected!</p>
          <p>Follow us on Instagram & Facebook: <span class="font-medium">@cuephoriaclub</span></p>
          <p class="mt-1">Visit us: <span class="font-medium">www.cuephoria.in</span></p>
        </div>
        
        <div class="text-xs text-gray-400 border-t border-gray-200 pt-2">
          <p>Powered by Cuephoria Tech</p>
          <p class="mt-1">For support: contact@cuephoria.in</p>
        </div>
        
        <div class="mt-3 text-center">
          <p class="text-lg font-bold" style="color: #6E59A5;">★ ★ ★</p>
        </div>
      </div>
    `;
  };

  return (
    <>
      <TableRow 
        className={`hover:bg-gray-800/50 transition-colors ${
          isComplimentary ? 'bg-amber-950/20 hover:bg-amber-950/30' : ''
        }`}
      >
        <TableCell className="text-white">
          <div>{format(billDate, 'd MMM yyyy')}</div>
          <div className="text-gray-400 text-xs">{format(billDate, 'HH:mm')}</div>
        </TableCell>
        <TableCell className="text-white font-mono text-xs">{bill.id.substring(0, 30)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="text-white">
              <div>{customerName}</div>
              {customerPhone && (
                <div className="text-gray-400 text-xs">{customerPhone}</div>
              )}
            </div>
            {isComplimentary && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs px-1.5 py-0">
                <Gift className="h-3 w-3 mr-1" />
                Comp
              </Badge>
            )}
          </div>
          {isComplimentary && bill.compNote && (
            <p className="text-xs text-amber-400/80 mt-1 italic">
              {bill.compNote}
            </p>
          )}
        </TableCell>
        <TableCell className="text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 hover:bg-gray-700"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <div>
              <div>{itemCount} item{itemCount !== 1 ? 's' : ''}</div>
              {!isExpanded && bill.items.length > 0 && (
                <div className="text-gray-400 text-xs">{firstItemName}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-white">
          <CurrencyDisplay amount={bill.subtotal} />
        </TableCell>
        <TableCell className="text-white">
          <CurrencyDisplay amount={bill.discountValue || 0} />
        </TableCell>
        <TableCell className="text-white">{bill.loyaltyPointsUsed || 0}</TableCell>
        <TableCell className={`font-semibold ${isComplimentary ? 'text-amber-400' : 'text-white'}`}>
          <CurrencyDisplay amount={bill.total} />
        </TableCell>
        <TableCell>
          {isComplimentary ? (
            <Badge className="bg-amber-900/30 text-amber-400 border-amber-700">
              <Gift className="h-3 w-3 mr-1" />
              Complimentary
            </Badge>
          ) : isSplit ? (
            <Badge variant="outline" className="bg-purple-900/30 text-purple-400 border-purple-800">
              Split
            </Badge>
          ) : (
            <Badge variant="outline" className={
              bill.paymentMethod === 'upi'
                ? "bg-blue-900/30 text-blue-400 border-blue-800"
                : bill.paymentMethod === 'credit'
                ? "bg-orange-900/30 text-orange-400 border-orange-800"
                : "bg-green-900/30 text-green-400 border-green-800"
            }>
              {bill.paymentMethod === 'upi' 
                ? 'UPI' 
                : bill.paymentMethod === 'credit'
                ? 'Credit'
                : 'Cash'}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {isSplit && !isComplimentary && (
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-green-400">Cash:</span>
                <CurrencyDisplay amount={bill.cashAmount || 0} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-blue-400">UPI:</span>
                <CurrencyDisplay amount={bill.upiAmount || 0} />
              </div>
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {customer && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleViewReceipt}
                  className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                  title="View Receipt"
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-950/30"
                  title="Download PDF"
                  type="button"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteClick}
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                title="Delete Transaction"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow className={isComplimentary ? 'bg-amber-950/10' : 'bg-gray-800/30'}>
          <TableCell colSpan={11} className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white mb-2">Items in this transaction:</h4>
              <div className="grid gap-2">
                {bill.items.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      isComplimentary 
                        ? 'bg-amber-950/20 border border-amber-800/30' 
                        : 'bg-gray-800/50 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={
                        item.type === 'session' 
                          ? "bg-blue-900/30 text-blue-400 border-blue-800" 
                          : "bg-purple-900/30 text-purple-400 border-purple-800"
                      }>
                        {item.type === 'session' ? 'Session' : 'Product'}
                      </Badge>
                      <div>
                        <span className="text-white font-medium">{item.name}</span>
                        <div className="text-xs text-gray-400">
                          <CurrencyDisplay amount={item.price} /> × {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`font-semibold ${isComplimentary ? 'text-amber-400' : 'text-white'}`}>
                        <CurrencyDisplay amount={item.total} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {isComplimentary && bill.compNote && (
                <div className="mt-3 p-3 bg-amber-950/30 border border-amber-800/50 rounded-md">
                  <p className="text-xs text-gray-400 mb-1">Complimentary Reason:</p>
                  <p className="text-sm text-amber-400 italic">{bill.compNote}</p>
                </div>
              )}

              <div className="border-t border-gray-700 pt-3 mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal:</span>
                  <CurrencyDisplay amount={bill.subtotal} className="text-white" />
                </div>
                {(bill.discountValue || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount:</span>
                    <CurrencyDisplay amount={bill.discountValue || 0} className="text-purple-400" />
                  </div>
                )}
                {(bill.loyaltyPointsUsed || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Loyalty Points Used:</span>
                    <span className="text-orange-400">{bill.loyaltyPointsUsed}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-gray-700 pt-2 mt-2">
                  <span className={isComplimentary ? 'text-amber-400' : 'text-white'}>Total:</span>
                  <CurrencyDisplay 
                    amount={bill.total} 
                    className={isComplimentary ? 'text-amber-400' : 'text-white'} 
                  />
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to delete this transaction? This will revert the sale, 
              update inventory, and adjust customer loyalty points. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Dialog */}
      {showReceipt && customer && (
        <Receipt 
          bill={bill} 
          customer={customer} 
          onClose={() => setShowReceipt(false)}
          allowEdit={false}
        />
      )}
    </>
  );
};

export default ExpandableBillRow;
