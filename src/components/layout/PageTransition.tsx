import React, { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { isSessionEndNavigation } from '@/utils/viewTransition';

function getSlideDirection(fromPath: string, toPath: string): number {
  const from = fromPath.split('?')[0];
  const to = toPath.split('?')[0];
  if (from === '/stations' && to === '/pos') return 1;
  if (from === '/pos' && to === '/stations') return -1;
  return 0;
}

const springEase = [0.16, 1, 0.3, 1] as const;

/**
 * Wraps nested route content with a short cross-fade + directional slide.
 * Stations ↔ POS uses a horizontal slide so session checkout feels like one flow.
 * Session-end navigations skip exit animation when View Transitions API handles handoff.
 */
export const PageTransition: React.FC = () => {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const prevLocationRef = useRef(location);

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

  if (reducedMotion) {
    return <Outlet key={transitionKey} />;
  }

  // View Transitions API owns the cross-page motion for session checkout.
  if (fromSessionEnd && typeof document !== 'undefined' && 'startViewTransition' in document) {
    return <Outlet key={transitionKey} />;
  }

  // Session end fallback (no View Transitions): smooth enter-only slide from stations.
  if (fromSessionEnd && location.pathname === '/pos') {
    return (
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, x: 36, scale: 0.985 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: springEase }}
        className="min-h-full will-change-[opacity,transform]"
      >
        <Outlet />
      </motion.div>
    );
  }

  const slideDistance = isStationsPos ? 32 : 14;
  const duration = isStationsPos ? 0.34 : 0.24;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{
          opacity: 0,
          x: direction === 0 ? 0 : direction * slideDistance,
          scale: isStationsPos ? 0.992 : 1,
        }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{
          opacity: 0,
          x: direction === 0 ? 0 : direction * -slideDistance,
          scale: isStationsPos ? 0.992 : 1,
        }}
        transition={{ duration, ease: springEase }}
        className="min-h-full will-change-[opacity,transform]"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
