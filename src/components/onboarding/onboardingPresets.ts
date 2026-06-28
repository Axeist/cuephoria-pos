import type { LucideIcon } from "lucide-react";
import {
  Gamepad2,
  Target,
  CircleDot,
  Footprints,
  Glasses,
  MapPin,
} from "lucide-react";

export type BusinessType =
  | "gaming_lounge"
  | "gaming_turfs"
  | "cafe"
  | "arcade"
  | "club"
  | "billiards"
  | "bowling"
  | "other";

export interface StationSuggestion {
  type: string;
  label: string;
  name: string;
  hourlyRate: number;
  helper: string;
  icon: LucideIcon;
}

export interface ProductSuggestion {
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface BusinessPreset {
  station: StationSuggestion;
  alternates: StationSuggestion[];
  product: ProductSuggestion;
}

const ps5: StationSuggestion = {
  type: "ps5",
  label: "PS5",
  name: "PS5 Station 1",
  hourlyRate: 120,
  helper: "Console gaming — hourly sessions with up to 4 players.",
  icon: Gamepad2,
};

const vr: StationSuggestion = {
  type: "vr",
  label: "VR",
  name: "VR Pod 1",
  hourlyRate: 200,
  helper: "Immersive VR experiences in 15-minute slots.",
  icon: Glasses,
};

const eightBall: StationSuggestion = {
  type: "8ball",
  label: "8-Ball",
  name: "8-Ball Table 1",
  hourlyRate: 100,
  helper: "Pool table sessions billed per hour.",
  icon: CircleDot,
};

const snooker: StationSuggestion = {
  type: "snooker",
  label: "Snooker",
  name: "Snooker Table 1",
  hourlyRate: 150,
  helper: "Full-size snooker table with hourly pricing.",
  icon: Target,
};

const turf: StationSuggestion = {
  type: "turf",
  label: "Turf",
  name: "Turf Court 1",
  hourlyRate: 1800,
  helper: "Outdoor turf or court bookings by the hour.",
  icon: MapPin,
};

const bowling: StationSuggestion = {
  type: "bowling",
  label: "Bowling Lane",
  name: "Lane 1",
  hourlyRate: 600,
  helper: "Lane bookings with shoe rentals and leagues.",
  icon: Footprints,
};

const lounge: StationSuggestion = {
  type: "8ball",
  label: "Lounge Table",
  name: "Lounge Table 1",
  hourlyRate: 150,
  helper: "Table sessions for members and walk-ins.",
  icon: CircleDot,
};

const PRODUCT_BY_TYPE: Record<BusinessType, ProductSuggestion> = {
  gaming_lounge: { name: "Hourly Pass 1H", category: "hourly_pass", price: 180, stock: 999 },
  gaming_turfs: { name: "Cricket Turf Slot (60 min)", category: "turf_booking", price: 1800, stock: 999 },
  cafe: { name: "Cappuccino", category: "coffee", price: 120, stock: 80 },
  arcade: { name: "Arcade Tokens (20)", category: "tokens", price: 100, stock: 200 },
  club: { name: "Monthly Membership", category: "membership", price: 2999, stock: 999 },
  billiards: { name: "Table Time 30 Min", category: "table_time", price: 100, stock: 999 },
  bowling: { name: "Lane Slot 1 Hour", category: "lane_time", price: 600, stock: 999 },
  other: { name: "Welcome Product", category: "snacks", price: 99, stock: 20 },
};

const STATION_BY_TYPE: Record<BusinessType, { station: StationSuggestion; alternates: StationSuggestion[] }> = {
  gaming_lounge: { station: ps5, alternates: [] },
  cafe: { station: { ...ps5, name: "Gaming PC 1", helper: "PC gaming station for cafe combos." }, alternates: [] },
  arcade: { station: vr, alternates: [ps5] },
  billiards: { station: eightBall, alternates: [snooker] },
  club: { station: lounge, alternates: [snooker] },
  gaming_turfs: { station: turf, alternates: [] },
  bowling: { station: bowling, alternates: [] },
  other: { station: ps5, alternates: [eightBall, turf] },
};

export function getBusinessPreset(businessType: BusinessType | ""): BusinessPreset {
  const key = (businessType || "other") as BusinessType;
  const stationConfig = STATION_BY_TYPE[key] ?? STATION_BY_TYPE.other;
  const product = PRODUCT_BY_TYPE[key] ?? PRODUCT_BY_TYPE.other;
  return {
    station: stationConfig.station,
    alternates: stationConfig.alternates,
    product,
  };
}

export function findStationSuggestion(
  businessType: BusinessType | "",
  typeSlug: string,
): StationSuggestion {
  const preset = getBusinessPreset(businessType);
  const all = [preset.station, ...preset.alternates];
  return all.find((s) => s.type === typeSlug) ?? preset.station;
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  gaming_lounge: "Gaming Lounge",
  gaming_turfs: "Gaming Turfs",
  cafe: "Gaming Cafe",
  arcade: "Arcade",
  club: "Club / Lounge",
  billiards: "Billiards / Snooker",
  bowling: "Bowling",
  other: "Your venue",
};
