// Deprecated: staff login + HR profile are created together in Settings → Team.
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings, UserPlus } from 'lucide-react';

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  locationId?: string;
}

const CreateStaffDialog: React.FC<CreateStaffDialogProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-cuephoria-lightpurple" />
            Add staff in Settings
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            New team members are added once in Settings → Team. That creates their login,
            branch access, HR profile, and staff portal PIN together.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-white/70">
          Use this Staff page to manage attendance, payroll, and requests for people who
          already have accounts.
        </p>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button asChild className="w-full bg-cuephoria-purple hover:bg-cuephoria-lightpurple">
            <Link to="/settings?tab=team" onClick={() => onOpenChange(false)}>
              <Settings className="mr-2 h-4 w-4" />
              Open Settings → Team
            </Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStaffDialog;
