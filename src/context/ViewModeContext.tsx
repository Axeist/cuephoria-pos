import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isNativePlatform } from "@/utils/capacitor";

/**
 * View-mode infrastructure.
 *
 * Two concepts:
 *
 *  - **Auto detection** — purely viewport / pointer / user-agent driven. Tells us
 *    what the device *looks like* right now.
 *  - **User override** — explicit preference selected via
 *    `PostLoginViewModeDialog` or the user menu. Once set, it wins over
 *    auto-detection until the user clears it.
 *
 * `isMobile` is the single source of truth every page / dialog / primitive
 * should consume (via `useViewMode().isMobile`) so that a tablet user who opts
 * into Mobile mode gets the full mobile layout app-wide, and vice versa.
 *
 * Storage:
 *  - User override → localStorage (`cuephoria_view_mode_v1`).
 *  - Prompt-shown flag (per device, per user kind) → localStorage
 *    (`cuephoria_view_mode_prompt_shown_v1`).
 */

const STORAGE_KEY = "cuephoria_view_mode_v1";
const PROMPT_KEY = "cuephoria_view_mode_prompt_shown_v1";

export const MOBILE_BREAKPOINT = 768;

export type ViewMode = "mobile" | "desktop";
export type ViewModeOverride = ViewMode | null;

interface ViewModeContextValue {
  /** Final resolved view mode (override → auto). */
  mode: ViewMode;
  /** Convenience flag mirroring `mode === 'mobile'`. */
  isMobile: boolean;
  /** What auto-detection would pick right now, ignoring the override. */
  autoDetected: ViewMode;
  /** What the user has explicitly chosen, or `null` if still in auto mode. */
  userOverride: ViewModeOverride;
  /** Should the post-sign-in prompt be shown? */
  shouldPrompt: boolean;
  /** Persist a user choice. Pass `null` to clear back to auto. */
  setOverride: (mode: ViewModeOverride) => void;
  /** Mark the post-sign-in prompt as dismissed (so it doesn't reappear). */
  dismissPrompt: () => void;
  /** Force the prompt to be re-shown (e.g. from settings "Re-ask"). */
  triggerPrompt: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(
  undefined,
);

/**
 * Best-effort device classification using all the cheap signals available
 * in the browser. Falls back to viewport width on SSR / first paint.
 */
function detectAutoMode(): ViewMode {
  if (typeof window === "undefined") return "desktop";

  const width = window.innerWidth;
  if (width < MOBILE_BREAKPOINT) return "mobile";

  // Pointer + UA sniffing helps phones reported with weirdly large widths
  // (e.g. desktop-mode toggles, foldables) and ensures tablets stay desktop.
  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const finePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: fine)").matches;
  const ua = navigator.userAgent || "";
  const phoneUa = /android.*mobile|iphone|ipod|windows phone|iemobile/i.test(ua);

  if (phoneUa && width < 1024) return "mobile";
  if (coarsePointer && width < MOBILE_BREAKPOINT) return "mobile";
  // Mouse / trackpad on a laptop or desktop browser — always desktop layout.
  if (width >= MOBILE_BREAKPOINT && finePointer && !phoneUa) return "desktop";

  return "desktop";
}

function readOverride(): ViewModeOverride {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "mobile" || v === "desktop") return v;
  } catch {
    // localStorage may be blocked (private mode / cookies disabled). Treat
    // as no override and rely entirely on auto detection.
  }
  return null;
}

function readPromptShown(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [autoDetected, setAutoDetected] = useState<ViewMode>(() =>
    detectAutoMode(),
  );
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : MOBILE_BREAKPOINT + 1,
  );
  const [userOverride, setUserOverrideState] = useState<ViewModeOverride>(() =>
    readOverride(),
  );
  const [promptShown, setPromptShown] = useState<boolean>(() =>
    readPromptShown(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame = 0;
    const update = () => {
      setAutoDetected(detectAutoMode());
      setViewportWidth(window.innerWidth);
    };

    const onResize = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  // Cross-tab sync: when another tab flips the preference, mirror it locally
  // so both tabs render the same view immediately.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const v = e.newValue;
        setUserOverrideState(v === "mobile" || v === "desktop" ? v : null);
      } else if (e.key === PROMPT_KEY) {
        setPromptShown(e.newValue === "1");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setOverride = useCallback((next: ViewModeOverride) => {
    setUserOverrideState(next);
    try {
      if (next === null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Ignore — state still flips in memory for this tab.
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    setPromptShown(true);
    try {
      window.localStorage.setItem(PROMPT_KEY, "1");
    } catch {
      // Ignore.
    }
  }, []);

  const triggerPrompt = useCallback(() => {
    setPromptShown(false);
    try {
      window.localStorage.removeItem(PROMPT_KEY);
    } catch {
      // Ignore.
    }
  }, []);

  // Phones always use mobile layout — desktop override cannot shrink usable width.
  // Desktop browsers (auto-detected) always get the classic sidebar + header shell;
  // a stale "mobile" localStorage override must not strip navigation on wide screens.
  const mode: ViewMode = isNativePlatform()
    ? "mobile"
    : viewportWidth < MOBILE_BREAKPOINT
      ? "mobile"
      : autoDetected === "desktop"
        ? "desktop"
        : userOverride ?? autoDetected;

  const value = useMemo<ViewModeContextValue>(
    () => ({
      mode,
      isMobile: mode === "mobile",
      autoDetected,
      userOverride,
      // Only prompt when we've never asked AND the device looks like mobile.
      // Tablet / desktop users don't get nagged — they can still switch from
      // the settings menu.
      shouldPrompt: !isNativePlatform() && !promptShown && autoDetected === "mobile",
      setOverride,
      dismissPrompt,
      triggerPrompt,
    }),
    [
      mode,
      autoDetected,
      userOverride,
      promptShown,
      setOverride,
      dismissPrompt,
      triggerPrompt,
    ],
  );

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};

/**
 * Primary consumer hook. Safe to call without a provider — it falls back to
 * pure auto-detection so existing code paths keep working during the rollout.
 */
export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (ctx) return ctx;

  // Provider-less fallback so this hook never throws. We expose a no-op
  // setOverride/dismissPrompt — anyone calling them outside the provider
  // tree won't get persistence, but won't crash either.
  const auto = typeof window !== "undefined" ? detectAutoMode() : "desktop";
  return {
    mode: auto,
    isMobile: auto === "mobile",
    autoDetected: auto,
    userOverride: null,
    shouldPrompt: false,
    setOverride: () => {},
    dismissPrompt: () => {},
    triggerPrompt: () => {},
  };
}
