import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading } from '@react-email/heading';
import React from 'react';

interface EmailHeadingProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
  locale?: SupportedLocale;
  theme?: 'light' | 'dark';
  // Accessibility props
  id?: string;
  ariaLabel?: string;
  ariaLevel?: number;
  tabIndex?: number;
  // Spacing props
  mt?: string;
  mb?: string;
  mx?: string;
  my?: string;
}

const headingSizes = {
  sm: '18px',
  base: '20px',
  lg: '24px',
  xl: '28px',
  '2xl': '32px',
  '3xl': '36px',
} as const;

const headingWeights = {
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

const lightThemeColors = {
  primary: '#006D77', // Eleva Care teal - main brand color
  secondary: '#4A5568', // Neutral dark for body text
  accent: '#00A8B8', // Enhanced teal for highlights
  success: '#22C55E', // Success green
  warning: '#F59E0B', // Warning yellow
  error: '#EF4444', // Error red
} as const;

const darkThemeColors = {
  primary: '#00A8B8', // Enhanced teal for dark mode
  secondary: '#F7FAFC', // Light text for dark backgrounds
  accent: '#006D77', // Original teal for accents
  success: '#22C55E', // Success green (same)
  warning: '#F59E0B', // Warning yellow (same)
  error: '#EF4444', // Error red (same)
} as const;

const textAligns = {
  left: 'left',
  center: 'center',
  right: 'right',
} as const;

export function EmailHeading({
  children,
  as = 'h2',
  size = 'lg',
  weight = 'semibold',
  color = 'primary',
  align = 'left',
  className,
  style = {},
  theme = 'light',
  id,
  ariaLabel,
  ariaLevel,
  tabIndex,
  mt,
  mb,
  mx,
  my,
  ...props
}: EmailHeadingProps) {
  const colors = theme === 'dark' ? darkThemeColors : lightThemeColors;

  // Auto-assign aria-level based on heading level if not provided
  const computedAriaLevel = ariaLevel || parseInt(as.replace('h', ''), 10);

  const headingStyle: React.CSSProperties = {
    fontSize: headingSizes[size],
    fontWeight: headingWeights[weight],
    color: colors[color],
    textAlign: textAligns[align],
    lineHeight: '1.2',
    margin: '0',
    padding: '0',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

    // Spacing shortcuts
    marginTop: mt || my,
    marginBottom: mb || my,
    marginLeft: mx,
    marginRight: mx,
    ...style,
  };

  const accessibilityProps = {
    id,
    'aria-label': ariaLabel,
    'aria-level': computedAriaLevel,
    tabIndex,
    role: 'heading', // Explicit heading role for better screen reader support
  };

  return (
    <Heading as={as} style={headingStyle} className={className} {...accessibilityProps} {...props}>
      {children}
    </Heading>
  );
}

export default EmailHeading;
