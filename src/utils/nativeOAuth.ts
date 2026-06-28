import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import type { NavigateFunction } from "react-router-dom";
import { isNativePlatform } from "./capacitor";

export const NATIVE_AUTH_SCHEME = "com.cuephoria.pos";

/** Parse deep link com.cuephoria.pos://auth/complete?mt=... */
export function parseNativeAuthDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${NATIVE_AUTH_SCHEME}:`) return null;
    if (parsed.host !== "auth") return null;
    if (!parsed.pathname.startsWith("/complete")) return null;
    return parsed.searchParams.get("mt");
  } catch {
    return null;
  }
}

export async function openGoogleOAuth(options: {
  intent: "login" | "signup";
  next?: string;
}): Promise<void> {
  if (!isNativePlatform()) return;

  const params = new URLSearchParams({ intent: options.intent, platform: "android" });
  if (options.next) params.set("next", options.next);
  const url = `${window.location.origin}/api/auth/google/start?${params.toString()}`;

  await Browser.open({ url });
}

export function registerNativeOAuthListener(navigate: NavigateFunction): () => void {
  if (!isNativePlatform()) return () => {};

  const sub = App.addListener("appUrlOpen", (event) => {
    const mt = parseNativeAuthDeepLink(event.url);
    if (!mt) return;
    navigate(`/auth/app-complete?mt=${encodeURIComponent(mt)}`, { replace: true });
  });

  return () => {
    sub.then((h) => h.remove());
  };
}

export function handoffToNativeApp(mt: string): void {
  window.location.href = `${NATIVE_AUTH_SCHEME}://auth/complete?mt=${encodeURIComponent(mt)}`;
}
