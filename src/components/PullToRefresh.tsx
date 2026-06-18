import { ReactNode, useRef, useState, useEffect } from 'react';
import { isNativePlatform } from '@/utils/capacitor';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  enabled?: boolean;
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  enabled = true 
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80; // Distance to trigger refresh
  const maxPull = 120; // Maximum pull distance

  // Only enable on native platforms
  const isEnabled = enabled && isNativePlatform();

  useEffect(() => {
    if (!isEnabled) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if scrolled to top
      if (container.scrollTop === 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (refreshing || startY.current === 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      // Only pull down when at top of scroll
      if (diff > 0 && container.scrollTop === 0) {
        e.preventDefault();
        setPulling(true);
        // Apply resistance curve
        const distance = Math.min(Math.sqrt(diff * 30), maxPull);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (refreshing) return;

      if (pullDistance >= threshold) {
        setRefreshing(true);
        setPullDistance(threshold);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          setRefreshing(false);
          setPullDistance(0);
          setPulling(false);
          startY.current = 0;
        }
      } else {
        setPullDistance(0);
        setPulling(false);
        startY.current = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isEnabled, onRefresh, pullDistance, refreshing, threshold]);

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-50"
        style={{
          height: `${pullDistance}px`,
          opacity: pulling || refreshing ? 1 : 0,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {refreshing ? (
            <>
              <div className="w-8 h-8 border-4 border-cuephoria-lightpurple border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-cuephoria-lightpurple font-medium">
                Refreshing...
              </span>
            </>
          ) : (
            <>
              <div
                className="transition-transform duration-200"
                style={{
                  transform: `rotate(${Math.min((pullDistance / threshold) * 180, 180)}deg)`,
                }}
              >
                <svg
                  className="w-8 h-8 text-cuephoria-lightpurple"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
              <span className="text-sm text-cuephoria-lightpurple font-medium">
                {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content with offset when pulling */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
