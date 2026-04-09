import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, Trash2, Users, User, Edit, Globe, MapPin, Star, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface LocationInfo {
  id: string;
  name: string;
  slug: string;
  short_code: string;
}

interface StaffUser {
  id: string;
  username: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  locations: LocationInfo[];
}

const SLUG_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  main: { bg: 'bg-purple-500/15 border-purple-400/30', text: 'text-purple-300', dot: 'bg-purple-400' },
  lite: { bg: 'bg-cyan-500/15 border-cyan-400/30', text: 'text-cyan-300', dot: 'bg-cyan-400' },
};
const DEFAULT_COLOR = { bg: 'bg-gray-500/15 border-gray-400/30', text: 'text-gray-300', dot: 'bg-gray-400' };

const BranchBadge = ({ loc }: { loc: LocationInfo }) => {
  const c = SLUG_COLORS[loc.slug] ?? DEFAULT_COLOR;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {loc.short_code}
    </span>
  );
};

const StaffManagement: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<StaffUser[]>([]);
  const [allLocations, setAllLocations] = useState<LocationInfo[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'staff'>('staff');
  const [newIsSuperAdmin, setNewIsSuperAdmin] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editIsSuperAdmin, setEditIsSuperAdmin] = useState(false);
  const [editLocationIds, setEditLocationIds] = useState<string[]>([]);

  const { user, addStaffMember, getStaffMembers, updateStaffMember, deleteStaffMember } = useAuth();
  const { toast } = useToast();

  const loadStaffMembers = async () => {
    if (!user?.isAdmin) return;
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json?.ok) {
        setStaffMembers(json.users ?? []);
        setAllLocations(json.allLocations ?? []);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    }
  };

  useEffect(() => { loadStaffMembers(); }, [user]);

  const toggleLocation = (id: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  const handleAddStaff = async () => {
    if (!newUsername || !newPassword) {
      toast({ title: 'Error', description: 'Username and password are required', variant: 'destructive' });
      return;
    }
    if (!newIsSuperAdmin && selectedLocationIds.length === 0) {
      toast({ title: 'Error', description: 'Assign at least one branch', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const success = await addStaffMember(newUsername, newPassword, userRole === 'admin', newIsSuperAdmin, selectedLocationIds);
      if (success) {
        resetAddForm();
        setIsAddingStaff(false);
        loadStaffMembers();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (staff: StaffUser) => {
    setEditingStaff(staff);
    setEditUsername(staff.username);
    setEditIsSuperAdmin(staff.isSuperAdmin);
    setEditLocationIds(staff.locations.map(l => l.id));
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;
    setIsLoading(true);
    try {
      const success = await updateStaffMember(editingStaff.id, {
        username: editUsername,
        isSuperAdmin: editIsSuperAdmin,
        locationIds: editIsSuperAdmin ? [] : editLocationIds,
      });
      if (success) {
        setEditingStaff(null);
        loadStaffMembers();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    const success = await deleteStaffMember(id);
    if (success) loadStaffMembers();
  };

  const resetAddForm = () => {
    setNewUsername('');
    setNewPassword('');
    setUserRole('staff');
    setNewIsSuperAdmin(false);
    setSelectedLocationIds([]);
  };

  if (!user?.isAdmin) {
    return (
      <Card className="border border-cuephoria-lightpurple/30">
        <CardContent className="pt-6">
          <Alert className="bg-cuephoria-dark/50 border-cuephoria-orange/30">
            <Shield className="h-4 w-4 text-cuephoria-orange" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>Only administrators can manage user accounts.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const LocationCheckboxes = ({
    selected,
    onToggle,
    disabled,
  }: {
    selected: string[];
    onToggle: (id: string) => void;
    disabled?: boolean;
  }) => (
    <div className="grid grid-cols-2 gap-2">
      {allLocations.map((loc) => {
        const c = SLUG_COLORS[loc.slug] ?? DEFAULT_COLOR;
        const checked = selected.includes(loc.id);
        return (
          <label
            key={loc.id}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
              disabled ? 'opacity-40 pointer-events-none' : ''
            } ${checked ? `${c.bg} ${c.text}` : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'}`}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(loc.id)}
              className="border-white/30"
            />
            <span className={`h-2 w-2 rounded-full ${c.dot}`} />
            <span className="text-sm font-medium">{loc.name}</span>
            <span className="ml-auto font-mono text-[10px] opacity-60">{loc.short_code}</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <Card className="border border-cuephoria-lightpurple/30 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="h-5 w-5 text-cuephoria-lightpurple" />
          User Management
        </CardTitle>
        <CardDescription>Manage admin and staff accounts with branch access control</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add User Dialog */}
        <Dialog open={isAddingStaff} onOpenChange={(open) => { setIsAddingStaff(open); if (!open) resetAddForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-cuephoria-lightpurple to-accent hover:shadow-lg hover:shadow-cuephoria-lightpurple/20">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-cuephoria-dark border border-cuephoria-lightpurple/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Add New User</DialogTitle>
              <DialogDescription>Create login credentials with branch access</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Role */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-cuephoria-lightpurple flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Role
                </Label>
                <RadioGroup value={userRole} onValueChange={(v) => setUserRole(v as 'admin' | 'staff')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="admin" id="r-admin" />
                    <Label htmlFor="r-admin" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4 text-amber-500" /> Admin
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="r-staff" />
                    <Label htmlFor="r-staff" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" /> Staff
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Super Admin toggle — only shown to super admins */}
              {user.isSuperAdmin && (
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 cursor-pointer">
                  <Checkbox
                    checked={newIsSuperAdmin}
                    onCheckedChange={(v) => { setNewIsSuperAdmin(!!v); if (v) setSelectedLocationIds([]); }}
                    className="border-amber-400/50"
                  />
                  <Star className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">Super Admin</p>
                    <p className="text-xs text-amber-300/60">Full access to all branches + can switch between them</p>
                  </div>
                </label>
              )}

              {/* Branch access */}
              {!newIsSuperAdmin && allLocations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-cuephoria-lightpurple flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Branch Access
                  </Label>
                  <LocationCheckboxes
                    selected={selectedLocationIds}
                    onToggle={(id) => toggleLocation(id, selectedLocationIds, setSelectedLocationIds)}
                  />
                </div>
              )}

              {newIsSuperAdmin && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white/50 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  Super admins automatically get access to all branches
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-cuephoria-lightpurple flex items-center gap-2">
                  <User className="h-4 w-4" /> Username
                </Label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter username" className="bg-cuephoria-darker border-cuephoria-lightpurple/30" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-cuephoria-lightpurple flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Password
                </Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter password" className="bg-cuephoria-darker border-cuephoria-lightpurple/30" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingStaff(false)}>Cancel</Button>
              <Button onClick={handleAddStaff} disabled={isLoading} className="bg-cuephoria-lightpurple hover:bg-cuephoria-purple">
                {isLoading ? 'Adding...' : `Add ${userRole === 'admin' ? 'Admin' : 'Staff'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingStaff} onOpenChange={(open) => { if (!open) setEditingStaff(null); }}>
          <DialogContent className="bg-cuephoria-dark border border-cuephoria-lightpurple/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit User</DialogTitle>
              <DialogDescription>Update user details and branch access</DialogDescription>
            </DialogHeader>

            {editingStaff && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-cuephoria-lightpurple flex items-center gap-2">
                    <User className="h-4 w-4" /> Username
                  </Label>
                  <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="bg-cuephoria-darker border-cuephoria-lightpurple/30" />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Role: <Badge variant="secondary" className="ml-1">{editingStaff.isAdmin ? 'Admin' : 'Staff'}</Badge>
                </div>

                {user.isSuperAdmin && (
                  <label className="flex items-center gap-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 cursor-pointer">
                    <Checkbox
                      checked={editIsSuperAdmin}
                      onCheckedChange={(v) => { setEditIsSuperAdmin(!!v); if (v) setEditLocationIds([]); }}
                      className="border-amber-400/50"
                    />
                    <Star className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">Super Admin</span>
                  </label>
                )}

                {!editIsSuperAdmin && allLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-cuephoria-lightpurple flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Branch Access
                    </Label>
                    <LocationCheckboxes
                      selected={editLocationIds}
                      onToggle={(id) => toggleLocation(id, editLocationIds, setEditLocationIds)}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button onClick={handleUpdateStaff} disabled={isLoading} className="bg-cuephoria-lightpurple hover:bg-cuephoria-purple">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Users Table */}
        <ScrollArea className="h-[360px] rounded-md border border-cuephoria-lightpurple/20">
          {staffMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch Access</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffMembers.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.username}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className={staff.isAdmin ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''}>
                          {staff.isAdmin ? <><Shield className="h-3 w-3 mr-1" />Admin</> : <><User className="h-3 w-3 mr-1" />Staff</>}
                        </Badge>
                        {staff.isSuperAdmin && (
                          <Badge className="bg-amber-400/10 text-amber-300 border-amber-400/30 text-[10px] px-1.5">
                            <Star className="h-2.5 w-2.5 mr-1" />Super
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {staff.isSuperAdmin ? (
                        <span className="flex items-center gap-1.5 text-xs text-white/40">
                          <Globe className="h-3 w-3" /> All branches
                        </span>
                      ) : staff.locations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {staff.locations.map((loc) => <BranchBadge key={loc.id} loc={loc} />)}
                        </div>
                      ) : (
                        <span className="text-xs text-red-400/70">No branch assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(staff)} className="h-8 w-8 p-0">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => handleDeleteStaff(staff.id, staff.username)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          disabled={staff.id === user?.id}
                          title={staff.id === user?.id ? "Cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground text-sm">No users yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default StaffManagement;
