import React, { useEffect, useState } from 'react';
import type {
  PromoCoupon,
  PromoCouponChannel,
  PromoCouponCustomerGroup,
  PromoCouponDiscountScope,
  PromoCouponDiscountType,
  PromoCouponEligibility,
  PromoCouponGates,
} from '@/types/promoCoupon.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CHANNELS: PromoCouponChannel[] = ['public_booking', 'pos_session', 'venue_payment'];
const CUSTOMER_GROUPS: PromoCouponCustomerGroup[] = [
  'all',
  'members',
  'non_members',
  'card_holders',
  'new_customers',
  'returning_customers',
];

type FormState = Partial<PromoCoupon> & { code: string };

function emptyForm(locationId: string | null): FormState {
  return {
    code: '',
    description: '',
    enabled: true,
    discountType: 'percentage',
    discountValue: 10,
    discountScope: 'whole_booking',
    channels: ['public_booking', 'pos_session'],
    memberOnly: false,
    customerGroups: ['all'],
    allowsOnlinePayment: true,
    allowsVenuePayment: false,
    eligibilityRules: {},
    gates: {},
    stackable: false,
    locationId,
    sortOrder: 0,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PromoCoupon | null;
  locationId: string | null;
  onSave: (coupon: Partial<PromoCoupon> & { code: string }) => Promise<void>;
};

export default function PromoCouponFormDialog({
  open,
  onOpenChange,
  initial,
  locationId,
  onSave,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm(locationId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : emptyForm(locationId));
    }
  }, [open, initial, locationId]);

  const rules = form.eligibilityRules ?? {};
  const gates = form.gates ?? {};

  const patchRules = (patch: Partial<PromoCouponEligibility>) => {
    setForm((f) => ({ ...f, eligibilityRules: { ...rules, ...patch } }));
  };

  const patchGates = (patch: Partial<PromoCouponGates>) => {
    setForm((f) => ({ ...f, gates: { ...gates, ...patch } }));
  };

  const toggleChannel = (ch: PromoCouponChannel) => {
    const cur = form.channels ?? [];
    setForm((f) => ({
      ...f,
      channels: cur.includes(ch) ? cur.filter((c) => c !== ch) : [...cur, ch],
    }));
  };

  const handleSave = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, code: form.code.toUpperCase().trim() });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit coupon' : 'New coupon'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="HH99"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <Input
                value={form.emoji ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                placeholder="⏰"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.discountType ?? 'percentage'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, discountType: v as PromoCouponDiscountType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed ₹</SelectItem>
                  <SelectItem value="flat_rate">Flat rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                type="number"
                value={form.discountValue ?? 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountValue: Number(e.target.value) }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select
                value={form.discountScope ?? 'whole_booking'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, discountScope: v as PromoCouponDiscountScope }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whole_booking">Whole booking</SelectItem>
                  <SelectItem value="per_station_type">Per station type</SelectItem>
                  <SelectItem value="per_station">Per station</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Channels</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => (
                <Button
                  key={ch}
                  type="button"
                  size="sm"
                  variant={(form.channels ?? []).includes(ch) ? 'default' : 'outline'}
                  onClick={() => toggleChannel(ch)}
                >
                  {ch.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Days of week (0=Sun)</Label>
              <Input
                value={(rules.daysOfWeek ?? []).join(',')}
                onChange={(e) => {
                  const days = e.target.value
                    .split(',')
                    .map((s) => Number(s.trim()))
                    .filter((n) => Number.isFinite(n));
                  patchRules({ daysOfWeek: days.length ? days : undefined });
                }}
                placeholder="1,2,3,4,5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Station types</Label>
              <Input
                value={(rules.stationTypes ?? []).join(',')}
                onChange={(e) => {
                  const types = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  patchRules({ stationTypes: types.length ? types : undefined });
                }}
                placeholder="ps5,8ball,vr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Time start</Label>
              <Input
                value={rules.timeRange?.start ?? ''}
                onChange={(e) =>
                  patchRules({
                    timeRange: {
                      start: e.target.value,
                      end: rules.timeRange?.end ?? '16:00',
                    },
                  })
                }
                placeholder="11:00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time end</Label>
              <Input
                value={rules.timeRange?.end ?? ''}
                onChange={(e) =>
                  patchRules({
                    timeRange: {
                      start: rules.timeRange?.start ?? '11:00',
                      end: e.target.value,
                    },
                  })
                }
                placeholder="16:00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Time match</Label>
            <Select
              value={rules.timeMatchMode ?? 'slot_start'}
              onValueChange={(v) =>
                patchRules({
                  timeMatchMode: v as PromoCouponEligibility['timeMatchMode'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slot_start">First slot start</SelectItem>
                <SelectItem value="all_slots">All slots</SelectItem>
                <SelectItem value="any_slot">Any slot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Success message</Label>
            <Input
              value={form.successMessage ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, successMessage: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.enabled ?? true}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
              Enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.stackable ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, stackable: v }))}
              />
              Stackable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.memberOnly ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, memberOnly: v }))}
              />
              Members only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.allowsVenuePayment ?? false}
                onCheckedChange={(v) => setForm((f) => ({ ...f, allowsVenuePayment: v }))}
              />
              Pay at venue
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={gates.requireInstagramFollow ?? false}
                onCheckedChange={(v) => patchGates({ requireInstagramFollow: v })}
              />
              Instagram gate
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={gates.requireStudentConfirm ?? false}
                onCheckedChange={(v) => patchGates({ requireStudentConfirm: v })}
              />
              Student confirm
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Customer groups</Label>
            <div className="flex flex-wrap gap-2">
              {CUSTOMER_GROUPS.map((g) => (
                <Button
                  key={g}
                  type="button"
                  size="sm"
                  variant={(form.customerGroups ?? []).includes(g) ? 'default' : 'outline'}
                  onClick={() => {
                    const cur = form.customerGroups ?? ['all'];
                    const next = cur.includes(g)
                      ? cur.filter((x) => x !== g)
                      : [...cur, g];
                    setForm((f) => ({
                      ...f,
                      customerGroups: next.length ? next : ['all'],
                    }));
                  }}
                >
                  {g}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !form.code.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
