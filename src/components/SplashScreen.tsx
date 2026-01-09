import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isNativePlatform } from '@/utils/capacitor';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [show, setShow] = useState(true);
  const isMobile = isNativePlatform();
  
  // Shorter duration and faster animations for mobile
  const actualDuration = isMobile ? 2000 : duration;
  const exitDuration = isMobile ? 400 : 800;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(() => {
        onComplete?.();
      }, exitDuration);
    }, actualDuration);

    return () => clearTimeout(timer);
  }, [actualDuration, exitDuration, onComplete]);

  // Reduce particles for mobile performance
  const particleCount = isMobile ? 8 : 20;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: isMobile ? 1 : 1.1 }}
          transition={{ duration: isMobile ? 0.4 : 0.8 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0a0a1f 0%, #1a1a3e 50%, #2a1a3e 100%)',
          }}
        >
          {/* Animated Background Particles - Optimized for mobile */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(particleCount)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 blur-xl"
                style={{
                  width: Math.random() * 300 + 50,
                  height: Math.random() * 300 + 50,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  x: [0, Math.random() * 100 - 50],
                  y: [0, Math.random() * 100 - 50],
                  scale: [1, Math.random() + 0.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: isMobile ? 1 : Infinity, // Less repetition on mobile
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Glowing Rings - Optimized for mobile */}
          {!isMobile && (
            <>
              <motion.div
                className="absolute"
                animate={{
                  scale: [1, 2.5, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div className="w-96 h-96 rounded-full border-4 border-purple-500/30" />
              </motion.div>

              <motion.div
                className="absolute"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              >
                <div className="w-80 h-80 rounded-full border-4 border-cyan-500/30" />
              </motion.div>
            </>
          )}

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center space-y-8">
            {/* Logo Container with Glow - Optimized */}
            <motion.div
              initial={{ scale: 0, rotate: isMobile ? 0 : -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
              }}
              transition={isMobile ? {
                type: 'tween',
                duration: 0.5,
                ease: 'easeOut',
              } : {
                type: 'spring',
                stiffness: 200,
                damping: 20,
                duration: 1,
              }}
              className="relative"
            >
              {/* Glow Effect - Simplified on mobile */}
              <motion.div
                className="absolute inset-0 blur-3xl"
                animate={isMobile ? {} : {
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: isMobile ? 0 : Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(6, 182, 212, 0.4) 100%)',
                  opacity: isMobile ? 0.6 : undefined,
                }}
              />

              {/* Game Controller Icon - Simplified floating on mobile */}
              <motion.div
                className="relative w-32 h-32 flex items-center justify-center"
                animate={isMobile ? {} : {
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: isMobile ? 0 : Infinity,
                  ease: 'easeInOut',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-full h-full"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.8))',
                  }}
                >
                  <defs>
                    <linearGradient id="controllerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M6 11h4v4H6zm8-6h4v4h-4zm-8 8h4v4H6zm8 0h4v4h-4z"
                    stroke="url(#controllerGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M3 8h2v8H3zm16 0h2v8h-2z"
                    stroke="url(#controllerGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </motion.div>
            </motion.div>

            {/* App Name with Animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center space-y-2"
            >
              <motion.h1
                className="text-6xl font-bold tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.5))',
                }}
                animate={isMobile ? {} : {
                  textShadow: [
                    '0 0 20px rgba(168, 85, 247, 0.5)',
                    '0 0 40px rgba(168, 85, 247, 0.8)',
                    '0 0 20px rgba(168, 85, 247, 0.5)',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: isMobile ? 0 : Infinity,
                  ease: 'easeInOut',
                }}
              >
                CUEPHORIA
              </motion.h1>
              
              <motion.p
                className="text-2xl font-light tracking-[0.3em] text-cyan-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.6))',
                }}
              >
                GAMING
              </motion.p>
            </motion.div>

            {/* Loading Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex flex-col items-center space-y-4"
            >
              {/* Animated Dots */}
              <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              {/* Loading Bar */}
              <div className="w-64 h-1 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>

              <motion.p
                className="text-sm text-gray-400 tracking-wider"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                Loading your gaming experience...
              </motion.p>
            </motion.div>
          </div>

          {/* Corner Accents - Hidden on mobile for performance */}
          {!isMobile && (
            <>
              <motion.div
                className="absolute top-0 left-0 w-32 h-32"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.3, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="w-full h-full border-t-4 border-l-4 border-purple-500/50 rounded-tl-3xl" />
              </motion.div>

              <motion.div
                className="absolute top-0 right-0 w-32 h-32"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.3, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <div className="w-full h-full border-t-4 border-r-4 border-cyan-500/50 rounded-tr-3xl" />
              </motion.div>

              <motion.div
                className="absolute bottom-0 left-0 w-32 h-32"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.3, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <div className="w-full h-full border-b-4 border-l-4 border-pink-500/50 rounded-bl-3xl" />
              </motion.div>

              <motion.div
                className="absolute bottom-0 right-0 w-32 h-32"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.3, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <div className="w-full h-full border-b-4 border-r-4 border-purple-500/50 rounded-br-3xl" />
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
