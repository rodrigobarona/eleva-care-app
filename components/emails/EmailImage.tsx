import type { SupportedLocale } from '@/emails/utils/i18n';
import { Img } from '@react-email/img';
import React from 'react';

interface EmailImageProps {
  src: string;
  alt: string; // Required for accessibility
  width?: string | number;
  height?: string | number;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  locale?: SupportedLocale;
  theme?: keyof typeof themeStyles;
  // Accessibility props
  role?: string;
  ariaDescribedBy?: string;
  ariaHidden?: boolean;
  id?: string;
  // Layout props
  align?: 'left' | 'center' | 'right';
  responsive?: boolean;
  loading?: 'lazy' | 'eager';
  // Error handling
  fallbackSrc?: string;
  onError?: () => void;
}

// Theme-specific styling
const themeStyles = {
  light: {
    filter: 'none',
    opacity: 1,
  },
  dark: {
    filter: 'brightness(0.9)',
    opacity: 0.95,
  },
  'high-contrast': {
    filter: 'contrast(1.2)',
    opacity: 1,
  },
} as const;

export function EmailImage({
  src,
  alt = '',
  width,
  height,
  align = 'left',
  loading = 'lazy',
  fallbackSrc,
  onError,
  theme = 'light',
  locale = 'en',
  className,
  style,
  ...props
}: EmailImageProps) {
  // Apply theme and alignment styling
  const baseStyle: React.CSSProperties = {
    display: 'block',
    width: width || 'auto',
    height: height || 'auto',
    textAlign: align,
    ...themeStyles[theme],
    ...style,
  };

  // Enhanced accessibility features with ARIA support
  const accessibilityProps = {
    alt,
    role: 'img',
    'aria-label': alt || `Image in ${locale} locale`,
    'aria-describedby': alt ? undefined : 'decorative-image',
  };

  // Lazy loading and error handling
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    console.warn(`Failed to load image: ${src}`);
    if (fallbackSrc) {
      event.currentTarget.src = fallbackSrc;
    }
    if (onError) {
      onError();
    }
  };

  return (
    <Img
      src={src}
      style={baseStyle}
      className={className}
      loading={loading}
      onError={handleImageError}
      {...accessibilityProps}
      {...props}
    />
  );
}

export default EmailImage;
