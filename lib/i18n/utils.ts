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
