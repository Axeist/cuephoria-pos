import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus, Trash2, Users, User, Edit, Globe, MapPin, Star, Lock, Eye, EyeOff, KeyRound, MailCheck, Send, Briefcase, IdCard, Phone, Clock } from 'lucide-react';
import { shiftHoursFromTimes } from '@/utils/staffEarnings';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { isAdminLoginRoleSlug, roleNeedsStaffProfile } from '@/utils/workspacePermissionsClient';

interface LocationInfo {
  id: string;
  name: string;
  slug: string;
  short_code: string;
}

interface WorkspaceRoleOption {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_system: boolean;
}

interface StaffUser {
  id: string;
  username: string;
  email?: string | null;
  emailVerifiedAt?: string | null;
  displayName?: string | null;
  designation?: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  locations: LocationInfo[];
  portalPin?: string | null;
  staffProfileUserId?: string | null;
  workspaceRoleId?: string | null;
  workspaceRole?: {
    id: string;
    name: string;
    slug: string | null;
    isSystem: boolean;
  } | null;
}

const SLUG_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  main: { bg: 'bg-purple-500/15 border-purple-400/30', text: 'text-purple-300', dot: 'bg-purple-400' },
  lite: { bg: 'bg-cyan-500/15 border-cyan-400/30', text: 'text-cyan-300', dot: 'bg-cyan-400' },
};
const DEFAULT_COLOR = { bg: 'bg-gray-500/15 border-gray-400/30', text: 'text-gray-300', dot: 'bg-gray-400' };

const formLabel = 'text-sm font-medium text-foreground flex items-center gap-2';
const formInput = 'glass-card border-border/50';
const dialogSheet = 'sm:max-w-lg max-h-[min(90vh,820px)]';

