/**
 * Official Cuetronix product marks (served from /public/branding).
 * Use these for the app shell, favicon, PWA, login, and marketing surfaces.
 * Tenant workspaces may override logo/icon via organization branding settings.
 */
export const CUETRONIX_ASSETS = {
  logoUrl: "/branding/cuetronix-logo.png",
  iconUrl: "/branding/cuetronix-icon.png",
  faviconUrl: "/branding/cuetronix-favicon.png",
  appleTouchIconUrl: "/branding/cuetronix-apple-touch-icon.png",
  icon192Url: "/branding/cuetronix-icon-192.png",
  logoAlt: "Cuetronix",
  /** Full logo aspect ratio (width / height). */
  logoAspectRatio: 1024 / 736,
} as const;
