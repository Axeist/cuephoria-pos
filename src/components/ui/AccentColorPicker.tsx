import React, { useMemo, useState } from 'react';
import {
  ACCENT_COLOR_PRESETS,
  ACCENT_GRADIENT_PRESETS,
  accentColorLabel,
  encodeGradientAccent,
  normalizeHexColor,
  parseAccentColor,
} from '@/utils/colorTheme.utils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AccentColorPickerProps {
  value: string | null;
  defaultHex: string;
  onChange: (value: string | null) => void;
  className?: string;
}

export const AccentColorPicker: React.FC<AccentColorPickerProps> = ({
  value,
  defaultHex,
  onChange,
  className,
}) => {
  const parsed = parseAccentColor(value);
  const [customHex, setCustomHex] = useState('');
  const [gradientFrom, setGradientFrom] = useState('#8B5CF6');
  const [gradientTo, setGradientTo] = useState('#EC4899');

  const isSelectedSolid = (hex: string) =>
    parsed.kind === 'solid' && parsed.hex === hex.toUpperCase();

  const isSelectedGradient = (from: string, to: string) =>
    parsed.kind === 'gradient' &&
    parsed.from === from.toUpperCase() &&
    parsed.to === to.toUpperCase();

  const resolvedLabel = useMemo(
    () => accentColorLabel(value, defaultHex),
    [value, defaultHex]
  );

  const applyCustomHex = () => {
    const hex = normalizeHexColor(customHex);
    if (hex) onChange(hex);
  };

  const applyCustomGradient = () => {
    const encoded = encodeGradientAccent(gradientFrom, gradientTo);
    if (encoded) onChange(encoded);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Solid
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            title="Use type default"
            onClick={() => onChange(null)}
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-transform hover:scale-105',
              parsed.kind === 'none' ? 'border-white ring-2 ring-white/30' : 'border-white/20'
            )}
            style={{
              background: `conic-gradient(from 180deg, ${defaultHex}, ${defaultHex}88, ${defaultHex})`,
            }}
          />
          {ACCENT_COLOR_PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              title={hex}
              onClick={() => onChange(hex)}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-transform hover:scale-105',
                isSelectedSolid(hex)
                  ? 'border-white ring-2 ring-white/30'
                  : 'border-white/15'
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Gradients
        </p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_GRADIENT_PRESETS.map((preset) => {
            const encoded = encodeGradientAccent(preset.from, preset.to, preset.angle);
            return (
              <button
                key={preset.id}
                type="button"
                title={`${preset.from} → ${preset.to}`}
                onClick={() => encoded && onChange(encoded)}
                className={cn(
                  'h-8 w-12 rounded-lg border-2 transition-transform hover:scale-105',
                  isSelectedGradient(preset.from, preset.to)
                    ? 'border-white ring-2 ring-white/30'
                    : 'border-white/15'
                )}
                style={{
                  background: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Custom solid</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              className="h-9 w-12 shrink-0 cursor-pointer p-1"
              value={
                parsed.kind === 'solid'
                  ? parsed.hex
                  : normalizeHexColor(customHex) ?? defaultHex
              }
              onChange={(e) => setCustomHex(e.target.value)}
            />
            <Input
              placeholder="#A855F7"
              className="h-9 font-mono text-xs"
              value={customHex || (parsed.kind === 'solid' ? parsed.hex : '')}
              onChange={(e) => setCustomHex(e.target.value)}
              onBlur={applyCustomHex}
              onKeyDown={(e) => e.key === 'Enter' && applyCustomHex()}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Custom gradient</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="color"
              className="h-9 w-10 shrink-0 cursor-pointer p-1"
              value={parsed.kind === 'gradient' ? parsed.from : gradientFrom}
              onChange={(e) => setGradientFrom(e.target.value)}
            />
            <span className="text-muted-foreground text-xs">→</span>
            <Input
              type="color"
              className="h-9 w-10 shrink-0 cursor-pointer p-1"
              value={parsed.kind === 'gradient' ? parsed.to : gradientTo}
              onChange={(e) => setGradientTo(e.target.value)}
            />
            <button
              type="button"
              className="h-9 rounded-md border border-white/15 px-2 text-[10px] font-semibold hover:bg-white/5"
              onClick={applyCustomGradient}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">{resolvedLabel}</p>
    </div>
  );
};
