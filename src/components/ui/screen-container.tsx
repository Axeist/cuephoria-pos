import * as React from "react";

import { cn } from "@/lib/utils";
import { useViewMode } from "@/context/ViewModeContext";

/**
 * <ScreenContainer>
 *
 * Wraps page bodies with safe-area-aware padding so notched / dynamic-island
 * phones don't crush content under the OS chrome. Desktop is a transparent
 * pass-through unless `padDesktop` is explicitly true.
 *
 * Pages can opt in by replacing their outer `<div className="container">`
 * with `<ScreenContainer>`, which:
 *   - On mobile, adds `padding-bottom: max(N, env(safe-area-inset-bottom))`
 *     when a bottom bar is in play (e.g. `BottomNav`, sticky CTA).
 *   - On mobile, optionally adds `padding-top: env(safe-area-inset-top)` for
 *     pages that own their full viewport.
 */

interface ScreenContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true, also adds bottom padding for safe-area-inset-bottom. Use when
   * the page has a fixed bottom action bar or sits above `BottomNav`.
   *
   * Defaults to `true` for the staff/cafe app shell (legacy `pb-16` on
   * `<main>`), but pages can flip it off when they want flush bottoms.
   */
  withBottomSafeArea?: boolean;
  /**
   * If true, adds top padding for safe-area-inset-top. Most pages don't need
   * this because the app shell handles the top bar — only set when this
   * container *is* the topmost chrome (e.g. full-page mobile splash).
   */
  withTopSafeArea?: boolean;
  /**
   * Apply safe-area padding on desktop too. Off by default — desktop is
   * never notched in practice.
   */
  padDesktop?: boolean;
  /** Extra bottom space (in rem-like values) on mobile to clear a sticky bar. */
  bottomBarHeight?: number;
}

export const ScreenContainer = React.forwardRef<
  HTMLDivElement,
  ScreenContainerProps
>(
  (
    {
      className,
      withBottomSafeArea = true,
      withTopSafeArea = false,
      padDesktop = false,
      bottomBarHeight,
      style,
      ...props
    },
    ref,
  ) => {
    const { isMobile } = useViewMode();
    const shouldPad = isMobile || padDesktop;

    const padStyle: React.CSSProperties = { ...style };
    if (shouldPad) {
      if (withTopSafeArea) {
        padStyle.paddingTop = "max(0px, env(safe-area-inset-top))";
      }
      if (withBottomSafeArea) {
        const base = bottomBarHeight ? `${bottomBarHeight}rem` : "0px";
        padStyle.paddingBottom = `calc(${base} + env(safe-area-inset-bottom))`;
      }
    }

    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        style={padStyle}
        {...props}
      />
    );
  },
);
ScreenContainer.displayName = "ScreenContainer";

export default ScreenContainer;
