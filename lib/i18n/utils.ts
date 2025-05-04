import { type Locale, locales } from './routing';

/**
 * Helper function to get the file locale from ISO locale codes
 * Transforms locale to file locale (e.g., pt-BR -> br, es-MX -> mx)
 * @param locale The locale string to transform
 * @returns The file locale to use for imports
 */
export function getFileLocale(locale: string): string {
  // If locale contains a hyphen (like pt-BR), extract the country code
  if (locale.includes('-')) {
    // Get the part after the hyphen (BR) and lowercase it (br)
    return locale.split('-')[1].toLowerCase();
  }
  // Otherwise just return the original locale
  return locale;
}

// Country to locale mapping table
const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  // Spanish-speaking countries
  ES: 'es', // Spain
  MX: 'es', // Mexico
  CO: 'es', // Colombia
  AR: 'es', // Argentina
  CL: 'es', // Chile
  PE: 'es', // Peru
  VE: 'es', // Venezuela
  EC: 'es', // Ecuador
  GT: 'es', // Guatemala
  CU: 'es', // Cuba
  BO: 'es', // Bolivia
  DO: 'es', // Dominican Republic
  HN: 'es', // Honduras
  PY: 'es', // Paraguay
  SV: 'es', // El Salvador
  NI: 'es', // Nicaragua
  CR: 'es', // Costa Rica
  PA: 'es', // Panama
  UY: 'es', // Uruguay
  PR: 'es', // Puerto Rico
  GQ: 'es', // Equatorial Guinea

  // Portuguese-speaking countries
  PT: 'pt', // Portugal
  BR: 'pt-BR', // Brazil - Always use pt-BR for Brazil
  AO: 'pt', // Angola
  MZ: 'pt', // Mozambique
  GW: 'pt', // Guinea-Bissau
  TL: 'pt', // East Timor
  CV: 'pt', // Cape Verde
  ST: 'pt', // São Tomé and Príncipe
};

/**
 * Parse the Accept-Language header value
 * @param acceptLanguage The Accept-Language header value
 * @returns The best matching locale or null if none matches
 */
function parseAcceptLanguage(acceptLanguage?: string): Locale | null {
  if (!acceptLanguage) return null;

  // Parse the Accept-Language header
  // Format is typically: "en-US,en;q=0.9,es;q=0.8,pt;q=0.7"
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [value, quality = 'q=1.0'] = lang.trim().split(';');
      const q = Number.parseFloat(quality.split('=')[1]);
      return { value, q };
    })
    .sort((a, b) => b.q - a.q); // Sort by quality descending

  // Find the first supported locale that matches
  for (const lang of languages) {
    const code = lang.value.toLowerCase();

    // Special case for Brazilian Portuguese
    // Check for pt-BR directly or pt with BR country
    if (code === 'pt-br' || code.startsWith('pt-br')) {
      return 'pt-BR';
    }

    // Try direct match first
    if (locales.includes(code as Locale)) {
      return code as Locale;
    }

    // Special check for language + region
    const [language, region] = code.split('-');

    // If it's Portuguese from Brazil specifically
    if (language === 'pt' && region && region.toLowerCase() === 'br') {
      return 'pt-BR';
    }

    // Try language part only for other cases (e.g., "en-US" -> "en")
    if (locales.includes(language as Locale)) {
      // For Portuguese, check if we should return pt or pt-BR based on region
      if (language === 'pt' && region) {
        // If region is BR, return pt-BR
        if (region.toUpperCase() === 'BR') {
          return 'pt-BR';
        }
      }
      return language as Locale;
    }
  }

  return null;
}

/**
 * Detect user's preferred locale from request headers
 * Uses both Accept-Language and Vercel geolocation headers
 *
 * @param headers Request headers from middleware
 * @returns The detected locale or null if detection failed
 */
export function detectLocaleFromHeaders(headers: Headers): Locale | null {
  // Try to detect from Accept-Language header first (most accurate)
  const acceptLanguage = headers.get('accept-language');
  const languageLocale = parseAcceptLanguage(acceptLanguage || undefined);

  if (languageLocale) {
    return languageLocale;
  }

  // If Accept-Language didn't yield a match, try geolocation
  // Vercel automatically adds these headers - https://vercel.com/docs/concepts/edge-network/headers#geolocation
  const country = headers.get('x-vercel-ip-country');

  if (country && COUNTRY_LOCALE_MAP[country]) {
    return COUNTRY_LOCALE_MAP[country];
  }

  // Fallback to default if nothing matched
  return null;
}
