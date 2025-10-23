// src/components/staff/StaffSelectionDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, User } from 'lucide-react';

interface StaffSelectionDialogProps {
  open: boolean;
  onSelectStaff: (staff: any) => void;
}

const StaffSelectionDialog: React.FC<StaffSelectionDialogProps> = ({
  open,
  onSelectStaff
}) => {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('is_active', true)
        .order('username');

      if (error) throw error;
      setStaffList(data || []);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff list',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStaff = staffList.filter(staff =>
    staff.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-cuephoria-dark border-cuephoria-purple/20 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">Select Staff Member</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose your profile to continue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-cuephoria-darker border-cuephoria-purple/20"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 rounded-full border-4 border-cuephoria-lightpurple border-t-transparent"></div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No staff members found
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredStaff.map((staff) => (
                <Button
                  key={staff.user_id}
                  onClick={() => onSelectStaff(staff)}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 border-cuephoria-purple/20 hover:border-cuephoria-purple/60 hover:bg-cuephoria-darker"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-12 w-12 rounded-full bg-cuephoria-purple/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-cuephoria-lightpurple">
                        {staff.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{staff.username}</p>
                      <p className="text-sm text-muted-foreground">{staff.designation}</p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffSelectionDialog;
