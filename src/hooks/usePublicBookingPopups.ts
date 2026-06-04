import { useQuery } from "@tanstack/react-query";
import type { PublicBookingPopupConfig } from "@/types/publicBookingPopups";
import { EMPTY_PUBLIC_BOOKING_POPUP_CONFIG } from "@/utils/publicBookingPopups";

type PopupResp = { ok: true; config: PublicBookingPopupConfig | null };

async function fetchPopups(locationId: string): Promise<PublicBookingPopupConfig> {
  const res = await fetch(
    `/api/public/booking-popups?location=${encodeURIComponent(locationId)}`,
  );
  const json = (await res.json()) as PopupResp & { ok?: false; error?: string };
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Failed to load popups (${res.status})`);
  }
  return json.config ?? EMPTY_PUBLIC_BOOKING_POPUP_CONFIG;
}

export function usePublicBookingPopups(publicLocationId: string | null) {
  const q = useQuery({
    queryKey: ["public", "booking-popups", publicLocationId],
    queryFn: () => fetchPopups(publicLocationId!),
    enabled: Boolean(publicLocationId),
    staleTime: 60_000,
  });

  return {
    config: q.data ?? EMPTY_PUBLIC_BOOKING_POPUP_CONFIG,
    loading: q.isLoading && Boolean(publicLocationId),
  };
}
