
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CUETRONIX_ASSETS } from '@/branding/assets';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Show icon-only mark (no wordmark crop). */
  iconOnly?: boolean;
}

const heightMap = {
  sm: 32,
  md: 52,
  lg: 80,
};

const Logo: React.FC<LogoProps> = ({ size = 'md', className, iconOnly = false }) => {
  const isMobile = useIsMobile();
  const height = isMobile ? 36 : heightMap[size] || 52;
  const src = iconOnly ? CUETRONIX_ASSETS.iconUrl : CUETRONIX_ASSETS.logoUrl;

  return (
    <img
      src={src}
      alt={CUETRONIX_ASSETS.logoAlt}
      height={height}
      style={{
        objectFit: 'contain',
        background: 'transparent',
        height,
        width: iconOnly ? height : 'auto',
        maxHeight: height,
        maxWidth: iconOnly ? height : 'min(100%, 240px)',
      }}
      className={`select-none ${className || ''}`}
      draggable={false}
      loading="lazy"
    />
  );
};

export default Logo;