// Cafe is a distinct product with its own login (/cafe) and its own user
// management. It must not appear as an assignable branch in this dashboard.
const isFranchiseLocation = (loc: LocationInfo) =>
  loc.slug !== 'cafe' && loc.short_code?.toLowerCase() !== 'cafe';

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
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMonthlySalary, setNewMonthlySalary] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('11:00');
  const [newShiftEnd, setNewShiftEnd] = useState('23:00');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [workspaceRoles, setWorkspaceRoles] = useState<WorkspaceRoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [rolePreviewCount, setRolePreviewCount] = useState<number | null>(null);
  const [newIsSuperAdmin, setNewIsSuperAdmin] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editIsSuperAdmin, setEditIsSuperAdmin] = useState(false);
  const [editLocationIds, setEditLocationIds] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    user,
    addStaffMember,
    updateStaffMember,
    deleteStaffMember,
    verifyStaffEmailManually,
    resendStaffVerificationEmail,
    regenerateStaffPortalPin,
    ensureStaffPortalPin,
  } = useAuth();
  const { can } = usePermissions();
  const [newPortalPin, setNewPortalPin] = useState<string | null>(null);
  const { toast } = useToast();

  const defaultEmployeeRoleId = workspaceRoles.find((r) => r.slug === 'employee')?.id ?? workspaceRoles[0]?.id ?? '';

  const selectedRole = workspaceRoles.find((r) => r.id === selectedRoleId);
  const selectedRoleSlug = selectedRole?.slug ?? 'employee';
  const needsStaffFields = roleNeedsStaffProfile(selectedRoleSlug, newIsSuperAdmin);

  const loadRolePreview = useCallback(async (roleId: string) => {
    if (!roleId) {
      setRolePreviewCount(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/roles?roleId=${encodeURIComponent(roleId)}`, {
        credentials: 'same-origin',
      });
      const json = await res.json();
      if (json?.ok) {
        setRolePreviewCount(Array.isArray(json.permissions) ? json.permissions.length : 0);
      }
    } catch {
      setRolePreviewCount(null);
    }
  }, []);

  const loadStaffMembers = async () => {
    if (!can('settings.team.view')) return;
    try {
      const res = await fetch('/api/admin/users', { method: 'GET', credentials: 'same-origin' });
      const json = await res.json();
      if (json?.ok) {
        const users: StaffUser[] = json.users ?? [];
        const locs: LocationInfo[] = json.allLocations ?? [];
        setStaffMembers(
          users.map((u) => ({
            ...u,
            locations: (u.locations ?? []).filter(isFranchiseLocation),
          })),
        );
        setAllLocations(locs.filter(isFranchiseLocation));
        const roles: WorkspaceRoleOption[] = json.workspaceRoles ?? [];
        setWorkspaceRoles(roles);
        if (!selectedRoleId) {
          const employeeRole = roles.find((r) => r.slug === 'employee') ?? roles[0];
          if (employeeRole?.id) setSelectedRoleId(employeeRole.id);
        }
      } else {
        toast({
          title: 'Error',
          description: json?.error ?? 'Failed to load users',
          variant: 'destructive',
        });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    }
  };

  useEffect(() => { loadStaffMembers(); }, [user?.id]);

  useEffect(() => {
    if (selectedRoleId) void loadRolePreview(selectedRoleId);
  }, [selectedRoleId, loadRolePreview]);

  useEffect(() => {
    if (editRoleId) void loadRolePreview(editRoleId);
  }, [editRoleId, loadRolePreview]);

  const toggleLocation = (id: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  const handleAddStaff = async () => {
    if (!newUsername || !newPassword) {
      toast({ title: 'Error', description: 'Email address and password are required', variant: 'destructive' });
      return;
    }
    if (!newIsSuperAdmin && selectedLocationIds.length === 0) {
      toast({ title: 'Error', description: 'Assign at least one branch', variant: 'destructive' });
      return;
    }
    if (needsStaffFields) {
      if (!newDisplayName.trim()) {
        toast({ title: 'Error', description: 'Full name is required for staff', variant: 'destructive' });
        return;
      }
      if (!newDesignation.trim()) {
        toast({ title: 'Error', description: 'Designation is required for staff', variant: 'destructive' });
        return;
      }
      if (!newMonthlySalary || parseFloat(newMonthlySalary) <= 0) {
        toast({ title: 'Error', description: 'Monthly salary is required for staff', variant: 'destructive' });
        return;
      }
    }
    const roleId = newIsSuperAdmin
      ? workspaceRoles.find((r) => r.slug === 'owner')?.id ?? selectedRoleId
      : selectedRoleId || defaultEmployeeRoleId;
    const roleSlug =
      workspaceRoles.find((r) => r.id === roleId)?.slug ?? selectedRoleSlug;
    const isAdminLogin = newIsSuperAdmin || isAdminLoginRoleSlug(roleSlug);

    setIsLoading(true);
    try {
      const result = await addStaffMember(newUsername, newPassword, isAdminLogin, newIsSuperAdmin, selectedLocationIds, {
        displayName: newDisplayName.trim(),
        designation: newDesignation.trim(),
        phone: newPhone.trim() || undefined,
        monthlySalary: needsStaffFields ? parseFloat(newMonthlySalary) : undefined,
        shiftStartTime: newShiftStart,
        shiftEndTime: newShiftEnd,
        workspaceRoleId: roleId,
      });
      if (result.success) {
        if (result.portalPin && needsStaffFields) {
          setNewPortalPin(result.portalPin);
        }
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
    setEditUsername(staff.email ?? staff.username);
    setEditDisplayName(staff.displayName ?? '');
    setEditDesignation(staff.designation ?? '');
    setEditIsSuperAdmin(staff.isSuperAdmin);
    setEditRoleId(staff.workspaceRoleId ?? staff.workspaceRole?.id ?? defaultEmployeeRoleId);
    setEditLocationIds(staff.locations.map(l => l.id));
    setEditPassword('');
    setShowEditPassword(false);
    setIsChangingPassword(false);
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;
    if (isChangingPassword && !editPassword.trim()) {
      toast({ title: 'Error', description: 'Enter a new password or cancel password change', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const editRole = workspaceRoles.find((r) => r.id === editRoleId);
      const editSlug = editRole?.slug ?? 'employee';
      const isAdminLogin = editIsSuperAdmin || isAdminLoginRoleSlug(editSlug);
      const success = await updateStaffMember(editingStaff.id, {
        username: editUsername,
        displayName: editDisplayName,
        designation: editDesignation,
        isSuperAdmin: editIsSuperAdmin,
        isAdmin: isAdminLogin,
        workspaceRoleId: editRoleId,
        locationIds: editIsSuperAdmin ? [] : editLocationIds,
        ...(isChangingPassword && editPassword.trim() ? { newPassword: editPassword.trim() } : {}),
      });
      if (success) {
        setEditingStaff(null);
        loadStaffMembers();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePortalPin = async (staff: StaffUser) => {
    if (staff.isAdmin || staff.isSuperAdmin) return;
    setIsLoading(true);
    try {
      const result = await ensureStaffPortalPin(staff.id, staff.locations.map((l) => l.id));
      if (result.success) loadStaffMembers();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePortalPin = async (staff: StaffUser) => {
    if (staff.isAdmin || staff.isSuperAdmin) return;
    if (!confirm(`Generate a new portal PIN for ${staff.displayName || staff.username}? The old PIN will stop working.`)) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await regenerateStaffPortalPin(staff.id);
      if (result.success) loadStaffMembers();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    const success = await deleteStaffMember(id);
    if (success) loadStaffMembers();
  };

  const handleResendVerificationEmail = async (staff: StaffUser) => {
    if (!staff.email || staff.emailVerifiedAt) return;
    setIsLoading(true);
    try {
      const ok = await resendStaffVerificationEmail(staff.id);
      if (ok) loadStaffMembers();
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualVerifyEmail = async (staff: StaffUser) => {
    const label = staff.email ?? staff.username;
    if (!staff.email) {
      toast({ title: 'No email', description: 'This user has no login email on file.', variant: 'destructive' });
      return;
    }
    if (staff.emailVerifiedAt) return;
    if (
      !confirm(
        `Mark ${label} as verified without them opening the email link?\n\nOnly do this if you are sure they control this inbox. They will then be able to use Google sign-in with this email.`,
      )
    ) {
      return;
    }
    setIsLoading(true);
    try {
      const ok = await verifyStaffEmailManually(staff.id);
      if (ok) loadStaffMembers();
    } finally {
      setIsLoading(false);
    }
  };

  const resetAddForm = () => {
    setNewUsername('');
    setNewDisplayName('');
    setNewDesignation('');
    setNewPassword('');
    setNewPhone('');
    setNewMonthlySalary('');
    setNewShiftStart('11:00');
    setNewShiftEnd('23:00');
    setShowNewPassword(false);
    setSelectedRoleId(defaultEmployeeRoleId);
    setNewIsSuperAdmin(false);
    setSelectedLocationIds([]);
  };

  const newShiftHours = shiftHoursFromTimes(newShiftStart, newShiftEnd);
  const newHourlyPreview =
    newMonthlySalary && parseFloat(newMonthlySalary) > 0
      ? (
          parseFloat(newMonthlySalary) /
          (new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() * newShiftHours)
        ).toFixed(2)
      : '0.00';

  if (!can('settings.team.view')) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="pt-6">
          <Alert className="border-border/50 bg-muted/20">
            <Shield className="h-4 w-4 text-primary" />
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
    <div className="flex flex-col gap-2">
      {allLocations.map((loc) => {
        const c = SLUG_COLORS[loc.slug] ?? DEFAULT_COLOR;
        const checked = selected.includes(loc.id);
        return (
          <label
            key={loc.id}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
              disabled ? 'opacity-40 pointer-events-none' : ''
            } ${checked ? `${c.bg} ${c.text}` : 'border-border/50 bg-card/20 text-muted-foreground hover:border-border/80 hover:text-foreground'}`}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle(loc.id)}
              className="border-border/50"
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
    <div className="space-y-4 -mt-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {staffMembers.length} member{staffMembers.length === 1 ? '' : 's'}
        </p>
        <Dialog open={isAddingStaff} onOpenChange={(open) => { setIsAddingStaff(open); if (!open) resetAddForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 btn-gradient border-0">
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          </DialogTrigger>
          <DialogContent className={dialogSheet}>
            <DialogHeader>
              <DialogTitle className="text-2xl gradient-text">
                {needsStaffFields ? 'Add Staff Member' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {needsStaffFields
                  ? 'Create login, HR profile, portal PIN, and weekly shift roster in one step. A verification email is sent for Google sign-in.'
                  : 'Create login email and a temporary password. We email a verification link — after they open it, they can sign in with Google using the same email.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Role */}
              <div className="space-y-2">
                <Label className={formLabel}>
                  <Shield className="h-4 w-4" /> Workspace role
                </Label>
                {newIsSuperAdmin ? (
                  <p className="text-xs text-amber-300/80 px-1">Super admins are assigned the Owner role.</p>
                ) : (
                  <>
                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                      <SelectTrigger className={formInput}>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaceRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRole?.description && (
                      <p className="text-xs text-muted-foreground">{selectedRole.description}</p>
                    )}
                    {rolePreviewCount != null && (
                      <p className="text-xs text-muted-foreground">
                        {rolePreviewCount} permission{rolePreviewCount === 1 ? '' : 's'} enabled for this role
                      </p>
                    )}
                  </>
                )}
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
              {!newIsSuperAdmin && (
                <div className="space-y-2">
                  <Label className={formLabel}>
                    <MapPin className="h-4 w-4" /> Branch Access
                  </Label>
                  {allLocations.length > 0 ? (
                    <LocationCheckboxes
                      selected={selectedLocationIds}
                      onToggle={(id) => toggleLocation(id, selectedLocationIds, setSelectedLocationIds)}
                    />
                  ) : (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200/80 text-xs">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      No branches found for this workspace. Add a branch in Settings first, then assign staff here.
                    </div>
                  )}
                </div>
              )}

              {newIsSuperAdmin && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/20 text-muted-foreground text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  Super admins automatically get access to all branches
                </div>
              )}

              <div className="space-y-2">
                <Label className={formLabel}>
                  <IdCard className="h-4 w-4" /> Full name{needsStaffFields ? ' *' : ''}
                </Label>
                <Input
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className={formInput}
                />
                <p className="text-[11px] text-muted-foreground">Shown in the portal, staff directory, and sidebar.</p>
              </div>

              <div className="space-y-2">
                <Label className={formLabel}>
                  <Briefcase className="h-4 w-4" /> Designation{needsStaffFields ? ' *' : ''}
                </Label>
                <Input
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder="e.g. Front desk, Manager"
                  className={formInput}
                />
              </div>

              <div className="space-y-2">
                <Label className={formLabel}>
                  <User className="h-4 w-4" /> Email (login)
                </Label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="staff@yourbusiness.com" className={formInput} />
              </div>

              {needsStaffFields && (
                <>
                  <div className="space-y-2">
                    <Label className={formLabel}>
                      <Phone className="h-4 w-4" /> Phone
                    </Label>
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className={formInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Monthly Salary (₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newMonthlySalary}
                      onChange={(e) => setNewMonthlySalary(e.target.value)}
                      placeholder="7000.00"
                      className={formInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={formLabel}>
                      <Clock className="h-4 w-4" /> Shift timing *
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <Input
                          type="time"
                          value={newShiftStart}
                          onChange={(e) => setNewShiftStart(e.target.value)}
                          className={formInput}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">End</Label>
                        <Input
                          type="time"
                          value={newShiftEnd}
                          onChange={(e) => setNewShiftEnd(e.target.value)}
                          className={formInput}
                        />
                      </div>
                    </div>
                    <div className="p-3 glass-card border-border/50 rounded-lg text-sm mt-2">
                      <p className="text-foreground">
                        Shift: <span className="font-semibold text-primary">{newShiftHours.toFixed(1)} hrs/day</span>
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Hourly rate: ₹{newHourlyPreview}/hr · weekly roster auto-created
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className={formLabel}>
                  <Lock className="h-4 w-4" /> Password
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter password"
                    className={`${formInput} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsAddingStaff(false)} className="border-border/50">Cancel</Button>
              <Button onClick={handleAddStaff} disabled={isLoading} className="btn-gradient border-0">
                {isLoading ? 'Adding...' : 'Add member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

        {/* Portal PIN shown once after staff creation */}
        <Dialog open={!!newPortalPin} onOpenChange={(open) => { if (!open) setNewPortalPin(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2 gradient-text">
                <KeyRound className="h-5 w-5 text-primary" />
                Staff portal PIN
              </DialogTitle>
              <DialogDescription>
                Share this PIN with the employee. They enter it after login when opening My Portal.
                You can view or reset it anytime in the table below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-4xl font-mono font-bold tracking-[0.25em] text-primary">
                {newPortalPin}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewPortalPin(null)} className="w-full btn-gradient border-0">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingStaff} onOpenChange={(open) => { if (!open) setEditingStaff(null); }}>
          <DialogContent className="sm:max-w-md max-h-[min(90vh,720px)]">
            <DialogHeader>
              <DialogTitle className="text-2xl gradient-text">Edit User</DialogTitle>
              <DialogDescription>Update user details and branch access</DialogDescription>
            </DialogHeader>

            {editingStaff && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className={formLabel}>
                    <User className="h-4 w-4" /> Username / email
                  </Label>
                  <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className={formInput} />
                  {editingStaff.email && editingStaff.username !== editingStaff.email && (
                    <p className="text-xs text-muted-foreground">Username: {editingStaff.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className={formLabel}>
                    <IdCard className="h-4 w-4" /> Full name
                  </Label>
                  <Input
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="Display name"
                    className={formInput}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={formLabel}>
                    <Briefcase className="h-4 w-4" /> Designation
                  </Label>
                  <Input
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="Job title"
                    className={formInput}
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Role
                </div>
                {editingStaff.isSuperAdmin ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200/80 text-xs">
                    <Star className="h-3.5 w-3.5" />
                    Super admins always have admin access
                  </div>
                ) : editingStaff.id === user?.id ? (
                  <Badge variant="secondary" className="w-fit">
                    {editingStaff.workspaceRole?.name ?? (editingStaff.isAdmin ? 'Admin' : 'Staff')} (your account)
                  </Badge>
                ) : (
                  <Select value={editRoleId} onValueChange={setEditRoleId}>
                    <SelectTrigger className={formInput}>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaceRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {user.isSuperAdmin && (
                  <label className="flex items-center gap-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 cursor-pointer">
                    <Checkbox
                      checked={editIsSuperAdmin}
                      onCheckedChange={(v) => {
                      setEditIsSuperAdmin(!!v);
                      if (v) {
                        setEditLocationIds([]);
                        const ownerRole = workspaceRoles.find((r) => r.slug === 'owner');
                        if (ownerRole) setEditRoleId(ownerRole.id);
                      }
                    }}
                      className="border-amber-400/50"
                    />
                    <Star className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">Super Admin</span>
                  </label>
                )}

                {!editIsSuperAdmin && (
                  <div className="space-y-2">
                    <Label className={formLabel}>
                      <MapPin className="h-4 w-4" /> Branch Access
                    </Label>
                    {allLocations.length > 0 ? (
                      <LocationCheckboxes
                        selected={editLocationIds}
                        onToggle={(id) => toggleLocation(id, editLocationIds, setEditLocationIds)}
                      />
                    ) : (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200/80 text-xs">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        No branches found for this workspace.
                      </div>
                    )}
                  </div>
                )}

                {/* Password change */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => { setIsChangingPassword(v => !v); setEditPassword(''); setShowEditPassword(false); }}
                    className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors w-full ${
                      isChangingPassword
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/50 bg-card/20 text-muted-foreground hover:border-border/80 hover:text-foreground'
                    }`}
                  >
                    <KeyRound className="h-4 w-4" />
                    {isChangingPassword ? 'Cancel password change' : 'Change password'}
                  </button>
                  {isChangingPassword && (
                    <div className="relative">
                      <Input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Enter new password"
                        className={`${formInput} pr-10`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditingStaff(null)} className="border-border/50">Cancel</Button>
              <Button onClick={handleUpdateStaff} disabled={isLoading} className="btn-gradient border-0">
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Member list */}
        {staffMembers.length > 0 ? (
          <div className="space-y-2">
            {staffMembers.map((staff) => {
              const displayName = staff.displayName?.trim() || staff.email || staff.username;
              const subtitle = staff.email && staff.email !== staff.username ? staff.email : staff.username;
              return (
                <div
                  key={staff.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/10 px-3 py-2.5 sm:px-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {staff.isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-1 sm:gap-3 sm:items-center">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{displayName}</div>
                      <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] h-5 ${staff.isAdmin ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : ''}`}
                      >
                        {staff.workspaceRole?.name ?? (staff.isAdmin ? 'Admin' : 'Staff')}
                      </Badge>
                      {staff.isSuperAdmin && (
                        <Badge className="text-[10px] h-5 bg-amber-400/10 text-amber-300 border-amber-400/30">
                          Super
                        </Badge>
                      )}
                      {staff.designation?.trim() && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {staff.designation}
                        </span>
                      )}
                      {staff.email && !staff.emailVerifiedAt && (
                        <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-200">
                          Unverified
                        </Badge>
                      )}
                      {staff.email && staff.emailVerifiedAt && (
                        <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-200">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {!staff.isAdmin && !staff.isSuperAdmin && staff.portalPin && (
                        <span className="hidden md:inline font-mono text-xs text-muted-foreground">
                          PIN {staff.portalPin}
                        </span>
                      )}
                      {staff.isSuperAdmin ? (
                        <span className="text-[10px] text-muted-foreground">All branches</span>
                      ) : staff.locations.length > 0 ? (
                        <div className="hidden lg:flex flex-wrap gap-1 max-w-[140px]">
                          {staff.locations.slice(0, 2).map((loc) => (
                            <BranchBadge key={loc.id} loc={loc} />
                          ))}
                          {staff.locations.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{staff.locations.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-red-400/80">No branch</span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEdit(staff)}>
                            <Edit className="h-3.5 w-3.5 mr-2" />
                            Edit member
                          </DropdownMenuItem>
                          {staff.email && !staff.emailVerifiedAt && (
                            <>
                              <DropdownMenuItem onClick={() => handleResendVerificationEmail(staff)} disabled={isLoading}>
                                <Send className="h-3.5 w-3.5 mr-2" />
                                Resend verify email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManualVerifyEmail(staff)} disabled={isLoading}>
                                <MailCheck className="h-3.5 w-3.5 mr-2" />
                                Mark verified
                              </DropdownMenuItem>
                            </>
                          )}
                          {!staff.isAdmin && !staff.isSuperAdmin && (
                            <DropdownMenuItem
                              onClick={() => (staff.portalPin ? handleRegeneratePortalPin(staff) : handleCreatePortalPin(staff))}
                              disabled={isLoading}
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-2" />
                              {staff.portalPin ? 'Regenerate PIN' : 'Create portal PIN'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={staff.id === user?.id}
                            onClick={() => handleDeleteStaff(staff.id, staff.username)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Remove member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 py-10 text-center">
            <Users className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No team members yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add staff so they can log in and use My Portal.</p>
          </div>
        )}
    </div>
  );
};

export default StaffManagement;
