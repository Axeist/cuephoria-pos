/**
 * Branding presets — curated palettes the workspace owner can one-click apply
 * to swap the active tenant theme. Each preset corresponds 1:1 with the
 * fields stored on `organization_branding` (primary + accent hexes only); the
 * display name / tagline / logos remain untouched so owners keep their
 * copywriting when they experiment with palettes.
 *
 * Add new presets here — they will automatically show up in the picker.
 * Keep the `id` stable so we can persist "last-applied preset" in future.
 */

export type BrandPreset = {
  id: string;
  label: string;
  description: string;
  primary: string; // #rrggbb
  accent: string; // #rrggbb
};

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: "violet-dream",
    label: "Violet Dream",
    description: "The Cuetronix signature — violet → fuchsia.",
    primary: "#7c3aed",
    accent: "#ec4899",
  },
  {
    id: "midnight-blue",
    label: "Midnight Blue",
    description: "Cool and trustworthy — indigo → cyan.",
    primary: "#3b82f6",
    accent: "#06b6d4",
  },
  {
    id: "sunset-pink",
    label: "Sunset Pink",
    description: "Soft and welcoming — rose → violet.",
    primary: "#f43f5e",
    accent: "#a855f7",
  },
  {
    id: "ember-orange",
    label: "Ember Orange",
    description: "High-energy lounge — orange → red.",
    primary: "#f97316",
    accent: "#ef4444",
  },
  {
    id: "forest-green",
    label: "Forest Green",
    description: "Calm and fresh — emerald → teal.",
    primary: "#10b981",
    accent: "#14b8a6",
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    description: "Premium warmth — amber → rose.",
    primary: "#f59e0b",
    accent: "#f43f5e",
  },
  {
    id: "oceanic",
    label: "Oceanic",
    description: "Crisp and modern — sky → teal.",
    primary: "#0ea5e9",
    accent: "#14b8a6",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Editorial monochrome — slate → zinc.",
    primary: "#64748b",
    accent: "#a1a1aa",
  },
];

export function getPresetById(id: string): BrandPreset | undefined {
  return BRAND_PRESETS.find((p) => p.id === id);
}

/** Returns the id of the preset whose hexes match, or null. Case-insensitive. */
export function matchPreset(
  primary: string | undefined | null,
  accent: string | undefined | null,
): BrandPreset | null {
  if (!primary && !accent) return null;
  const p = (primary || "").toLowerCase();
  const a = (accent || "").toLowerCase();
  return (
    BRAND_PRESETS.find(
      (preset) =>
        preset.primary.toLowerCase() === p && preset.accent.toLowerCase() === a,
    ) ?? null
  );
}
