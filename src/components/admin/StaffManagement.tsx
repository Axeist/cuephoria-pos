
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, Trash2, Users, User, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

interface AdminUser {
  id: string;
  username: string;
  isAdmin: boolean;
}

const StaffManagement: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isEditingStaff, setIsEditingStaff] = useState(false);
  const [currentEditStaff, setCurrentEditStaff] = useState<AdminUser | null>(null);
  const { user, addStaffMember, getStaffMembers, updateStaffMember, deleteStaffMember } = useAuth();
  const { toast } = useToast();

  const loadStaffMembers = async () => {
    if (!user?.isAdmin) return;
    
    try {
      const members = await getStaffMembers();
      setStaffMembers(members);
    } catch (error) {
      console.error('Failed to load staff members', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff members',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadStaffMembers();
  }, [user]);

  const handleAddStaff = async () => {
    if (!newUsername || !newPassword) {
      toast({
        title: 'Error',
        description: 'Please provide both username and password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const isAdmin = userRole === 'admin';
      const success = await addStaffMember(newUsername, newPassword, isAdmin);
      
      if (success) {
        toast({
          title: 'Success',
          description: `${isAdmin ? 'Admin' : 'Staff'} user added successfully`,
        });
        resetForm();
        setIsAddingStaff(false);
        loadStaffMembers(); // Refresh user list
      } else {
        toast({
          title: 'Error',
          description: `Failed to add ${userRole} user`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `An error occurred while adding ${userRole} user`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStaff = (staff: AdminUser) => {
    setCurrentEditStaff(staff);
    setNewUsername(staff.username);
    setIsEditingStaff(true);
  };

  const handleUpdateStaff = async () => {
    if (!currentEditStaff) return;

    setIsLoading(true);
    try {
      const updatedData: Partial<AdminUser> = {
        username: newUsername,
      };

      const success = await updateStaffMember(currentEditStaff.id, updatedData);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Staff member updated successfully',
        });
        resetForm();
        setIsEditingStaff(false);
        loadStaffMembers(); // Refresh staff list
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update staff member',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while updating staff member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const userToDelete = staffMembers.find(u => u.id === id);
    if (!confirm(`Are you sure you want to delete ${userToDelete?.username}?`)) {
      return;
    }

    try {
      const success = await deleteStaffMember(id);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
        loadStaffMembers(); // Refresh user list
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting user',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setNewUsername('');
    setNewPassword('');
    setUserRole('staff');
    setCurrentEditStaff(null);
  };

  // Only admins can access this component
  if (!user?.isAdmin) {
    return (
      <Card className="border border-cuephoria-lightpurple/30 shadow-md">
        <CardContent className="pt-6">
          <Alert className="bg-cuephoria-dark/50 border-cuephoria-orange/30">
            <Shield className="h-4 w-4 text-cuephoria-orange" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              Only administrators can manage user accounts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-cuephoria-lightpurple/30 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="h-5 w-5 text-cuephoria-lightpurple" />
          User Management
        </CardTitle>
        <CardDescription>
          Add and manage admin and staff accounts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Staff Dialog */}
        <Dialog open={isAddingStaff} onOpenChange={(open) => {
          setIsAddingStaff(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="w-full bg-gradient-to-r from-cuephoria-lightpurple to-accent hover:shadow-lg hover:shadow-cuephoria-lightpurple/20"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-cuephoria-dark border border-cuephoria-lightpurple/30">
            <DialogHeader>
              <DialogTitle className="text-xl">Add New User</DialogTitle>
              <DialogDescription>
                Create login credentials for a new admin or staff user
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* User Role Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple">
                  <Shield className="h-4 w-4" />
                  User Role*
                </Label>
                <RadioGroup value={userRole} onValueChange={(value) => setUserRole(value as 'admin' | 'staff')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="admin" />
                    <Label htmlFor="admin" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4 text-amber-500" />
                      Admin
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="staff" />
                    <Label htmlFor="staff" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Staff
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Basic Info - Only Username and Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple">
                  <User className="h-4 w-4" />
                  Username*
                </label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-cuephoria-darker border-cuephoria-lightpurple/30"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple">
                  <Shield className="h-4 w-4" />
                  Password*
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-cuephoria-darker border-cuephoria-lightpurple/30"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingStaff(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddStaff} 
                disabled={isLoading}
                className="bg-cuephoria-lightpurple hover:bg-cuephoria-purple"
              >
                {isLoading ? 'Adding...' : `Add ${userRole === 'admin' ? 'Admin' : 'Staff'} User`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditingStaff} onOpenChange={(open) => {
          setIsEditingStaff(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="bg-cuephoria-dark border border-cuephoria-lightpurple/30">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit User</DialogTitle>
              <DialogDescription>
                Update user details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Basic Info - Only Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple">
                  <User className="h-4 w-4" />
                  Username*
                </label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  className="bg-cuephoria-darker border-cuephoria-lightpurple/30"
                />
              </div>
              {currentEditStaff && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cuephoria-lightpurple">Role</label>
                  <div>
                    <Badge variant={currentEditStaff.isAdmin ? "default" : "secondary"} className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      {currentEditStaff.isAdmin ? (
                        <>
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          Staff
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingStaff(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateStaff} 
                disabled={isLoading}
                className="bg-cuephoria-lightpurple hover:bg-cuephoria-purple"
              >
                {isLoading ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Users</h3>
          <ScrollArea className="h-[320px] rounded-md border border-cuephoria-lightpurple/20 p-2">
            {staffMembers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.username}</TableCell>
                      <TableCell>
                        <Badge variant={staff.isAdmin ? "default" : "secondary"} className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {staff.isAdmin ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 mr-1" />
                              Staff
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditStaff(staff)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">No users yet</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffManagement;
