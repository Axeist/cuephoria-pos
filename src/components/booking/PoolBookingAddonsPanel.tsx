import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PoolBookingAddon } from '@/types/bookingAddons';

interface PoolBookingAddonsPanelProps {
  addons: PoolBookingAddon[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  formatPrice: (amount: number) => string;
}

const PoolBookingAddonsPanel: React.FC<PoolBookingAddonsPanelProps> = ({
  addons,
  selectedIds,
  onToggle,
  formatPrice,
}) => {
  const [termsAddon, setTermsAddon] = useState<PoolBookingAddon | null>(null);
  const enabledAddons = addons.filter((a) => a.enabled);

  if (enabledAddons.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Enhance your 8-Ball / Snooker session
          </Label>
        </div>

        <div className="space-y-2.5">
          {enabledAddons.map((addon) => {
            const checked = selectedIds.has(addon.id);
            const isHighlight = addon.highlight === true;

            return (
              <label
                key={addon.id}
                className={cn(
                  'block rounded-xl border p-3 cursor-pointer transition-all',
                  isHighlight
                    ? checked
                      ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-emerald-500/10 shadow-lg shadow-amber-500/10'
                      : 'border-amber-400/30 bg-amber-500/5 hover:border-amber-400/45'
                    : checked
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-white/10 bg-black/20 hover:border-white/20',
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(addon.id)}
                    className={cn(
                      'mt-0.5 border-white/30',
                      isHighlight && 'border-amber-400/60 data-[state=checked]:bg-amber-500',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'font-semibold text-sm',
                            isHighlight ? 'text-amber-100' : 'text-gray-100',
                          )}
                        >
                          {addon.name}
                        </span>
                        {isHighlight && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/40">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums shrink-0',
                          isHighlight ? 'text-amber-200' : 'text-emerald-300',
                        )}
                      >
                        +{formatPrice(addon.price)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-xs mt-1 leading-relaxed',
                        isHighlight ? 'text-amber-100/80' : 'text-gray-400',
                      )}
                    >
                      {addon.description}
                    </p>
                    {addon.terms_label && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTermsAddon(addon);
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-sky-300/90 hover:text-sky-200 underline-offset-2 hover:underline"
                      >
                        <Info className="h-3 w-3" />
                        {addon.terms_label}
                      </button>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <Dialog open={!!termsAddon} onOpenChange={(open) => !open && setTermsAddon(null)}>
        <DialogContent className="bg-cuephoria-dark border border-white/15 max-w-md">
          <DialogHeader>
            <DialogTitle>{termsAddon?.name} — Terms</DialogTitle>
            <DialogDescription className="text-left text-gray-300 whitespace-pre-wrap pt-2">
              {termsAddon?.terms_body || 'Terms & conditions apply to this add-on.'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PoolBookingAddonsPanel;
