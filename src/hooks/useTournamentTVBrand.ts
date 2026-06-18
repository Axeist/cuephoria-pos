import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  resolvePublicBookingBrand,
  type PublicWorkspacePayload,
} from '@/utils/publicBookingBrand';
import type { TournamentTVBrand } from '@/components/tournaments/tournamentTVBrand';

type WorkspaceResp = {
  ok: true;
  workspace: PublicWorkspacePayload | null;
};

async function fetchWorkspaceByLocation(locationId: string): Promise<PublicWorkspacePayload | null> {
  const res = await fetch(
    `/api/public/workspace-by-location?location=${encodeURIComponent(locationId)}`,
  );
  const json = (await res.json()) as WorkspaceResp & { ok?: false; error?: string };
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Failed to load workspace (${res.status})`);
  }
  return json.workspace;
}

/** Workspace brand for tournament TV — read-only, does not mutate document theme. */
export function useTournamentTVBrand(opts: {
  locationId?: string | null;
  branchSlug?: string;
}): TournamentTVBrand {
  const branchSlug = opts.branchSlug ?? 'main';

  const workspaceQ = useQuery({
    queryKey: ['tournament-tv', 'workspace-by-location', opts.locationId],
    queryFn: () => fetchWorkspaceByLocation(opts.locationId!),
    enabled: Boolean(opts.locationId),
    staleTime: 60_000,
  });

  return useMemo(() => {
    const resolved = resolvePublicBookingBrand(workspaceQ.data, branchSlug);
    return {
      displayName: resolved.displayName,
      tagline: resolved.tagline,
      logoUrl: resolved.logoUrl,
      primaryHex: resolved.primaryHex,
      accentHex: resolved.accentHex,
    };
  }, [workspaceQ.data, branchSlug]);
}
