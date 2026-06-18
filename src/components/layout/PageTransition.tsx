import React, { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { isSessionEndNavigation } from '@/utils/viewTransition';
import { useViewMode } from '@/context/ViewModeContext';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

function getSlideDirection(fromPath: string, toPath: string): number {
  const from = fromPath.split('?')[0];
  const to = toPath.split('?')[0];
  if (from === '/stations' && to === '/pos') return 1;
  if (from === '/pos' && to === '/stations') return -1;
  return 0;
}

// Smooth spring-like cubic-bezier — fast start, gentle settle (no bounce)
const SPRING = [0.22, 1, 0.36, 1] as const;
// Slightly slower settle for the enter, giving content time to breathe
const SPRING_IN = [0.16, 1, 0.3, 1] as const;

/**
 * Wraps nested route content with a smooth, futuristic cross-page transition.
 *
 * Strategy:
 * - `mode="popLayout"` immediately removes the exiting element from layout flow
 *   so the entering page can take over without a height-collapse flash.
 * - Exiting pages shrink to `position:absolute` and fade/slide out in place.
 * - Entering pages rise from a subtle Y offset with an opacity + blur sweep —
 *   a "holographic materialisation" that matches the futuristic dark-violet theme.
 * - Stations ↔ POS keeps the horizontal slide (session checkout flow).
 * - Session-end navigations delegate to the View Transitions API or fall back.
 */
export const PageTransition: React.FC = () => {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const { isMobile } = useViewMode();
  const prevLocationRef = useRef(location);
  useScrollRestoration();

  const direction = getSlideDirection(
    prevLocationRef.current.pathname,
    location.pathname
  );
  const fromSessionEnd = isSessionEndNavigation(location.state);
  const isStationsPos = direction !== 0;

  useLayoutEffect(() => {
    prevLocationRef.current = location;
  }, [location]);

  const transitionKey = `${location.pathname}${location.search}`;

  // ── Reduced-motion: bare swap, no animation ──────────────────────────────
  if (reducedMotion) {
    return <Outlet key={transitionKey} />;
  }

  // ── Session-end handoff: View Transitions API owns the motion ────────────
  if (fromSessionEnd && typeof document !== 'undefined' && 'startViewTransition' in document) {
    return <Outlet key={transitionKey} />;
  }

  // ── Session-end fallback (no VT API): enter-only slide ──────────────────
  if (fromSessionEnd && location.pathname === '/pos') {
    return (
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, x: 36, scale: 0.985 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: SPRING_IN }}
        className="min-h-full min-w-0 w-full max-w-full overflow-x-hidden"
        style={{ willChange: 'opacity, transform' }}
      >
        <Outlet />
      </motion.div>
    );
  }

  // ── Stations ↔ POS: horizontal slide ────────────────────────────────────
  if (isStationsPos) {
    const slideX = direction * 28;
    return (
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={transitionKey}
          initial={{ opacity: 0, x: slideX, scale: 0.993 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -slideX, scale: 0.993 }}
          transition={{ duration: 0.32, ease: SPRING }}
          className="min-h-full min-w-0 w-full max-w-full overflow-x-hidden"
          style={{ willChange: 'opacity, transform' }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Standard page navigation: futuristic materialisation ────────────────
  //
  //  Enter: page rises from 10 px below, fades in, blur clears → feels like
  //         a holographic panel snapping into focus.
  //  Exit:  page fades out and drops back 6 px — subtle, non-distracting.
  //
  //  `mode="popLayout"` immediately pops the exiting element out of the
  //  document flow so the entering element can occupy the space without
  //  a height-collapse repaint. This is the single biggest fix for jitter.

  const enterY = isMobile ? 8 : 12;
  const exitY  = isMobile ? -4 : -6;
  const dur    = isMobile ? 0.22 : 0.28;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{
          opacity: 0,
          y: enterY,
          scale: 0.995,
          filter: 'blur(3px)',
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
        }}
        exit={{
          opacity: 0,
          y: exitY,
          scale: 0.997,
          filter: 'blur(2px)',
        }}
        transition={{
          duration: dur,
          ease: SPRING_IN,
          // Blur clears slightly faster than the translate, feels snappier
          filter: { duration: dur * 0.75, ease: 'easeOut' },
        }}
        className="min-h-full min-w-0 w-full max-w-full overflow-x-hidden"
        style={{ willChange: 'opacity, transform, filter' }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
