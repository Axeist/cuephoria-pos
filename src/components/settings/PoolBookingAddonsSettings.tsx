import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles, Save, Loader2, MapPin } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { adminFetch } from '@/services/adminFetch';
import {
  DEFAULT_POOL_BOOKING_ADDONS,
  POOL_BOOKING_ADDONS_SETTING_KEY,
  type PoolBookingAddon,
} from '@/types/bookingAddons';
import { mergePoolBookingAddons } from '@/utils/bookingAddons.utils';

const PoolBookingAddonsSettings: React.FC = () => {
  const { toast } = useToast();
  const { activeLocationId, activeLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addons, setAddons] = useState<PoolBookingAddon[]>(DEFAULT_POOL_BOOKING_ADDONS);

  useEffect(() => {
    void fetchAddons();
  }, [activeLocationId]);

  const fetchAddons = async () => {
    if (!activeLocationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('booking_settings')
        .select('setting_value')
        .eq('setting_key', POOL_BOOKING_ADDONS_SETTING_KEY)
        .eq('location_id', activeLocationId)
        .maybeSingle();

      if (error) throw error;
      setAddons(mergePoolBookingAddons(data?.setting_value ?? DEFAULT_POOL_BOOKING_ADDONS));
    } catch (error) {
      console.error('Error fetching pool addons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pool booking add-ons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const upsertSetting = async () => {
    if (!activeLocationId) throw new Error('No branch selected');
    const res = await adminFetch('/api/admin/booking-settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        setting_key: POOL_BOOKING_ADDONS_SETTING_KEY,
        setting_value: addons,
        description: '8-ball / snooker add-ons on public booking',
        location_id: activeLocationId,
      }),
    });
    const json = await res.json();
    if (!json?.ok) throw new Error(json?.error || 'Unknown error');
  };

  const saveAddons = async () => {
    setSaving(true);
    try {
      await upsertSetting();
      toast({ title: 'Saved', description: 'Pool booking add-ons updated.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save add-ons',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAddon = (id: string, patch: Partial<PoolBookingAddon>) => {
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-cuephoria-lightpurple" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <CardTitle>8-Ball / Snooker Add-ons</CardTitle>
          </div>
          {activeLocation && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/15 border-emerald-400/30 text-emerald-300">
              <MapPin className="h-3 w-3" />
              {activeLocation.name}
            </span>
          )}
        </div>
        <CardDescription>
          Optional extras shown on public booking when customers select an 8-ball or snooker table.
          Coaching is pre-selected by default to encourage uptake.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className={`p-4 rounded-lg border space-y-3 ${
              addon.highlight
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-gray-700 bg-gray-800/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {addon.id}
                </Badge>
                {addon.highlight && (
                  <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40 text-[10px]">
                    Highlighted · default on
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Enabled</Label>
                <Switch
                  checked={addon.enabled}
                  onCheckedChange={(v) => updateAddon(addon.id, { enabled: !!v })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Name</Label>
                <Input
                  value={addon.name}
                  onChange={(e) => updateAddon(addon.id, { name: e.target.value })}
                  className="bg-gray-900/60 border-gray-600/60 h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-400">Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={addon.price}
                  onChange={(e) =>
                    updateAddon(addon.id, { price: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="bg-gray-900/60 border-gray-600/60 h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-400">Description (public booking)</Label>
              <Textarea
                value={addon.description}
                onChange={(e) => updateAddon(addon.id, { description: e.target.value })}
                rows={2}
                className="bg-gray-900/60 border-gray-600/60 text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={addon.default_selected}
                onCheckedChange={(v) => updateAddon(addon.id, { default_selected: !!v })}
              />
              <Label className="text-sm text-gray-300">Pre-selected when customer books pool/snooker</Label>
            </div>

            {addon.terms_label !== undefined && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Terms link label</Label>
                  <Input
                    value={addon.terms_label ?? ''}
                    onChange={(e) => updateAddon(addon.id, { terms_label: e.target.value })}
                    className="bg-gray-900/60 border-gray-600/60 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Terms popup text</Label>
                  <Textarea
                    value={addon.terms_body ?? ''}
                    onChange={(e) => updateAddon(addon.id, { terms_body: e.target.value })}
                    rows={3}
                    className="bg-gray-900/60 border-gray-600/60 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        ))}

        <Button
          onClick={saveAddons}
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Add-on Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PoolBookingAddonsSettings;
