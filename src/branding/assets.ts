/**
 * Official Cuetronix product marks (served from /public/branding).
 * - logoUrl: horizontal wordmark for headers, footers, and auth panels
 * - iconUrl: illustrated mark for favicons, sidebars, splash, and square chips
 * Tenant workspaces may override logo/icon via organization branding settings.
 */
export const CUETRONIX_ASSETS = {
  logoUrl: "/branding/cuetronix-logo.png",
  iconUrl: "/branding/cuetronix-icon.png",
  faviconUrl: "/branding/cuetronix-favicon.png",
  appleTouchIconUrl: "/branding/cuetronix-apple-touch-icon.png",
  icon192Url: "/branding/cuetronix-icon-192.png",
  logoAlt: "Cuetronix",
  /** Wordmark aspect ratio (width / height), trimmed asset. */
  logoAspectRatio: 651 / 64,
  /** Square illustrated mark aspect ratio. */
  iconAspectRatio: 1,
} as const;
