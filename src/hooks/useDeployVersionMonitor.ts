import { useEffect } from "react";
import {
  fetchRemoteBuildId,
  getAppBuildId,
  tryChunkRecoveryReload,
} from "@/utils/chunkRecovery";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * While the tab is open, detect new production deploys and reload before the
 * user navigates to a route whose lazy chunk no longer exists.
 */
export function useDeployVersionMonitor(enabled = true): void {
  useEffect(() => {
    if (!enabled || import.meta.env.DEV) return;

    const localBuildId = getAppBuildId();
    if (!localBuildId || localBuildId === "dev") return;

    let cancelled = false;

    const check = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      const remote = await fetchRemoteBuildId();
      if (!remote || cancelled) return;
      if (remote !== localBuildId) {
        console.warn(
          `[deploy-monitor] new build detected (${localBuildId} → ${remote})`,
        );
        tryChunkRecoveryReload("deploy version changed");
      }
    };

    const interval = window.setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    void check();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
