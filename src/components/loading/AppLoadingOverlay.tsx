import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

export type AppLoadingOverlayProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  variant?: 'cafe' | 'default';
};

const AppLoadingOverlay: React.FC<AppLoadingOverlayProps> = ({
  visible,
  title = 'Signing you in',
  subtitle = 'Securing your session…',
  variant = 'default',
}) => {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const gradient =
    variant === 'cafe'
      ? 'from-orange-400 via-amber-400 to-purple-500'
      : 'from-violet-400 via-purple-400 to-indigo-500';

  return (
    <AnimatePresence>
      {visible && mounted && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.25 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
          style={{
            background:
              'linear-gradient(165deg, rgba(5,5,12,0.94) 0%, rgba(15,12,28,0.92) 45%, rgba(8,8,16,0.96) 100%)',
            backdropFilter: 'blur(14px)',
          }}
        >
          {!reduceMotion && (
            <>
              <div
                className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full opacity-40 blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.35), transparent 65%)' }}
              />
              <div
                className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full opacity-35 blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 65%)' }}
              />
            </>
          )}

          <div className="relative flex flex-col items-center max-w-sm text-center">
            <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
              {!reduceMotion && (
                <motion.div
                  className={`absolute inset-[-4px] rounded-full bg-gradient-to-br ${gradient} opacity-60 blur-md`}
                  animate={{ opacity: [0.35, 0.55, 0.35], scale: [0.98, 1.02, 0.98] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {!reduceMotion && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(249,115,22,0.9), rgba(139,92,246,0.9), rgba(249,115,22,0.9))',
                    padding: 2,
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0a0a12]">
                    <Sparkles className={`h-10 w-10 ${variant === 'cafe' ? 'text-orange-300' : 'text-violet-300'}`} />
                  </div>
                </motion.div>
              )}
              {reduceMotion && (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-[#0a0a12]">
                  <Sparkles className={`h-10 w-10 ${variant === 'cafe' ? 'text-orange-300' : 'text-violet-300'}`} />
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-white font-heading tracking-tight mb-1">{title}</h2>
            <p className="text-sm text-gray-400 font-quicksand mb-6">{subtitle}</p>

            <div className="relative h-1.5 w-56 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className={`absolute top-0 bottom-0 w-2/5 rounded-full bg-gradient-to-r ${gradient} shadow-[0_0_12px_rgba(249,115,22,0.35)]`}
                initial={false}
                animate={reduceMotion ? { left: '30%' } : { left: ['-40%', '105%'] }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 1.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.08 }
                }
              />
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-gray-500 font-quicksand">
              <Loader2
                className={`h-3.5 w-3.5 ${reduceMotion ? '' : 'animate-spin'} ${
                  variant === 'cafe' ? 'text-orange-400/80' : 'text-violet-400/80'
                }`}
              />
              Encrypted connection
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLoadingOverlay;
