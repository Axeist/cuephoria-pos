
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

const pinSchema = z.object({
  pin: z.string().min(4, { message: 'PIN must be at least 4 characters.' }).max(4, { message: 'PIN must be exactly 4 characters.' }),
});

type PinFormValues = z.infer<typeof pinSchema>;

interface PinVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

const PinVerificationDialog: React.FC<PinVerificationDialogProps> = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  title = "Enter PIN",
  description = "Enter the PIN to proceed"
}) => {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  
  const form = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: {
      pin: '',
    },
  });

  const onSubmit = async (values: PinFormValues) => {
    setIsVerifying(true);
    
    // Check if PIN is correct (2101)
    if (values.pin === '2101') {
      toast({
        title: "PIN Verified",
        description: "Access granted successfully.",
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: "Invalid PIN",
        description: "The PIN you entered is incorrect. Please try again.",
        variant: "destructive"
      });
      form.setError('pin', { message: 'Invalid PIN' });
    }
    
    setIsVerifying(false);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading gradient-text">{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter 4-digit PIN" 
                      maxLength={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isVerifying}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Verify PIN'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PinVerificationDialog;
