import { useQuery } from "@tanstack/react-query";
import type { ResolvedBookingSlotConfig } from "@/types/bookingSlotConfig";
import {
  DEFAULT_MINIMUM_BOOKING_MINUTES,
  DEFAULT_SLOT_INTERVAL_MINUTES,
  DEFAULT_WORKSPACE_SLOT_DEFAULTS,
  resolveBookingSlotConfig,
} from "@/utils/bookingSlotConfig";

const FALLBACK: ResolvedBookingSlotConfig = resolveBookingSlotConfig(
  DEFAULT_WORKSPACE_SLOT_DEFAULTS,
  null,
);

async function fetchPublicBookingSlotConfig(
  locationId: string,
): Promise<ResolvedBookingSlotConfig> {
  const res = await fetch(
    `/api/public/booking-slot-config?location=${encodeURIComponent(locationId)}`,
  );
  const json = await res.json().catch(() => ({}));
  if (!json?.ok || !json.config) return FALLBACK;
  const c = json.config as ResolvedBookingSlotConfig;
  return {
    slot_interval_minutes: c.slot_interval_minutes === 30 ? 30 : DEFAULT_SLOT_INTERVAL_MINUTES,
    minimum_booking_minutes:
      c.minimum_booking_minutes === 30 ? 30 : DEFAULT_MINIMUM_BOOKING_MINUTES,
    slots_per_minimum: c.slots_per_minimum === 2 ? 2 : 1,
    from_workspace_defaults: c.from_workspace_defaults !== false,
  };
}

export function usePublicBookingSlotConfig(locationId: string | null) {
  const q = useQuery({
    queryKey: ["public-booking-slot-config", locationId],
    queryFn: () => fetchPublicBookingSlotConfig(locationId!),
    enabled: Boolean(locationId),
    staleTime: 60_000,
  });

  return {
    config: q.data ?? FALLBACK,
    loading: q.isLoading && Boolean(locationId),
  };
}
