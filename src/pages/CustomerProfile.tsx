import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Phone,
  Mail,
  Star,
  Trophy,
  Crown,
  LogOut,
  ArrowLeft,
  Edit2,
  Save,
  X,
  Shield,
  Clock,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerSession, clearCustomerSession, formatDate } from '@/utils/customerAuth';
import { toast } from 'sonner';
import BottomNav from '@/components/customer/BottomNav';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(getCustomerSession());
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    if (!customer) {
      navigate('/customer/login');
      return;
    }
    loadCustomerData();
  }, [customer, navigate]);

  const loadCustomerData = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single();

      if (error) throw error;

      setCustomerData(data);
      setEditForm({
        name: data.name,
        email: data.email || ''
      });
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editForm.name,
          email: editForm.email || null
        })
        .eq('id', customer!.id);

      if (error) throw error;

      // Update session
      const updatedSession = {
        ...customer!,
        name: editForm.name,
        email: editForm.email
      };
      localStorage.setItem('cuephoria_customer_session', JSON.stringify(updatedSession));
      setCustomer(updatedSession);

      toast.success('Profile updated successfully');
      setIsEditing(false);
      loadCustomerData();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = () => {
    clearCustomerSession();
    toast.success('Logged out successfully');
    navigate('/customer/login');
  };

  const getMembershipTier = (points: number) => {
    if (points >= 3000) return { name: 'Platinum', color: 'from-purple-400 to-pink-400', icon: Crown };
    if (points >= 1500) return { name: 'Gold', color: 'from-yellow-400 to-orange-400', icon: Trophy };
    if (points >= 500) return { name: 'Silver', color: 'from-gray-300 to-gray-400', icon: Star };
    return { name: 'Bronze', color: 'from-orange-600 to-red-600', icon: Shield };
  };

  if (!customer || !customerData) {
    return (
      <div className="min-h-screen bg-cuephoria-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-cuephoria-purple border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  const tier = getMembershipTier(customerData.loyalty_points);
  const TierIcon = tier.icon;

  return (
    <div className="min-h-screen bg-cuephoria-dark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cuephoria-darker border-b border-gray-800 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customer/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">My Profile</h1>
              <p className="text-xs text-gray-400">Manage your account settings</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-cuephoria-purple/20 to-cuephoria-blue/20 border-cuephoria-lightpurple/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center text-white shadow-lg`}>
                <TierIcon size={36} />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">{customerData.name}</h2>
                <Badge className={`bg-gradient-to-r ${tier.color} text-white mb-2`}>
                  {tier.name} Member
                </Badge>
                <p className="text-sm text-gray-400">Member since {formatDate(customerData.created_at)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
              <div className="text-center">
                <Star className="mx-auto mb-1 text-cuephoria-green" size={20} />
                <p className="text-2xl font-bold text-white">{customerData.loyalty_points}</p>
                <p className="text-xs text-gray-400">Points</p>
              </div>
              <div className="text-center">
                <Clock className="mx-auto mb-1 text-cuephoria-blue" size={20} />
                <p className="text-2xl font-bold text-white">{Math.floor(customerData.total_play_time / 60)}</p>
                <p className="text-xs text-gray-400">Hours</p>
              </div>
              <div className="text-center">
                <Calendar className="mx-auto mb-1 text-cuephoria-orange" size={20} />
                <p className="text-2xl font-bold text-white">{customerData.is_member ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-400">Member</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="bg-cuephoria-darker border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User size={20} className="text-cuephoria-lightpurple" />
                Personal Information
              </h3>
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-cuephoria-lightpurple hover:text-cuephoria-lightpurple/80"
                >
                  <Edit2 size={16} className="mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({
                        name: customerData.name,
                        email: customerData.email || ''
                      });
                    }}
                    className="text-gray-400"
                  >
                    <X size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className="text-cuephoria-green hover:text-cuephoria-green/80"
                  >
                    <Save size={16} className="mr-1" />
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                  <User size={14} />
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="bg-background/50 border-cuephoria-lightpurple/30"
                  />
                ) : (
                  <p className="text-white font-medium">{customerData.name}</p>
                )}
              </div>

              <div>
                <Label className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                  <Phone size={14} />
                  Phone Number
                </Label>
                <p className="text-white font-medium">{customerData.phone}</p>
                <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed</p>
              </div>

              <div>
                <Label className="text-gray-400 text-sm flex items-center gap-2 mb-2">
                  <Mail size={14} />
                  Email Address
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="your@email.com"
                    className="bg-background/50 border-cuephoria-lightpurple/30"
                  />
                ) : (
                  <p className="text-white font-medium">{customerData.email || 'Not set'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="bg-cuephoria-darker border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield size={20} className="text-cuephoria-orange" />
              Account Settings
            </h3>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-gray-700 hover:bg-gray-800"
                onClick={() => toast.info('Password change feature coming soon!')}
              >
                <Shield size={18} className="mr-2" />
                Change Password
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-red-600 text-red-500 hover:bg-red-600 hover:text-white"
                onClick={handleLogout}
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="bg-cuephoria-darker/50 border-gray-800">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">
              Customer ID: {customerData.custom_id || customerData.phone}
            </p>
            <p className="text-xs text-gray-600 mt-1">Cuephoria POS v1.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
