import type { SupportedLocale } from '@/emails/utils/i18n';
import { Hr } from '@react-email/hr';
import React from 'react';

interface EmailDividerProps {
  variant?: 'default' | 'thick' | 'dotted' | 'dashed' | 'subtle';
  color?: 'primary' | 'secondary' | 'muted' | 'accent';
  width?: string;
  margin?: 'none' | 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
  locale?: SupportedLocale;
  theme?: 'light' | 'dark';
  // Accessibility props
  role?: string;
  ariaLabel?: string;
  ariaHidden?: boolean;
  id?: string;
}

const marginValues = {
  none: '0',
  sm: '8px',
  base: '16px',
  lg: '24px',
  xl: '32px',
} as const;

const lightThemeColors = {
  primary: '#006D77', // Eleva Care teal
  secondary: '#4A5568', // Neutral dark
  muted: '#E2E8F0', // Light neutral border
  accent: '#00A8B8', // Enhanced teal
} as const;

const darkThemeColors = {
  primary: '#00A8B8', // Enhanced teal for dark mode
  secondary: '#A0AEC0', // Light neutral for dark backgrounds
  muted: '#4A5568', // Darker border for dark mode
  accent: '#006D77', // Original teal for accents
} as const;

const dividerVariants = {
  default: {
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  thick: {
    borderStyle: 'solid',
    borderWidth: '2px',
  },
  dotted: {
    borderStyle: 'dotted',
    borderWidth: '1px',
  },
  dashed: {
    borderStyle: 'dashed',
    borderWidth: '1px',
  },
  subtle: {
    borderStyle: 'solid',
    borderWidth: '0.5px',
  },
} as const;

export function EmailDivider({
  variant = 'default',
  color = 'muted',
  width = '100%',
  margin = 'base',
  className,
  style = {},
  theme = 'light',
  role,
  ariaLabel,
  ariaHidden = true, // Dividers are usually decorative
  id,
  ...props
}: EmailDividerProps) {
  const colors = theme === 'dark' ? darkThemeColors : lightThemeColors;
  const variantConfig = dividerVariants[variant];

  const dividerStyle: React.CSSProperties = {
    width,
    border: 'none',
    borderTop: `${variantConfig.borderWidth} ${variantConfig.borderStyle} ${colors[color]}`,
    margin: `${marginValues[margin]} 0`,
    padding: '0',
    ...style,
  };

  const accessibilityProps = {
    role: ariaHidden ? 'presentation' : role || 'separator',
    'aria-label': ariaHidden ? undefined : ariaLabel || 'Content divider',
    'aria-hidden': ariaHidden,
    id,
  };

  return <Hr style={dividerStyle} className={className} {...accessibilityProps} {...props} />;
}

export default EmailDivider;
