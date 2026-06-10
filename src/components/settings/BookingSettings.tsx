import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Save, Ticket, Loader2, MapPin, ExternalLink, Megaphone, Layers } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { buildPublicBookingUrl } from '@/utils/publicBookingUrl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import PublicBookingPopupsSettings from '@/components/settings/PublicBookingPopupsSettings';
import PoolBookingAddonsSettings from '@/components/settings/PoolBookingAddonsSettings';

interface Coupon {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  enabled: boolean;
}

const BookingSettings = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  const { activeLocationId, activeLocation } = useLocation();
  
  const [addOpen, setAddOpen] = useState(false);
  
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
    setAddOpen(false);

    toast({
      title: 'Coupon added',
      description: 'Click Save changes to publish on the booking page',
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

  const publicBookingUrl = activeLocation
    ? buildPublicBookingUrl({ branchSlug: activeLocation.slug, locationId: activeLocationId })
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cuephoria-lightpurple" />
      </div>
    );
  }

  return (
    <div className="space-y-6 -mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {activeLocation && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
                activeLocation.slug === 'lite'
                  ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                  : 'bg-purple-500/15 border-purple-400/30 text-purple-300',
              )}
            >
              <MapPin className="h-3 w-3" />
              {activeLocation.name}
            </span>
          )}
          <span>{coupons.length} coupon{coupons.length === 1 ? '' : 's'}</span>
        </div>
        {publicBookingUrl && (
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href={publicBookingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              View booking page
            </a>
          </Button>
        )}
      </div>

      {/* Coupons */}
      <section className="rounded-2xl border border-border/60 bg-background/40 overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Coupon codes</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Toggle saves instantly. Edit values then save changes to publish.
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shrink-0">
                <Plus className="h-3.5 w-3.5" />
                Add coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New coupon</DialogTitle>
                <DialogDescription>Shown on your public booking page for this branch.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newCode">Code</Label>
                    <Input
                      id="newCode"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                      placeholder="SUMMER50"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newValue">
                      Value ({newCoupon.discount_type === 'percentage' ? '%' : '₹'})
                    </Label>
                    <Input
                      id="newValue"
                      type="number"
                      value={newCoupon.discount_value}
                      onChange={(e) =>
                        setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newDescription">Description</Label>
                  <Input
                    id="newDescription"
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                    placeholder="Summer special"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newType">Type</Label>
                  <select
                    id="newType"
                    value={newCoupon.discount_type}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        discount_type: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount (₹)</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addCoupon}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="p-4 sm:p-5 space-y-2">
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No coupons for this branch yet.</p>
          ) : (
            coupons.map((coupon) => (
              <div
                key={coupon.code}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {coupon.code}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}% off`
                        : `₹${coupon.discount_value} off`}
                    </span>
                  </div>
                  <Input
                    value={coupon.description}
                    onChange={(e) => updateCoupon(coupon.code, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-8 text-sm bg-background/60"
                  />
                  <div className="grid grid-cols-2 gap-2 max-w-xs">
                    <select
                      value={coupon.discount_type}
                      onChange={(e) => updateCoupon(coupon.code, 'discount_type', e.target.value)}
                      className="h-8 px-2 bg-background border border-border rounded-md text-xs"
                    >
                      <option value="percentage">%</option>
                      <option value="fixed">₹ fixed</option>
                    </select>
                    <Input
                      type="number"
                      value={coupon.discount_value}
                      onChange={(e) =>
                        updateCoupon(coupon.code, 'discount_value', parseFloat(e.target.value) || 0)
                      }
                      className="h-8 text-sm bg-background/60"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {togglingCode === coupon.code ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={coupon.enabled}
                      onCheckedChange={() => toggleCoupon(coupon.code)}
                      disabled={!!togglingCode}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeCoupon(coupon.code)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {coupons.length > 0 && (
          <div className="border-t border-border/50 px-4 py-3 sm:px-5 flex justify-end">
            <Button size="sm" onClick={saveCoupons} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save changes
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-background/40 overflow-hidden">
        <div className="border-b border-border/50 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Pool add-ons</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Extra options customers can add when booking pool tables.</p>
        </div>
        <div className="p-4 sm:p-5">
          <PoolBookingAddonsSettings />
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-2xl border border-border/60 bg-background/40 overflow-hidden">
          <div className="border-b border-border/50 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Promotional popups</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Timed promos, pay-online nudge, and Instagram follow gate on booking.
            </p>
          </div>
          <div className="p-4 sm:p-5">
            <PublicBookingPopupsSettings />
          </div>
        </section>
      )}
    </div>
  );
};

export default BookingSettings;
