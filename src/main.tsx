
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import MobileErrorBoundary from './components/MobileErrorBoundary.tsx';
import './index.css';
import { flags } from './config/featureFlags';
import { applyTenantTheme } from './branding/applyTenantTheme';
import { DEFAULT_TENANT_BRAND } from './branding/brand';

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
