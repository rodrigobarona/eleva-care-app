import type { SupportedLocale } from '@/emails/utils/i18n';
import { Section } from '@react-email/section';
import React from 'react';

interface EmailSectionProps {
  children: React.ReactNode;
  variant?: 'default' | 'hero' | 'content' | 'footer' | 'sidebar';
  backgroundColor?: 'transparent' | 'primary' | 'secondary' | 'accent' | 'muted';
  padding?: 'none' | 'sm' | 'base' | 'lg' | 'xl';
  margin?: 'none' | 'sm' | 'base' | 'lg' | 'xl';
  maxWidth?: string;
  className?: string;
  style?: React.CSSProperties;
  locale?: SupportedLocale;
  theme?: 'light' | 'dark';
  // Accessibility props
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  id?: string;
  // Responsive props
  responsive?: boolean;
}

const paddingValues = {
  none: '0',
  sm: '12px',
  base: '20px',
  lg: '32px',
  xl: '48px',
} as const;

const marginValues = {
  none: '0',
  sm: '8px',
  base: '16px',
  lg: '24px',
  xl: '32px',
} as const;

const lightThemeBackgrounds = {
  transparent: 'transparent',
  primary: '#006D77', // Eleva Care teal
  secondary: '#F0FDFF', // Light teal background
  accent: '#00A8B8', // Enhanced teal
  muted: '#F7FAFC', // Very light neutral
} as const;

const darkThemeBackgrounds = {
  transparent: 'transparent',
  primary: '#00A8B8', // Enhanced teal for dark mode
  secondary: '#1A2F33', // Dark teal background
  accent: '#006D77', // Original teal
  muted: '#1E2832', // Dark surface
} as const;

const sectionVariants = {
  default: {
    padding: 'base' as const,
    maxWidth: '600px',
  },
  hero: {
    padding: 'xl' as const,
    maxWidth: '100%',
  },
  content: {
    padding: 'lg' as const,
    maxWidth: '600px',
  },
  footer: {
    padding: 'base' as const,
    maxWidth: '100%',
  },
  sidebar: {
    padding: 'base' as const,
    maxWidth: '200px',
  },
} as const;

export function EmailSection({
  children,
  variant = 'default',
  backgroundColor = 'transparent',
  padding,
  margin = 'none',
  maxWidth,
  className,
  style = {},
  theme = 'light',
  role,
  ariaLabel,
  ariaLabelledBy,
  id,
  responsive = true,
  ...props
}: EmailSectionProps) {
  const backgrounds = theme === 'dark' ? darkThemeBackgrounds : lightThemeBackgrounds;
  const variantConfig = sectionVariants[variant];

  // Use variant config or explicit props
  const computedPadding = padding || variantConfig.padding;
  const computedMaxWidth = maxWidth || variantConfig.maxWidth;

  const sectionStyle: React.CSSProperties = {
    backgroundColor: backgrounds[backgroundColor],
    padding: paddingValues[computedPadding],
    margin: marginValues[margin],
    maxWidth: computedMaxWidth,
    width: '100%',
    boxSizing: 'border-box',

    // Responsive email styles
    ...(responsive && {
      '@media screen and (max-width: 600px)': {
        padding: paddingValues.sm,
        maxWidth: '100% !important',
      },
    }),
    ...style,
  };

  const accessibilityProps = {
    role,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    id,
  };

  return (
    <Section style={sectionStyle} className={className} {...accessibilityProps} {...props}>
      {children}
    </Section>
  );
}

export default EmailSection;
