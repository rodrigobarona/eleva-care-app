import { DesignTokens } from './types';

/**
 * Eleva Care Email Design Tokens
 * WCAG 2.1 AA compliant color system
 * Aligned with Eleva Care brand colors and typography
 */
export const emailDesignTokens: DesignTokens = {
  colors: {
    // Primary brand colors - Eleva Deep Teal
    primary: {
      50: '#F0FDFD',
      100: '#CCFBFA',
      200: '#99F6F5',
      300: '#5EEFEC',
      400: '#2DD8D4',
      500: '#006D77', // Main Eleva Deep Teal
      600: '#005963',
      700: '#004951',
      800: '#003B42',
      900: '#002E34',
      950: '#001F23',
    },
    // Neutral grays - Using Eleva neutrals
    neutral: {
      50: '#F7F9F9', // Eleva Soft White
      100: '#F7F9F9',
      200: '#D1D1D1', // Eleva Light Grey
      300: '#B8B8B8',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#333333', // Eleva Charcoal
      900: '#333333',
      950: '#1A1A1A',
    },
    // Semantic colors (WCAG AA compliant)
    semantic: {
      success: '#83C5BE', // Eleva Sage Green
      'success-bg': '#F0FDFD', // Light teal background
      warning: '#FFD23F', // Eleva Sunshine Yellow
      'warning-bg': '#FFF9E6', // Light yellow background
      error: '#EE4266', // Eleva Vibrant Rose
      'error-bg': '#FFF0F3', // Light rose background
      info: '#006D77', // Eleva primary teal
      'info-bg': '#E0FBFC', // Eleva Pale Lavender
    },
    // Eleva brand-specific colors
    brand: {
      'eleva-primary': '#006D77', // Deep Teal
      'eleva-primary-light': '#83C5BE', // Sage Green
      'eleva-secondary': '#E29578', // Soft Coral
      'eleva-secondary-light': '#FFDDD2', // Warm Sand
      'eleva-accent': '#E0FBFC', // Pale Lavender
      'eleva-highlight-purple': '#540D6E', // Deep Purple
      'eleva-neutral-white': '#F7F9F9', // Soft White
      'eleva-neutral-grey': '#D1D1D1', // Light Grey
      'eleva-charcoal': '#333333', // Charcoal
    },
  },
  typography: {
    families: {
      primary: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      heading: '"Lora", "Georgia", "Times New Roman", serif',
      mono: '"IBM Plex Mono", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      fallback: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    sizes: {
      xs: '12px', // 0.75rem
      sm: '14px', // 0.875rem
      base: '16px', // 1rem - Base size for readability
      lg: '18px', // 1.125rem
      xl: '20px', // 1.25rem
      '2xl': '24px', // 1.5rem
      '3xl': '30px', // 1.875rem
      '4xl': '36px', // 2.25rem
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
  },
  borderRadius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

/**
 * High contrast variant for accessibility
 */
export const highContrastTokens: Partial<DesignTokens> = {
  colors: {
    primary: {
      500: '#000000', // Black for maximum contrast
      600: '#000000',
      700: '#000000',
    },
    neutral: {
      50: '#FFFFFF',
      900: '#000000',
      950: '#000000',
    },
    semantic: {
      success: '#006600', // High contrast green
      warning: '#CC6600', // High contrast orange
      error: '#CC0000', // High contrast red
      info: '#000099', // High contrast blue
    },
    brand: {
      'eleva-primary': '#000000', // High contrast Eleva brand
      'eleva-secondary': '#000000',
      'eleva-charcoal': '#000000',
    },
  },
};

/**
 * Dark mode variant
 */
export const darkModeTokens: Partial<DesignTokens> = {
  colors: {
    primary: {
      400: '#83C5BE', // Lighter Eleva sage green for dark backgrounds
      500: '#006D77', // Main Eleva teal
      600: '#004951',
    },
    neutral: {
      50: '#333333', // Dark background - Eleva charcoal
      100: '#444444',
      800: '#F7F9F9', // Light text on dark - Eleva soft white
      900: '#F7F9F9', // Lightest text
    },
    semantic: {
      success: '#83C5BE', // Eleva sage green
      warning: '#FFD23F', // Eleva sunshine yellow
      error: '#EE4266', // Eleva vibrant rose
      info: '#E0FBFC', // Eleva pale lavender
    },
    brand: {
      'eleva-primary': '#83C5BE', // Lighter teal for dark mode
      'eleva-secondary': '#E29578', // Soft coral works well in dark mode
      'eleva-neutral-white': '#333333', // Dark background for medical contexts
    },
  },
};

/**
 * RTL (Right-to-Left) language adjustments
 */
export const rtlAdjustments = {
  textAlign: 'right' as const,
  direction: 'rtl' as const,
  paddingLeft: '0px',
  paddingRight: '16px',
  marginLeft: '0px',
  marginRight: 'auto',
};

/**
 * Email client-specific overrides
 */
export const clientOverrides = {
  outlook: {
    // Outlook-specific fixes
    fontSize: '+1px', // Outlook renders fonts smaller
    lineHeight: '+0.1',
    msoPadding: true,
  },
  gmail: {
    // Gmail-specific adjustments
    maxWidth: '600px',
    webkitTextSizeAdjust: '100%',
  },
  appleMail: {
    // Apple Mail optimizations
    webkitTextSizeAdjust: 'none',
    appleFormatDetection: 'telephone=no',
  },
};

/**
 * Accessibility utilities
 */
export const a11yUtilities = {
  // Focus indicators for interactive elements
  focusRing: {
    outline: '2px solid #006D77', // Eleva primary teal
    outlineOffset: '2px',
  },
  // Screen reader only content
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0px',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    border: '0px',
  },
  // Skip to content link
  skipLink: {
    position: 'absolute',
    top: '-40px',
    left: '6px',
    zIndex: '1000',
    padding: '8px',
    backgroundColor: '#006D77', // Eleva primary teal
    color: '#FFFFFF',
    textDecoration: 'none',
    borderRadius: '4px',
  },
};

/**
 * Returns the preferred color for use on a given background, assuming it meets contrast requirements.
 *
 * This function does not perform actual contrast calculations; it simply returns the provided preferred color.
 *
 * @param background - The background color value
 * @param preferredColor - The color to use if it is assumed to be contrast-compliant
 * @param _fallbackColor - Unused; reserved for future fallback logic
 * @returns The preferred color
 */
export function getContrastCompliantColor(
  background: string,
  preferredColor: string,
  _fallbackColor: string,
): string {
  // In a real implementation, you would calculate the contrast ratio
  // For now, return the preferred color (assuming it's already compliant)
  return preferredColor;
}

/**
 * Returns typography styles for a given size and font family.
 *
 * @param size - The typography size key to retrieve (e.g., 'sm', 'lg')
 * @param family - The font family key to use ('primary', 'heading', or 'mono'). Defaults to 'primary'.
 * @returns An object containing `fontSize`, `lineHeight`, and `fontFamily` for the specified typography scale.
 */
export function getTypographyScale(
  size: keyof typeof emailDesignTokens.typography.sizes,
  family: 'primary' | 'heading' | 'mono' = 'primary',
) {
  return {
    fontSize: emailDesignTokens.typography.sizes[size],
    lineHeight: emailDesignTokens.typography.lineHeights.normal,
    fontFamily: emailDesignTokens.typography.families[family],
  };
}

/**
 * Returns the spacing value for the specified size key from the design tokens.
 *
 * @param size - The spacing size key to retrieve (e.g., 'xs', 'md', 'xl')
 * @returns The corresponding spacing value as a string (e.g., '16px')
 */
export function getSpacing(size: keyof typeof emailDesignTokens.spacing): string {
  return emailDesignTokens.spacing[size];
}

/**
 * Export default tokens
 */
export default emailDesignTokens;

export const emailInternationalization = {
  // Supported locales - matches /messages folder structure
  supportedLocales: ['en', 'es', 'pt', 'br'] as const,

  // Default locale
  defaultLocale: 'en' as const,

  // RTL languages - none currently supported
  rtlLocales: [] as const,

  // Language-specific fonts (if needed)
  fontOverrides: {
    // Currently all locales use the same fonts
    // Can be extended if Arabic or Hebrew are added later
  } as Record<string, Partial<typeof emailDesignTokens.typography>>,

  // Locale detection patterns
  localePatterns: {
    en: /^en/i,
    es: /^es/i,
    pt: /^pt(-PT)?/i, // Portugal Portuguese
    br: /^pt-BR/i, // Brazilian Portuguese
  },

  // Date/time formatting preferences
  dateTimeFormats: {
    en: { locale: 'en-US', timezone: 'UTC' },
    es: { locale: 'es-ES', timezone: 'Europe/Madrid' },
    pt: { locale: 'pt-PT', timezone: 'Europe/Lisbon' },
    br: { locale: 'pt-BR', timezone: 'America/Sao_Paulo' },
  },
} as const;
