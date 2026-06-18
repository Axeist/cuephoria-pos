import React, { useEffect, useState } from 'react';
import { useTournamentMotion } from './TournamentMotionProvider';

export function CountUpScore({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const { reduced } = useTournamentMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const steps = Math.min(Math.abs(diff), 20);
    const stepVal = diff / steps;
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      if (step >= steps) {
        setDisplay(value);
        window.clearInterval(id);
      } else {
        setDisplay(Math.round(start + stepVal * step));
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [value, reduced]);

  return <span className={className}>{display}</span>;
}
