import type {
  BookingAddonsSnapshot,
  PoolBookingAddon,
  PoolBookingAddonId,
} from '@/types/bookingAddons';
import { DEFAULT_POOL_BOOKING_ADDONS } from '@/types/bookingAddons';

export function mergePoolBookingAddons(raw: unknown): PoolBookingAddon[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_POOL_BOOKING_ADDONS.map((a) => ({ ...a }));
  }
  const byId = new Map(DEFAULT_POOL_BOOKING_ADDONS.map((a) => [a.id, { ...a }]));
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const id = String((item as { id?: string }).id || '') as PoolBookingAddonId;
    const base = byId.get(id);
    if (!base) continue;
    const row = item as Partial<PoolBookingAddon>;
    let name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : base.name;
    let description =
      typeof row.description === 'string' && row.description.trim()
        ? row.description.trim()
        : base.description;
    // Migrate legacy default copy that incorrectly said "free" for a paid add-on
    if (id === 'coaching' && /^free coaching/i.test(name)) {
      name = base.name;
      description = base.description;
    }
    byId.set(id, {
      ...base,
      name,
      description,
      price: typeof row.price === 'number' && Number.isFinite(row.price) ? row.price : base.price,
      enabled: row.enabled !== false,
      default_selected: row.default_selected === true,
      highlight: row.highlight === true || base.highlight === true,
      terms_label:
        typeof row.terms_label === 'string' ? row.terms_label : base.terms_label,
      terms_body: typeof row.terms_body === 'string' ? row.terms_body : base.terms_body,
      sort_order: typeof row.sort_order === 'number' ? row.sort_order : base.sort_order,
    });
  }
  return [...byId.values()].sort((a, b) => a.sort_order - b.sort_order);
}

export function buildBookingAddonsSnapshot(
  config: PoolBookingAddon[],
  selectedIds: Iterable<string>,
): BookingAddonsSnapshot | null {
  const selected = new Set(selectedIds);
  const items = config
    .filter((a) => a.enabled && selected.has(a.id))
    .map((a) => ({ id: a.id, name: a.name, price: a.price }));
  if (items.length === 0) return null;
  return {
    items,
    total: items.reduce((sum, i) => sum + i.price, 0),
  };
}

export function calculatePoolAddonTotal(
  config: PoolBookingAddon[],
  selectedIds: Iterable<string>,
): number {
  return buildBookingAddonsSnapshot(config, selectedIds)?.total ?? 0;
}

export function parseBookingAddonsSnapshot(raw: unknown): BookingAddonsSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { items?: unknown; total?: unknown };
  if (!Array.isArray(obj.items) || obj.items.length === 0) return null;
  const items = obj.items
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as { id?: string; name?: string; price?: number };
      const price = Number(r.price);
      if (!r.id || !r.name || !Number.isFinite(price)) return null;
      return { id: String(r.id), name: String(r.name), price };
    })
    .filter((x): x is { id: string; name: string; price: number } => Boolean(x));
  if (items.length === 0) return null;
  const total = Number(obj.total);
  return {
    items,
    total: Number.isFinite(total) ? total : items.reduce((s, i) => s + i.price, 0),
  };
}

export function formatBookingAddonsSummary(snapshot: BookingAddonsSnapshot | null | undefined): string {
  if (!snapshot?.items?.length) return '';
  return snapshot.items.map((i) => `${i.name} (₹${i.price})`).join(', ');
}
