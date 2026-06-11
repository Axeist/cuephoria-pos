import { useDeployVersionMonitor } from "@/hooks/useDeployVersionMonitor";

/** Polls for new deploys while the tab is open. Boot guard is cleared after splash completes. */
export function AppBootRecovery() {
  useDeployVersionMonitor(true);
  return null;
}
