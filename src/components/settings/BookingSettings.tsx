import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Save, Calendar, Ticket, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocation } from '@/context/LocationContext';

interface Coupon {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  enabled: boolean;
}

interface EventSettings {
  name: string;
  description: string;
}

const BookingSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  const { activeLocationId, activeLocation } = useLocation();
  
  // Event settings state
  const [eventName, setEventName] = useState('IIM Event');
  const [eventDescription, setEventDescription] = useState('Choose VR (15m) or PS5 Gaming (30m)');
  
  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCoupon, setNewCoupon] = useState<Coupon>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    enabled: true
  });

  useEffect(() => {
    fetchSettings();
  }, [activeLocationId]);

  const fetchSettings = async () => {
    if (!activeLocationId) return;
    setLoading(true);
    try {
      // @ts-ignore - booking_settings table will exist after migration
      const { data: eventData, error: eventError } = await supabase
        .from('booking_settings')
        .select('setting_value')
        .eq('setting_key', 'event_name')
        .eq('location_id', activeLocationId)
        .maybeSingle();

      if (eventError) throw eventError;

      if (eventData) {
        const eventSettings = eventData.setting_value as EventSettings;
        setEventName(eventSettings.name || 'IIM Event');
        setEventDescription(eventSettings.description || 'Choose VR (15m) or PS5 Gaming (30m)');
      }

      // @ts-ignore - booking_settings table will exist after migration
      const { data: couponsData, error: couponsError } = await supabase
        .from('booking_settings')
        .select('setting_value')
        .eq('setting_key', 'booking_coupons')
        .eq('location_id', activeLocationId)
        .maybeSingle();

      if (couponsError) throw couponsError;

      if (couponsData) {
        const couponsArray = couponsData.setting_value as Coupon[];
        setCoupons(couponsArray || []);
      }

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load booking settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const upsertBookingSetting = async (
    setting_key: string,
    setting_value: unknown,
    description?: string
  ) => {
    if (!activeLocationId) throw new Error('No branch selected');
    const res = await fetch('/api/admin/booking-settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ setting_key, setting_value, description, location_id: activeLocationId }),
    });
    const json = await res.json();
    if (!json?.ok) throw new Error(json?.error || 'Unknown error');
  };

  const saveEventSettings = async () => {
    setSaving(true);
    try {
      await upsertBookingSetting(
        'event_name',
        { name: eventName, description: eventDescription },
        'Name and description for the special event booking category'
      );
      toast({
        title: 'Success',
        description: 'Event settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving event settings:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save event settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const saveCoupons = async () => {
    setSaving(true);
    try {
      await upsertBookingSetting(
        'booking_coupons',
        coupons,
        'List of available coupon codes for bookings'
      );
      toast({
        title: 'Success',
        description: 'Coupons saved successfully'
      });
    } catch (error) {
      console.error('Error saving coupons:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save coupons',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const addCoupon = () => {
    if (!newCoupon.code.trim()) {
      toast({
        title: 'Error',
        description: 'Coupon code is required',
        variant: 'destructive'
      });
      return;
    }

    if (coupons.some(c => c.code.toUpperCase() === newCoupon.code.toUpperCase())) {
      toast({
        title: 'Error',
        description: 'Coupon code already exists',
        variant: 'destructive'
      });
      return;
    }

    setCoupons([...coupons, { ...newCoupon, code: newCoupon.code.toUpperCase() }]);
    setNewCoupon({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      enabled: true
    });

    toast({
      title: 'Coupon Added',
      description: 'Remember to click Save Changes to apply'
    });
  };

  const removeCoupon = (code: string) => {
    setCoupons(coupons.filter(c => c.code !== code));
  };

  const toggleCoupon = async (code: string) => {
    const updated = coupons.map(c =>
      c.code === code ? { ...c, enabled: !c.enabled } : c
    );
    setCoupons(updated);
    setTogglingCode(code);
    try {
      await upsertBookingSetting(
        'booking_coupons',
        updated,
        'List of available coupon codes for bookings'
      );
      const isNowEnabled = updated.find(c => c.code === code)?.enabled;
      toast({
        title: isNowEnabled ? 'Coupon enabled' : 'Coupon disabled',
        description: `${code} is now ${isNowEnabled ? 'visible' : 'hidden'} on the public booking page`,
      });
    } catch (error) {
      // Revert local state on failure
      setCoupons(coupons);
      toast({
        title: 'Error',
        description: 'Failed to save coupon change',
        variant: 'destructive',
      });
    } finally {
      setTogglingCode(null);
    }
  };

  const updateCoupon = (code: string, field: keyof Coupon, value: any) => {
    setCoupons(coupons.map(c => 
      c.code === code ? { ...c, [field]: value } : c
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cuephoria-lightpurple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          These settings control the public booking page. Changes will be reflected immediately for customers.
        </AlertDescription>
      </Alert>

      {/* Event Name Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cuephoria-lightpurple" />
            <CardTitle>Event Category Settings</CardTitle>
          </div>
          <CardDescription>
            Configure the name and description for the special event booking category
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., IIM Event, NIT Event"
              className="bg-gray-800/60 border-gray-600/60"
            />
            <p className="text-xs text-gray-400">
              This name will appear as a booking category option
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDescription">Event Description</Label>
            <Textarea
              id="eventDescription"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="e.g., Choose VR (15m) or PS5 Gaming (30m)"
              className="bg-gray-800/60 border-gray-600/60"
              rows={2}
            />
            <p className="text-xs text-gray-400">
              Brief description shown under the event name
            </p>
          </div>

          <Button 
            onClick={saveEventSettings}
            disabled={saving}
            className="bg-cuephoria-lightpurple hover:bg-cuephoria-purple"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Event Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Coupons Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-cuephoria-lightpurple" />
              <CardTitle>Coupon Codes</CardTitle>
            </div>
            {activeLocation && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                activeLocation.slug === 'lite'
                  ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                  : 'bg-purple-500/15 border-purple-400/30 text-purple-300'
              }`}>
                <MapPin className="h-3 w-3" />
                {activeLocation.name}
              </span>
            )}
          </div>
          <CardDescription>
            Manage coupon codes for <strong>{activeLocation?.name ?? 'this branch'}</strong>.
            Toggling a coupon saves immediately. Changes only affect this branch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Coupons */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Active Coupons</Label>
            {coupons.length === 0 ? (
              <p className="text-sm text-gray-400">No coupons configured yet</p>
            ) : (
              <div className="space-y-3">
                {coupons.map((coupon) => (
                  <div key={coupon.code} className="flex items-start gap-3 p-4 bg-gray-800/40 rounded-lg border border-gray-700">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {coupon.code}
                        </Badge>
                        <Badge variant={coupon.enabled ? 'default' : 'secondary'}>
                          {coupon.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      
                      <Input
                        value={coupon.description}
                        onChange={(e) => updateCoupon(coupon.code, 'description', e.target.value)}
                        placeholder="Coupon description"
                        className="bg-gray-900/60 border-gray-600/60 h-9"
                      />
                      
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-400">Type</Label>
                          <select
                            value={coupon.discount_type}
                            onChange={(e) => updateCoupon(coupon.code, 'discount_type', e.target.value)}
                            className="w-full h-9 px-3 bg-gray-900/60 border border-gray-600/60 rounded-md text-sm"
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-gray-400">
                            Value ({coupon.discount_type === 'percentage' ? '%' : '₹'})
                          </Label>
                          <Input
                            type="number"
                            value={coupon.discount_value}
                            onChange={(e) => updateCoupon(coupon.code, 'discount_value', parseFloat(e.target.value) || 0)}
                            className="bg-gray-900/60 border-gray-600/60 h-9"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 items-center">
                      {togglingCode === coupon.code ? (
                        <Loader2 className="h-5 w-5 animate-spin text-cuephoria-lightpurple" />
                      ) : (
                        <Switch
                          checked={coupon.enabled}
                          onCheckedChange={() => toggleCoupon(coupon.code)}
                          disabled={!!togglingCode}
                        />
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeCoupon(coupon.code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Add New Coupon */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Add New Coupon</Label>
            <div className="space-y-3 p-4 bg-gray-800/20 rounded-lg border border-gray-700/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="newCode">Coupon Code *</Label>
                  <Input
                    id="newCode"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., SUMMER50"
                    className="bg-gray-900/60 border-gray-600/60 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newValue">
                    Discount Value * ({newCoupon.discount_type === 'percentage' ? '%' : '₹'})
                  </Label>
                  <Input
                    id="newValue"
                    type="number"
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({...newCoupon, discount_value: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 20"
                    className="bg-gray-900/60 border-gray-600/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newDescription">Description</Label>
                <Input
                  id="newDescription"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({...newCoupon, description: e.target.value})}
                  placeholder="e.g., Summer special discount"
                  className="bg-gray-900/60 border-gray-600/60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newType">Discount Type</Label>
                <select
                  id="newType"
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon({...newCoupon, discount_type: e.target.value as 'percentage' | 'fixed'})}
                  className="w-full h-10 px-3 bg-gray-900/60 border border-gray-600/60 rounded-md"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Amount Discount</option>
                </select>
              </div>

              <Button 
                onClick={addCoupon}
                variant="outline"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Coupon
              </Button>
            </div>
          </div>

          <Button 
            onClick={saveCoupons}
            disabled={saving}
            className="w-full bg-cuephoria-lightpurple hover:bg-cuephoria-purple"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Coupon Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingSettings;
