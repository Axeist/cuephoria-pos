import { useEffect } from "react";
import { markAppBootSuccessful } from "@/utils/chunkRecovery";
import { useDeployVersionMonitor } from "@/hooks/useDeployVersionMonitor";

/** Runs once at app root: clears stale-chunk reload guards and polls for new deploys. */
export function AppBootRecovery() {
  useEffect(() => {
    markAppBootSuccessful();
  }, []);

  useDeployVersionMonitor(true);
  return null;
}
