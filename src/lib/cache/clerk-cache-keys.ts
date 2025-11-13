/**
 * Clerk cache key management
 * Provides consistent key structure and validation for Clerk caching
 *
 * IMPORTANT: Cache keys are environment-specific to prevent dev/prod collision
 */
export class ClerkCacheKeys {
  /**
   * Get environment-specific prefix
   * Development: 'clerk:dev'
   * Production: 'clerk:prod'
   * Test: 'clerk:test'
   */
  private static readonly PREFIX = `clerk:${process.env.NODE_ENV || 'development'}`;
  private static readonly SEPARATOR = ':';
  private static readonly MAX_KEY_LENGTH = 512;

  /**
   * Generate a cache key for a user by ID
   */
  static userId(id: string): string {
    return this.buildKey('id', this.sanitizeId(id));
  }

  /**
   * Generate a cache key for a user by username
   */
  static username(username: string): string {
    return this.buildKey('username', this.sanitizeUsername(username));
  }

  /**
   * Generate a cache key for user metadata
   */
  static userMetadata(userId: string, metadataType: 'public' | 'private' | 'unsafe'): string {
    return this.buildKey('user', this.sanitizeId(userId), 'metadata', metadataType);
  }

  /**
   * Generate a cache key for user roles
   */
  static userRoles(userId: string): string {
    return this.buildKey('user', this.sanitizeId(userId), 'roles');
  }

  /**
   * Generate a cache key for user email verification
   */
  static emailVerification(emailId: string): string {
    return this.buildKey('email', 'verification', this.sanitizeId(emailId));
  }

  /**
   * Generate a cache key for user session data
   */
  static sessionData(sessionId: string): string {
    return this.buildKey('session', this.sanitizeId(sessionId));
  }

  /**
   * Generate a cache key for OAuth state
   */
  static oauthState(state: string): string {
    return this.buildKey('oauth', 'state', this.sanitizeId(state));
  }

  /**
   * Build a cache key from parts
   */
  private static buildKey(...parts: string[]): string {
    const key = [this.PREFIX, ...parts].join(this.SEPARATOR);

    if (key.length > this.MAX_KEY_LENGTH) {
      console.warn(`Cache key exceeds maximum length (${this.MAX_KEY_LENGTH}):`, key);
      // Truncate key if too long, keeping prefix and unique identifier
      const truncated = key.slice(0, this.MAX_KEY_LENGTH);
      console.warn('Truncated to:', truncated);
      return truncated;
    }

    return key;
  }

  /**
   * Sanitize a user/session ID for use in cache keys
   */
  private static sanitizeId(id: string): string {
    // Remove any characters that could cause issues in cache keys
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Sanitize a username for use in cache keys
   */
  private static sanitizeUsername(username: string): string {
    // Convert to lowercase and remove problematic characters
    return username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  /**
   * Validate a cache key
   */
  static validateKey(key: string): boolean {
    // Key must start with our prefix
    if (!key.startsWith(this.PREFIX + this.SEPARATOR)) {
      return false;
    }

    // Key must not be too long
    if (key.length > this.MAX_KEY_LENGTH) {
      return false;
    }

    // Key must only contain safe characters
    if (!/^[a-zA-Z0-9_:-]+$/.test(key)) {
      return false;
    }

    return true;
  }

  /**
   * Parse a cache key into its components
   */
  static parseKey(key: string): string[] | null {
    if (!this.validateKey(key)) {
      return null;
    }

    return key.split(this.SEPARATOR);
  }
}
