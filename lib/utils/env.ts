/**
 * Environment variable utilities
 * Provides safe access to environment variables with fallbacks
 */

/**
 * Gets the Gravatar API key from environment variables
 * @returns API key or undefined if not set
 */
export function getGravatarApiKey(): string | undefined {
  return process.env.GRAVATAR_API_KEY;
}

/**
 * Check if Gravatar API key is configured
 * @returns true if API key is available
 */
export function hasGravatarApiKey(): boolean {
  return Boolean(process.env.GRAVATAR_API_KEY);
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    hasGravatarApi: hasGravatarApiKey(),
  };
}
