/**
 * GoogleButton — "Continue with Google" button used on Login + Signup.
 *
 * It's a server redirect to /api/auth/google/start, so we render a plain
 * anchor. The click handler is only there to show a subtle loading state
 * while the browser navigates to Google.
 */

import React, { useState } from "react";

export interface GoogleButtonProps {
  /** "login" sends existing users straight through; "signup" routes new
   *  users to the workspace-picker page. */
  intent: "login" | "signup";
  /** Optional post-auth destination for login success. */
  next?: string;
  /** Full width (default true). */
  fullWidth?: boolean;
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({
  intent,
  next,
  fullWidth = true,
}) => {
  const [busy, setBusy] = useState(false);
  const params = new URLSearchParams({ intent });
  if (next) params.set("next", next);
  const href = `/api/auth/google/start?${params.toString()}`;

  return (
    <a
      href={href}
      onClick={() => setBusy(true)}
      className={[
        "inline-flex items-center justify-center gap-2.5 h-11 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-zinc-100",
        fullWidth ? "w-full" : "",
      ].join(" ")}
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
      ) : (
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
          <path
            fill="#FFC107"
            d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.5 4.1-5.4 7-10.3 7-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1 7.4 2.8l5.1-5.1C34.6 7.7 29.6 5.7 24 5.7 13.8 5.7 5.6 13.9 5.6 24.1S13.8 42.5 24 42.5c10.6 0 18.4-7.7 18.4-18.4 0-1.2-.1-2.4-.3-3.6z"
          />
          <path
            fill="#FF3D00"
            d="M7.3 14.7l5.9 4.3C14.9 15.1 19.1 12 24 12c2.8 0 5.4 1 7.4 2.8l5.1-5.1C34.6 7 29.6 5 24 5 16.1 5 9.3 9.1 7.3 14.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 43c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5c-2 1.4-4.6 2.2-7.6 2.2-4.9 0-9-3.3-10.5-7.7L7.6 31C10.3 37 16.6 43 24 43z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20.5H42V20.4H24v7.2h11.3c-.7 2-2 3.8-3.8 5l6.5 5.5c3.8-3.4 6.2-8.7 6.2-14 0-1.2-.1-2.4-.3-3.6z"
          />
        </svg>
      )}
      Continue with Google
    </a>
  );
};

export default GoogleButton;
