
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import MobileErrorBoundary from './components/MobileErrorBoundary.tsx';
import './index.css';
import { flags } from './config/featureFlags';
import { applyTenantTheme } from './branding/applyTenantTheme';
import { DEFAULT_TENANT_BRAND } from './branding/brand';

// ---------------------------------------------------------------------------
// Stale-deploy auto-recovery
// ---------------------------------------------------------------------------
// When a new build is deployed, all code-split chunks get new content hashes.
// Any browser that still has the PREVIOUS index.html cached will try to load
// chunks with the old hashes — they no longer exist, the SPA fallback returns
// index.html (text/html), and strict MIME checking kills the module with
// "Failed to load module script" or "Failed to fetch dynamically imported
// module".
//
// We listen for those specific failures and force a one-shot hard reload so
// the user transparently picks up the new index.html + new chunk hashes.
// A sessionStorage guard prevents reload loops if the root cause is something
// else (network down, corrupt build, etc.).
(() => {
  const RELOAD_GUARD_KEY = "__cuephoria_chunk_reload_at";
  const RELOAD_COOLDOWN_MS = 10_000;

  const looksLikeChunkLoadError = (msg: unknown): boolean => {
    if (typeof msg !== "string") return false;
    const m = msg.toLowerCase();
    return (
      m.includes("failed to fetch dynamically imported module") ||
      m.includes("failed to load module script") ||
      m.includes("loading chunk") ||
      m.includes("loading css chunk") ||
      (m.includes("importing") && m.includes("failed")) ||
      m.includes("module script")
    );
  };

  const tryRecover = (reason: string) => {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
      if (Date.now() - last < RELOAD_COOLDOWN_MS) {
        console.warn("[chunk-recover] skipping reload — recently attempted");
        return;
      }
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
      /* sessionStorage may be disabled; reload anyway */
    }
    console.warn(
      `[chunk-recover] reloading to pick up new build (${reason})`,
    );
    // Bust any CDN/browser cache on the HTML document itself.
    const url = new URL(window.location.href);
    url.searchParams.set("_v", String(Date.now()));
    window.location.replace(url.toString());
  };

  window.addEventListener("error", (event) => {
    const target = event.target as (HTMLScriptElement | HTMLLinkElement | null);
    // Script / stylesheet load failures fire on the element, not window.
    if (
      target &&
      (target.tagName === "SCRIPT" || target.tagName === "LINK") &&
      "src" in target &&
      typeof target.src === "string" &&
      target.src.includes("/assets/")
    ) {
      tryRecover(`asset element error: ${target.src}`);
      return;
    }
    if (event.message && looksLikeChunkLoadError(event.message)) {
      tryRecover(`window error: ${event.message}`);
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg =
      (reason && typeof reason === "object" && "message" in reason
        ? (reason as { message?: unknown }).message
        : reason) ?? "";
    if (looksLikeChunkLoadError(msg)) {
      tryRecover(`unhandled rejection: ${String(msg)}`);
    }
  });
})();

// Apply the default tenant theme synchronously before React mounts.
// Default theme values mirror index.css exactly, so this is a no-op visually
// until a tenant-specific theme is loaded from the server.
if (flags.tenantThemingEnabled) {
  try {
    applyTenantTheme(DEFAULT_TENANT_BRAND);
  } catch (err) {
    console.warn("applyTenantTheme failed; continuing with static CSS.", err);
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MobileErrorBoundary>
      <App />
    </MobileErrorBoundary>
  </React.StrictMode>
);
