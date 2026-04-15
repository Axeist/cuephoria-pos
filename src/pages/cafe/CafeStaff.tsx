import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Users, Plus, Pencil, Trash2, Search, X, Loader2,
  Shield, ShoppingCart, CookingPot, UserCheck, UserX, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

type StaffRole = 'cafe_admin' | 'cashier' | 'kitchen' | 'staff';

interface StaffUser {
  id: string;
  location_id: string;
  username: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
}

const ROLE_CONFIG: Record<StaffRole, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  cafe_admin: { label: 'Admin', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Shield },
  staff:      { label: 'Staff', color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: UserCheck },
  cashier:    { label: 'Cashier', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: ShoppingCart },
  kitchen:    { label: 'Kitchen', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: CookingPot },
};

const CafeStaff: React.FC = () => {
  const { user } = useCafeAuth();
  const locationId = user?.locationId;

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', password: '', confirmPassword: '', display_name: '', role: 'staff' as StaffRole });
  const [isAdding, setIsAdding] = useState(false);

  // Edit dialog
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ display_name: '', role: 'cashier' as StaffRole, is_active: true });
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cafe_users')
        .select('id, location_id, username, display_name, role, is_active, created_at')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStaff((data as StaffUser[]) || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const q = searchQuery.toLowerCase();
    return staff.filter(s =>
      s.display_name.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  }, [staff, searchQuery]);

  const stats = useMemo(() => ({
    total: staff.length,
    active: staff.filter(s => s.is_active).length,
    inactive: staff.filter(s => !s.is_active).length,
    admins: staff.filter(s => s.role === 'cafe_admin' && s.is_active).length,
  }), [staff]);

  /* ───────── Add Staff ───────── */
  const resetAddForm = () => setAddForm({ username: '', password: '', confirmPassword: '', display_name: '', role: 'staff' });

  const handleAdd = async () => {
    const { username, password, confirmPassword, display_name, role } = addForm;
    if (!username.trim() || !password || !display_name.trim()) {
      toast.error('Username, password, and display name are required');
      return;
    }
    if (username.trim().length < 3) { toast.error('Username must be at least 3 characters'); return; }
    if (password.length < 4) { toast.error('Password must be at least 4 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setIsAdding(true);
    try {
      const { data: existing } = await supabase
        .from('cafe_users')
        .select('id')
        .eq('username', username.trim().toLowerCase())
        .eq('location_id', locationId!)
        .maybeSingle();
      if (existing) { toast.error('Username already exists at this location'); setIsAdding(false); return; }

      const { error } = await supabase.from('cafe_users').insert({
        location_id: locationId!,
        partner_id: user!.partnerId,
        username: username.trim().toLowerCase(),
        password,
        display_name: display_name.trim(),
        role,
        is_active: true,
      });
      if (error) throw error;
      toast.success(`${display_name.trim()} added successfully`);
      setIsAddOpen(false);
      resetAddForm();
      fetchStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add staff');
    } finally {
      setIsAdding(false);
    }
  };

  /* ───────── Edit Staff ───────── */
  const openEdit = (s: StaffUser) => {
    setEditingStaff(s);
    setEditForm({ display_name: s.display_name, role: s.role, is_active: s.is_active });
  };

  const handleEdit = async () => {
    if (!editingStaff) return;
    if (!editForm.display_name.trim()) { toast.error('Display name is required'); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('cafe_users')
        .update({
          display_name: editForm.display_name.trim(),
          role: editForm.role,
          is_active: editForm.is_active,
        })
        .eq('id', editingStaff.id);
      if (error) throw error;
      toast.success(`${editForm.display_name.trim()} updated`);
      setEditingStaff(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update staff');
    } finally {
      setIsSaving(false);
    }
  };

  /* ───────── Delete (soft) ───────── */
  const handleDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('cafe_users')
        .update({ is_active: false })
        .eq('id', deletingStaff.id);
      if (error) throw error;
      toast.success(`${deletingStaff.display_name} deactivated`);
      setDeletingStaff(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deactivate staff');
    } finally {
      setIsDeleting(false);
    }
  };

  /* ───────── Toggle Active ───────── */
  const toggleActive = async (s: StaffUser) => {
    const newStatus = !s.is_active;
    try {
      const { error } = await supabase
        .from('cafe_users')
        .update({ is_active: newStatus })
        .eq('id', s.id);
      if (error) throw error;
      toast.success(`${s.display_name} ${newStatus ? 'activated' : 'deactivated'}`);
      fetchStaff();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle status');
    }
  };

  const RoleBadge = ({ role }: { role: StaffRole }) => {
    const cfg = ROLE_CONFIG[role];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
        <Icon className="h-3 w-3" /> {cfg.label}
      </span>
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text font-heading">Staff Management</h1>
        <div className="flex items-center gap-2">
          <Button onClick={fetchStaff} variant="outline" size="icon"
            className="h-9 w-9 border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-800">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => { resetAddForm(); setIsAddOpen(true); }}
            className="bg-gradient-to-r from-orange-500 to-cuephoria-purple hover:opacity-90 text-white text-xs sm:text-sm h-9 sm:h-10">
            <Plus className="h-4 w-4 mr-1.5" /> Add Staff
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'text-blue-400' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'text-green-400' },
          { label: 'Inactive', value: stats.inactive, icon: UserX, color: 'text-red-400' },
          { label: 'Admins', value: stats.admins, icon: Shield, color: 'text-purple-400' },
        ].map(s => (
          <Card key={s.label} className="bg-gradient-to-br from-gray-900/95 to-gray-800/90 border-gray-700/30">
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className={`text-lg sm:text-xl font-bold ${s.color} font-heading`}>{s.value}</p>
                <p className="text-xs text-gray-500 font-quicksand truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, username, or role..."
            className="pl-8 font-quicksand h-9"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500 font-quicksand ml-auto flex-shrink-0">
          {filteredStaff.length} of {staff.length}
        </span>
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-quicksand text-lg">No staff found</p>
          <p className="font-quicksand text-sm text-gray-600 mt-1">
            {staff.length === 0 ? 'Add your first staff member to get started' : 'Try a different search'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStaff.map(s => (
            <Card key={s.id}
              className={`group overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 bg-gradient-to-br from-gray-900/60 to-gray-800/60 border-gray-700/40 ${
                !s.is_active ? 'opacity-60' : ''
              }`}>
              <CardContent className="p-4 space-y-3">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      s.is_active
                        ? 'bg-gradient-to-br from-orange-600 to-cuephoria-purple'
                        : 'bg-gray-700'
                    }`}>
                      <span className="text-white font-semibold text-sm">
                        {s.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.display_name}</p>
                      <p className="text-xs text-gray-500 font-mono truncate">@{s.username}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Role + joined */}
                <div className="flex items-center justify-between">
                  <RoleBadge role={s.role} />
                  <span className="text-xs text-gray-500 font-quicksand">
                    Joined {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline"
                    className="flex-1 h-8 text-xs bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0"
                    onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline"
                    className={`flex-1 h-8 text-xs border-0 ${
                      s.is_active
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                    onClick={() => toggleActive(s)}>
                    {s.is_active ? <><UserX className="h-3 w-3 mr-1" /> Deactivate</> : <><UserCheck className="h-3 w-3 mr-1" /> Activate</>}
                  </Button>
                  {s.is_active && (
                    <Button size="sm" variant="outline"
                      className="h-8 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0 px-2"
                      onClick={() => setDeletingStaff(s)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== ADD STAFF DIALOG ===== */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-400" /> Add New Staff
            </DialogTitle>
            <DialogDescription>
              Create a new cafe staff account for this location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Username *</Label>
              <Input value={addForm.username}
                onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
                placeholder="e.g. john_doe" className="font-quicksand" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Display Name *</Label>
              <Input value={addForm.display_name}
                onChange={e => setAddForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="Full name shown in UI" className="font-quicksand" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-quicksand text-sm">Password *</Label>
                <Input type="password" value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 4 chars" className="font-quicksand" />
              </div>
              <div className="space-y-2">
                <Label className="font-quicksand text-sm">Confirm Password *</Label>
                <Input type="password" value={addForm.confirmPassword}
                  onChange={e => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Re-enter" className="font-quicksand" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Role *</Label>
              <Select value={addForm.role} onValueChange={(v: StaffRole) => setAddForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="font-quicksand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">
                    <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 text-cyan-400" /> Staff (unified workspace)</span>
                  </SelectItem>
                  <SelectItem value="cashier">
                    <span className="flex items-center gap-2"><ShoppingCart className="h-3.5 w-3.5 text-blue-400" /> Cashier</span>
                  </SelectItem>
                  <SelectItem value="kitchen">
                    <span className="flex items-center gap-2"><CookingPot className="h-3.5 w-3.5 text-orange-400" /> Kitchen</span>
                  </SelectItem>
                  <SelectItem value="cafe_admin">
                    <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-purple-400" /> Admin</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetAddForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd}
              disabled={isAdding || !addForm.username.trim() || !addForm.password || !addForm.display_name.trim()}
              className="bg-gradient-to-r from-orange-500 to-cuephoria-purple hover:opacity-90">
              {isAdding
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</>
                : <><Plus className="h-4 w-4 mr-1" /> Add Staff</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT STAFF DIALOG ===== */}
      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent className="max-w-md animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-400" /> Edit Staff
            </DialogTitle>
            <DialogDescription>
              Update details for <span className="font-semibold text-white">{editingStaff?.display_name}</span> (@{editingStaff?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Display Name *</Label>
              <Input value={editForm.display_name}
                onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                className="font-quicksand" autoFocus />
            </div>
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Role</Label>
              <Select value={editForm.role} onValueChange={(v: StaffRole) => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="font-quicksand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">
                    <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 text-cyan-400" /> Staff (unified workspace)</span>
                  </SelectItem>
                  <SelectItem value="cashier">
                    <span className="flex items-center gap-2"><ShoppingCart className="h-3.5 w-3.5 text-blue-400" /> Cashier</span>
                  </SelectItem>
                  <SelectItem value="kitchen">
                    <span className="flex items-center gap-2"><CookingPot className="h-3.5 w-3.5 text-orange-400" /> Kitchen</span>
                  </SelectItem>
                  <SelectItem value="cafe_admin">
                    <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-purple-400" /> Admin</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-quicksand text-sm">Status</Label>
              <Select value={editForm.is_active ? 'active' : 'inactive'}
                onValueChange={v => setEditForm(f => ({ ...f, is_active: v === 'active' }))}>
                <SelectTrigger className="font-quicksand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 text-green-400" /> Active</span>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <span className="flex items-center gap-2"><UserX className="h-3.5 w-3.5 text-red-400" /> Inactive</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving || !editForm.display_name.trim()}
              className="bg-gradient-to-r from-orange-500 to-cuephoria-purple hover:opacity-90">
              {isSaving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION DIALOG ===== */}
      <Dialog open={!!deletingStaff} onOpenChange={() => setDeletingStaff(null)}>
        <DialogContent className="max-w-sm animate-scale-in">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" /> Deactivate Staff
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <span className="font-semibold text-white">{deletingStaff?.display_name}</span>?
              They will no longer be able to log in, but their data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingStaff(null)}>Cancel</Button>
            <Button onClick={handleDelete} disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deactivating...</>
                : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CafeStaff;
