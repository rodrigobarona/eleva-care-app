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
 * Utility function to convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || typeof hex !== 'string') {
    return null;
  }

  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Handle 3-character hex codes
  if (cleanHex.length === 3) {
    const match = /^([a-f\d])([a-f\d])([a-f\d])$/i.exec(cleanHex);
    if (!match) return null;

    return {
      r: parseInt(match[1] + match[1], 16),
      g: parseInt(match[2] + match[2], 16),
      b: parseInt(match[3] + match[3], 16),
    };
  }

  // Handle 6-character hex codes
  if (cleanHex.length === 6) {
    const match = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    if (!match) return null;

    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    };
  }

  return null;
}

/**
 * Calculate relative luminance of a color according to WCAG 2.1
 * https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1 range
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;

  // Apply gamma correction
  const rLinear = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const gLinear = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const bLinear = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  // Calculate relative luminance using WCAG formula
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * Returns a value between 1 and 21
 */
function calculateContrastRatio(color1: string, color2: string): number {
  // Parse colors to RGB
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  // Return default ratio if parsing fails
  if (!rgb1 || !rgb2) {
    console.warn(`Failed to parse colors for contrast calculation: ${color1}, ${color2}`);
    return 4.5; // Assume minimum compliance
  }

  // Calculate relative luminance
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  // Calculate contrast ratio (lighter color / darker color)
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Utility function to get color with WCAG contrast compliance
 * Ensures the returned color meets accessibility standards
 */
export function getContrastCompliantColor(
  background: string,
  preferredColor: string,
  fallbackColor: string,
  minContrastRatio: number = 4.5, // WCAG AA standard for normal text
): string {
  try {
    // Validate input colors first
    const bgRgb = hexToRgb(background);
    const prefRgb = hexToRgb(preferredColor);
    const fallRgb = hexToRgb(fallbackColor);

    // If any color is invalid, log warning and return fallback
    if (!bgRgb || !prefRgb || !fallRgb) {
      console.warn(
        `Invalid color format detected. Background: ${background}, ` +
          `Preferred: ${preferredColor}, Fallback: ${fallbackColor}`,
      );
      return fallbackColor;
    }

    // Calculate contrast ratio between background and preferred color
    const contrastRatio = calculateContrastRatio(background, preferredColor);

    // Return preferred color if it meets the minimum contrast requirement
    if (contrastRatio >= minContrastRatio) {
      return preferredColor;
    }

    // Check if fallback color meets the requirement
    const fallbackContrastRatio = calculateContrastRatio(background, fallbackColor);
    if (fallbackContrastRatio >= minContrastRatio) {
      return fallbackColor;
    }

    // If neither meets the requirement, log a warning and return fallback
    console.warn(
      `Neither preferred (${contrastRatio.toFixed(2)}) nor fallback (${fallbackContrastRatio.toFixed(2)}) ` +
        `colors meet the minimum contrast ratio of ${minContrastRatio} against background ${background}. ` +
        `Using fallback color: ${fallbackColor}`,
    );

    return fallbackColor;
  } catch (error) {
    console.error('Error calculating contrast ratio:', error);
    // Return fallback color on any error
    return fallbackColor;
  }
}

/**
 * Utility function to get typography scale
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
 * Utility function to get spacing value
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
  supportedLocales: ['en', 'es', 'pt', 'pt-BR'] as const,

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
    'pt-BR': /^pt-BR/i, // Brazilian Portuguese
  },

  // Date/time formatting preferences
  dateTimeFormats: {
    en: { locale: 'en-US', timezone: 'UTC' },
    es: { locale: 'es-ES', timezone: 'Europe/Madrid' },
    pt: { locale: 'pt-PT', timezone: 'Europe/Lisbon' },
    'pt-BR': { locale: 'pt-BR', timezone: 'America/Sao_Paulo' },
  },
} as const;
