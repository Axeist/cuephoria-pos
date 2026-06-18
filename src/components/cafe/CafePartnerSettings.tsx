import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyDisplay } from '@/components/ui/currency';
import type { CafePartner, CafePartnerRow, CafeUser, CafeUserRow, CafeUserRole } from '@/types/cafe.types';
import { transformPartnerRow, transformCafeUserRow } from '@/types/cafe.types';
import { Coffee, Percent, Users, Plus, Pencil, Trash2, Shield, UserCheck, ShoppingCart, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const CafePartnerSettings: React.FC = () => {
  const [partner, setPartner] = useState<CafePartner | null>(null);
  const [users, setUsers] = useState<CafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partnerRate, setPartnerRate] = useState('');
  const [cuephoriaRate, setCuephoriaRate] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // User dialog
  const [userDialog, setUserDialog] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', displayName: '', role: 'staff' as CafeUserRole });

  useEffect(() => {
    (async () => {
      try {
        const loc = await supabase.from('locations').select('id').eq('slug', 'cafe').maybeSingle();
        if (!loc.data) { setLoading(false); return; }

        const [partnerRes, usersRes] = await Promise.all([
          supabase.from('cafe_partners').select('*').eq('location_id', loc.data.id).eq('is_active', true).maybeSingle(),
          supabase.from('cafe_users').select('id, location_id, partner_id, username, display_name, role, is_active, created_at').eq('location_id', loc.data.id).order('created_at'),
        ]);

        if (partnerRes.data) {
          const p = transformPartnerRow(partnerRes.data as unknown as CafePartnerRow);
          setPartner(p);
          setPartnerRate(String(p.partnerRate));
          setCuephoriaRate(String(p.cuephoriaRate));
          setPartnerName(p.name);
          setContactName(p.contactName || '');
          setContactPhone(p.contactPhone || '');
          setContactEmail(p.contactEmail || '');
        }
        if (usersRes.data) {
          setUsers(usersRes.data.map(r => transformCafeUserRow(r as unknown as CafeUserRow)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSavePartner = async () => {
    if (!partner) return;
    const pr = parseFloat(partnerRate);
    const cr = parseFloat(cuephoriaRate);
    if (isNaN(pr) || isNaN(cr) || Math.abs(pr + cr - 100) > 0.01) {
      toast.error('Partner rate + Cuephoria rate must equal 100');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('cafe_partners').update({
        name: partnerName, contact_name: contactName || null, contact_phone: contactPhone || null,
        contact_email: contactEmail || null, partner_rate: pr, cuephoria_rate: cr,
      }).eq('id', partner.id);
      if (error) throw error;
      setPartner(prev => prev ? { ...prev, partnerRate: pr, cuephoriaRate: cr, name: partnerName, contactName, contactPhone, contactEmail } : null);
      toast.success('Partner settings saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!partner || !userForm.username.trim()) return;
    if (editUserId) {
      const updates: Record<string, unknown> = { display_name: userForm.displayName || null, role: userForm.role };
      if (userForm.password) updates.password = userForm.password;
      const { error } = await supabase.from('cafe_users').update(updates).eq('id', editUserId);
      if (error) { toast.error('Failed to update user'); return; }
      setUsers(prev => prev.map(u => u.id === editUserId ? { ...u, displayName: userForm.displayName || undefined, role: userForm.role } : u));
      toast.success('User updated');
    } else {
      if (!userForm.password) { toast.error('Password is required for new users'); return; }
      const loc = await supabase.from('locations').select('id').eq('slug', 'cafe').single();
      const { data, error } = await supabase.from('cafe_users').insert({
        location_id: loc.data!.id, partner_id: partner.id,
        username: userForm.username.trim().toLowerCase(), password: userForm.password,
        display_name: userForm.displayName || null, role: userForm.role,
      }).select('id, location_id, partner_id, username, display_name, role, is_active, created_at').single();
      if (error) { toast.error(error.message.includes('unique') ? 'Username already exists' : 'Failed to create user'); return; }
      setUsers(prev => [...prev, transformCafeUserRow(data as unknown as CafeUserRow)]);
      toast.success('User created');
    }
    setUserDialog(false);
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from('cafe_users').delete().eq('id', id);
    if (error) { toast.error('Failed to delete user'); return; }
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success('User deleted');
  };

  const roleIcons: Record<string, React.ElementType> = { cafe_admin: Shield, staff: UserCheck, kitchen: UserCheck, cashier: UserCheck };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-orange-400" /></div>;
  if (!partner) return <p className="text-sm text-gray-500 font-quicksand">No cafe partner configured. Run the database migration first.</p>;

  return (
    <div className="space-y-6">
      {/* Partner Config */}
      <Card className="glass-card glass-card-interactive border-white/10">
        <CardHeader>
          <CardTitle className="text-base font-heading text-white flex items-center gap-2">
            <Coffee className="h-5 w-5 text-orange-400" /> Partner Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">Configure the cafe partner details and revenue split.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-quicksand">Partner Name</label>
              <Input value={partnerName} onChange={e => setPartnerName(e.target.value)} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-quicksand">Contact Name</label>
              <Input value={contactName} onChange={e => setContactName(e.target.value)} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-quicksand">Contact Phone</label>
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-quicksand">Contact Email</label>
              <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-700/30">
            <h4 className="text-sm font-heading text-white flex items-center gap-2 mb-3">
              <Percent className="h-4 w-4 text-orange-400" /> Revenue Split
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-orange-400 font-quicksand">Partner Rate (%)</label>
                <Input type="number" step="0.01" min="0" max="100" value={partnerRate}
                  onChange={e => { setPartnerRate(e.target.value); setCuephoriaRate(String(Math.max(0, 100 - parseFloat(e.target.value || '0')))); }}
                  className="bg-gray-800/50 border-gray-700 text-white text-lg font-bold" />
              </div>
              <span className="text-gray-500 text-2xl font-bold mt-5">/</span>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-cuephoria-lightpurple font-quicksand">Cuephoria Rate (%)</label>
                <Input type="number" step="0.01" min="0" max="100" value={cuephoriaRate}
                  onChange={e => { setCuephoriaRate(e.target.value); setPartnerRate(String(Math.max(0, 100 - parseFloat(e.target.value || '0')))); }}
                  className="bg-gray-800/50 border-gray-700 text-white text-lg font-bold" />
              </div>
            </div>
          </div>

          <Button onClick={handleSavePartner} disabled={saving}
            className="text-white border-0" style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Partner Settings
          </Button>
        </CardContent>
      </Card>

      {/* Cafe Users */}
      <Card className="glass-card glass-card-interactive border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-heading text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-400" /> Cafe Staff
            </CardTitle>
            <CardDescription className="text-gray-400">Manage cafe user accounts and roles.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setUserDialog(true); setEditUserId(null); setUserForm({ username: '', password: '', displayName: '', role: 'staff' }); }}
            className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-0">
            <Plus className="h-4 w-4 mr-1" /> Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map(u => {
              const RoleIcon = roleIcons[u.role] || ShoppingCart;
              return (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30 group">
                  <div className="flex items-center gap-3">
                    <RoleIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white font-quicksand">{u.displayName || u.username}</p>
                      <p className="text-[10px] text-gray-500">@{u.username} &middot; {u.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => {
                      setEditUserId(u.id);
                      const role =
                        u.role === 'cashier' || u.role === 'kitchen' ? 'staff' : u.role;
                      setUserForm({ username: u.username, password: '', displayName: u.displayName || '', role });
                      setUserDialog(true);
                    }}><Pencil className="h-3.5 w-3.5 text-gray-400 hover:text-white" /></button>
                    <button onClick={() => handleDeleteUser(u.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && <p className="text-sm text-gray-500 font-quicksand text-center py-4">No cafe users yet</p>}
          </div>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader><DialogTitle className="text-white font-heading">{editUserId ? 'Edit User' : 'Add Cafe User'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Username</label>
              <Input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                disabled={!!editUserId} className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">{editUserId ? 'New Password (leave empty to keep)' : 'Password'}</label>
              <Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Display Name</label>
              <Input value={userForm.displayName} onChange={e => setUserForm(f => ({ ...f, displayName: e.target.value }))}
                className="bg-gray-800/50 border-gray-700 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Role</label>
              <div className="flex gap-2">
                {(['staff', 'cafe_admin'] as CafeUserRole[]).map(role => {
                  const Icon = roleIcons[role] || UserCheck;
                  return (
                    <button key={role} onClick={() => setUserForm(f => ({ ...f, role }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-quicksand flex items-center justify-center gap-1.5 transition-all ${
                        userForm.role === role ? 'bg-orange-500/20 border border-orange-500 text-orange-400' : 'bg-gray-800/50 border border-gray-700/30 text-gray-400'
                      }`}>
                      <Icon className="h-4 w-4" /> {role === 'cafe_admin' ? 'Admin' : 'Staff'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(false)} className="border-gray-700 text-gray-400">Cancel</Button>
            <Button onClick={handleSaveUser} disabled={!userForm.username.trim()}
              style={{ background: 'linear-gradient(135deg, #f97316, #6E59A5)' }} className="text-white border-0">
              {editUserId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CafePartnerSettings;
