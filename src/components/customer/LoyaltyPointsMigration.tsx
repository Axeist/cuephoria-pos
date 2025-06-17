
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { migrateLoyaltyPoints } from '@/utils/loyaltyPointsMigration';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const LoyaltyPointsMigration: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const handleMigration = async () => {
    setIsRunning(true);
    
    try {
      const result = await migrateLoyaltyPoints();
      
      if (result.success) {
        toast({
          title: 'Migration Completed',
          description: `Successfully updated loyalty points for ${result.updatedCount} customers.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Migration Failed',
          description: result.error || 'An error occurred during migration',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration Failed',
        description: 'An unexpected error occurred during migration',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Fix Loyalty Points
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Recalculate Loyalty Points
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will recalculate loyalty points for all customers based on the current formula:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Members:</strong> 5 points per ₹100 spent</li>
              <li><strong>Non-members:</strong> 2 points per ₹100 spent</li>
            </ul>
            <p className="text-orange-600 font-medium">
              This action will update all customer records. Make sure you want to proceed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRunning}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleMigration}
            disabled={isRunning}
            className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Migration...
              </>
            ) : (
              'Run Migration'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LoyaltyPointsMigration;
