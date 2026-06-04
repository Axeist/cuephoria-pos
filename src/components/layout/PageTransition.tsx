import React, { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

function getSlideDirection(fromPath: string, toPath: string): number {
  const from = fromPath.split('?')[0];
  const to = toPath.split('?')[0];
  if (from === '/stations' && to === '/pos') return 1;
  if (from === '/pos' && to === '/stations') return -1;
  return 0;
}

/**
 * Wraps nested route content with a short cross-fade + directional slide.
 * Stations ↔ POS uses a horizontal slide so Quick Shop feels like one flow.
 */
export const PageTransition: React.FC = () => {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const prevLocationRef = useRef(location);

  const direction = getSlideDirection(
    prevLocationRef.current.pathname,
    location.pathname
  );

  useLayoutEffect(() => {
    prevLocationRef.current = location;
  }, [location]);

  const transitionKey = `${location.pathname}${location.search}`;

  if (reducedMotion) {
    return <Outlet />;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{
          opacity: 0,
          x: direction === 0 ? 0 : direction * 18,
        }}
        animate={{ opacity: 1, x: 0 }}
        exit={{
          opacity: 0,
          x: direction === 0 ? 0 : direction * -18,
        }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-full will-change-[opacity,transform]"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
