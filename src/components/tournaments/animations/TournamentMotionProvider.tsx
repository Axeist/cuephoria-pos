import React, { createContext, useContext, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { AnimationIntensity } from '@/types/tournament.types';

type Ctx = {
  reduced: boolean;
  intensity: AnimationIntensity;
  duration: number;
  stagger: number;
};

const TournamentMotionContext = createContext<Ctx>({
  reduced: false,
  intensity: 'full',
  duration: 0.35,
  stagger: 0.05,
});

export function TournamentMotionProvider({
  intensity = 'full',
  children,
}: {
  intensity?: AnimationIntensity;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const value = useMemo<Ctx>(() => {
    if (reduced || intensity === 'off') {
      return { reduced: true, intensity: 'off', duration: 0.01, stagger: 0 };
    }
    if (intensity === 'subtle') {
      return { reduced: false, intensity: 'subtle', duration: 0.2, stagger: 0.03 };
    }
    return { reduced: false, intensity: 'full', duration: 0.35, stagger: 0.05 };
  }, [reduced, intensity]);

  return (
    <TournamentMotionContext.Provider value={value}>{children}</TournamentMotionContext.Provider>
  );
}

export function useTournamentMotion() {
  return useContext(TournamentMotionContext);
}
