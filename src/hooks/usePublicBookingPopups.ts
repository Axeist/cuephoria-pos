import { useQuery } from "@tanstack/react-query";
import type { PublicBookingPopupConfig } from "@/types/publicBookingPopups";
import { EMPTY_PUBLIC_BOOKING_POPUP_CONFIG } from "@/utils/publicBookingPopups";

async function fetchPopups(locationId: string): Promise<PublicBookingPopupConfig> {
  const res = await fetch(
    `/api/public/bookable-stations?location=${encodeURIComponent(locationId)}`,
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    popup_config?: PublicBookingPopupConfig | null;
    error?: string;
  };
  if (!res.ok || json.ok === false) {
    return EMPTY_PUBLIC_BOOKING_POPUP_CONFIG;
  }
  return json.popup_config ?? EMPTY_PUBLIC_BOOKING_POPUP_CONFIG;
}

export function usePublicBookingPopups(publicLocationId: string | null) {
  const q = useQuery({
    queryKey: ["public", "booking-popups", publicLocationId],
    queryFn: () => fetchPopups(publicLocationId!),
    enabled: Boolean(publicLocationId),
    staleTime: 60_000,
    retry: 1,
  });

  return {
    config: q.data ?? EMPTY_PUBLIC_BOOKING_POPUP_CONFIG,
    loading: q.isLoading && Boolean(publicLocationId),
  };
}
