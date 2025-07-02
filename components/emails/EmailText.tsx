import { Text } from '@react-email/text';
import React from 'react';

interface EmailTextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'success' | 'warning' | 'error';
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
  // Accessibility props
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  id?: string;
}

const textSizes = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
} as const;

const textWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

const lightThemeColors = {
  primary: '#006D77', // Eleva Care teal
  secondary: '#4A5568', // Neutral dark for body text
  muted: '#718096', // Light neutral for secondary text
  accent: '#00A8B8', // Enhanced teal for highlights
  success: '#22C55E', // Success green
  warning: '#F59E0B', // Warning yellow
  error: '#EF4444', // Error red
} as const;

const darkThemeColors = {
  primary: '#00A8B8', // Enhanced teal for dark mode
  secondary: '#F7FAFC', // Light text for dark backgrounds
  muted: '#A0AEC0', // Muted light for secondary text
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

export function EmailText({
  children,
  size = 'base',
  weight = 'normal',
  color = 'secondary',
  align = 'left',
  className,
  style = {},
  theme = 'light',
  role,
  ariaLabel,
  ariaDescribedBy,
  id,
}: EmailTextProps) {
  const colors = theme === 'dark' ? darkThemeColors : lightThemeColors;

  const textStyle: React.CSSProperties = {
    fontSize: textSizes[size],
    fontWeight: textWeights[weight],
    color: colors[color],
    textAlign: textAligns[align],
    lineHeight: size === 'xs' || size === 'sm' ? '1.4' : '1.6',
    margin: '0',
    padding: '0',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    ...style,
  };

  const accessibilityProps = {
    role,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    id,
  };

  // Only pass safe props to Text component
  const safeProps = {
    style: textStyle,
    className,
    ...accessibilityProps,
  };

  return <Text {...safeProps}>{children}</Text>;
}

export default EmailText;
