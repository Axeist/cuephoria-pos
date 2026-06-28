import { appToast } from "@/lib/appToast";
import { summarizeWorkspaceMemberships } from "@/lib/tenantPortalLabels";
import type { LoginResult } from "@/context/AuthContext";

export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  no_account:
    "No Cuetronix account exists for this Google sign-in. Create a workspace with Google first.",
  account_conflict: "Another Google identity is already linked to this email.",
  no_workspace:
    "This account no longer has access to any workspace. Ask the owner to re-invite you.",
  verify_email_first:
    "Open the verification link we emailed to this address first, then sign in with Google using the same email.",
  invalid_state: "Sign-in session expired. Please try again.",
  expired_state: "Sign-in session expired. Please try again.",
};

export function toastTenantWorkspaceSummary(result: Extract<LoginResult, { ok: true }>) {
  const title = result.portalKindLabel
    ? `Signed in · ${result.portalKindLabel}`
    : "Signed in";
  const desc =
    result.workspaceMemberships && result.workspaceMemberships.length > 0
      ? summarizeWorkspaceMemberships(result.workspaceMemberships)
      : undefined;
  appToast.success(title, desc, { duration: desc ? 7200 : 4200 });
}

export function consumeOauthSearchParams(
  search: string,
  pathname: string,
  onTotp: () => void,
): void {
  const params = new URLSearchParams(search);
  const oauthErr = params.get("oauth_error");
  if (oauthErr) {
    const message =
      OAUTH_ERROR_MESSAGES[oauthErr] || `Google sign-in failed: ${decodeURIComponent(oauthErr)}`;
    appToast.error(message);
    params.delete("oauth_error");
    params.delete("email");
  }
  if (params.get("oauth_totp") === "1") {
    onTotp();
    params.delete("oauth_totp");
  }
  const q = params.toString();
  window.history.replaceState({}, "", q ? `${pathname}?${q}` : pathname);
}
