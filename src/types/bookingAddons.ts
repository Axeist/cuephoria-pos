export type PoolBookingAddonId = 'premium_cue' | 'gloves' | 'coaching';

export interface PoolBookingAddon {
  id: PoolBookingAddonId;
  name: string;
  description: string;
  price: number;
  enabled: boolean;
  /** Pre-check on public booking when customer picks 8-ball / snooker */
  default_selected: boolean;
  /** Visual emphasis (coaching session) */
  highlight?: boolean;
  /** Short label e.g. "Terms & conditions apply" */
  terms_label?: string;
  /** Full terms shown in popup */
  terms_body?: string;
  sort_order: number;
}

export interface BookingAddonLineItem {
  id: string;
  name: string;
  price: number;
}

export interface BookingAddonsSnapshot {
  items: BookingAddonLineItem[];
  total: number;
}

export const POOL_BOOKING_ADDONS_SETTING_KEY = 'pool_booking_addons';

export const DEFAULT_POOL_BOOKING_ADDONS: PoolBookingAddon[] = [
  {
    id: 'coaching',
    name: 'Free coaching session',
    description:
      'A quick intro with our trainer — break technique, stance & table positioning. Just ₹5 to reserve your slot.',
    price: 5,
    enabled: true,
    default_selected: true,
    highlight: true,
    sort_order: 0,
  },
  {
    id: 'premium_cue',
    name: 'Premium cue',
    description: 'Upgrade to a premium cue for your session.',
    price: 15,
    enabled: true,
    default_selected: false,
    terms_label: 'Terms & conditions apply',
    terms_body:
      'Premium equipment is provided on loan for your session only. You are responsible for its care while in use. Any damage beyond normal wear may result in a replacement charge per venue policy. By selecting this add-on you agree to these terms.',
    sort_order: 1,
  },
  {
    id: 'gloves',
    name: 'Playing gloves',
    description: 'Premium gloves for a smoother stroke — yours to keep after the session.',
    price: 99,
    enabled: true,
    default_selected: false,
    sort_order: 2,
  },
];
