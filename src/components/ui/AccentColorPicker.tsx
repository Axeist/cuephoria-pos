import React from 'react';
import { ACCENT_COLOR_PRESETS, normalizeHexColor } from '@/utils/colorTheme.utils';
import { cn } from '@/lib/utils';

interface AccentColorPickerProps {
  value: string | null;
  defaultHex: string;
  onChange: (hex: string | null) => void;
  className?: string;
}

export const AccentColorPicker: React.FC<AccentColorPickerProps> = ({
  value,
  defaultHex,
  onChange,
  className,
}) => {
  const resolved = normalizeHexColor(value) ?? defaultHex;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          title="Use type default"
          onClick={() => onChange(null)}
          className={cn(
            'h-8 w-8 rounded-full border-2 transition-transform hover:scale-105',
            value == null ? 'border-white ring-2 ring-white/30' : 'border-white/20'
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
              resolved === hex && value != null
                ? 'border-white ring-2 ring-white/30'
                : 'border-white/15'
            )}
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {value == null
          ? `Using default tint (${defaultHex})`
          : `Custom tint ${resolved}`}
      </p>
    </div>
  );
};
