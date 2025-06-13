
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * This custom logo component renders the uploaded graphic for all use cases.
 */
interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  withBounceGlow?: boolean;
  /**
   * Use the colorful brand graphic from the uploaded logo
   * for all logo purposes, scaling with prop or parent container
   */
}

const imgMap = {
  sm: 32,
  md: 52,
  lg: 80,
};

const Logo: React.FC<LogoProps> = ({ size = 'md', className, withBounceGlow = false }) => {
  const isMobile = useIsMobile();
  // Prefer smaller logo for mobile regardless of size prop (for navbar fit)
  const height = isMobile ? 36 : imgMap[size] || 52;
  const width = height; // Make it square for the circular logo

  const logoClasses = `
    select-none 
    ${withBounceGlow ? 'animate-bounce' : ''} 
    ${className || ""}
  `.trim();

  const containerClasses = `
    ${withBounceGlow ? 'animate-pulse-glow' : ''}
    ${withBounceGlow ? 'rounded-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple shadow-lg' : ''}
    ${withBounceGlow ? 'p-2' : ''}
    inline-block
  `.trim();

  return (
    <div className={containerClasses}>
      <img
        src="/lovable-uploads/4cbe5baa-e0fc-48eb-946c-cf808ec0b8fb.png"
        alt="Cuephoria Logo"
        height={height}
        width={width}
        style={{
          objectFit: "contain",
          background: "transparent",
          maxHeight: height, 
          maxWidth: width,
        }}
        className={logoClasses}
        draggable={false}
        loading="lazy"
      />
    </div>
  );
};

export default Logo;
