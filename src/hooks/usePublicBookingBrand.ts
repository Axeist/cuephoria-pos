import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { applyTenantTheme, resetTenantTheme } from "@/branding/applyTenantTheme";
import {
  resolvePublicBookingBrand,
  type PublicWorkspacePayload,
} from "@/utils/publicBookingBrand";

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

export function usePublicBookingBrand(
  publicLocationId: string | null,
  fallbackBranchSlug: string,
) {
  const workspaceQ = useQuery({
    queryKey: ["public", "workspace-by-location", publicLocationId],
    queryFn: () => fetchWorkspaceByLocation(publicLocationId!),
    enabled: Boolean(publicLocationId),
    staleTime: 60_000,
  });

  const resolved = useMemo(
    () => resolvePublicBookingBrand(workspaceQ.data, fallbackBranchSlug),
    [workspaceQ.data, fallbackBranchSlug],
  );

  useEffect(() => {
    applyTenantTheme(resolved.brand, document.documentElement, {
      primary: resolved.primaryHex,
      accent: resolved.accentHex,
    });
    const prevTitle = document.title;
    document.title = `${resolved.displayName} — Book a session`;
    return () => {
      resetTenantTheme();
      document.title = prevTitle;
    };
  }, [resolved]);

  return {
    ...resolved,
    isLiteBranch: resolved.locationSlug === "lite",
    loading: workspaceQ.isLoading && Boolean(publicLocationId),
    workspaceSlug: workspaceQ.data?.slug ?? null,
  };
}
