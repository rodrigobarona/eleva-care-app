/**
 * Gravatar utility functions for generating avatar URLs and fetching profile data
 * Supports both basic public API and enhanced authenticated API with API key
 */
// Import Node.js crypto for server-side
import { ENV_HELPERS } from '@/config/env';
import md5 from 'blueimp-md5';

/**
 * Gravatar default image options
 */
export enum GravatarDefault {
  MM = 'mm', // Mystery man
  IDENTICON = 'identicon', // Geometric pattern
  MONSTERID = 'monsterid', // Monster
  WAVATAR = 'wavatar', // Cartoon face
  RETRO = 'retro', // 8-bit arcade style
  ROBOHASH = 'robohash', // Robot
  BLANK = 'blank', // Transparent PNG
}

/**
 * Gravatar options for customizing avatar appearance
 */
export type GravatarOptions = {
  size?: number; // Size in pixels (1-2048)
  default?: GravatarDefault | string; // Default image type
  rating?: 'g' | 'pg' | 'r' | 'x'; // Content rating
  forceDefault?: boolean; // Always show default image
};

/**
 * Gravatar profile data interface (from REST API)
 */
export interface GravatarProfile {
  hash: string;
  display_name: string;
  profile_url: string;
  avatar_url: string;
  avatar_alt_text?: string;
  location?: string;
  description?: string;
  job_title?: string;
  company?: string;
  verified_accounts?: Array<{
    service_type: string;
    service_label: string;
    service_icon: string;
    url: string;
    is_hidden: boolean;
  }>;
  pronunciation?: string;
  pronouns?: string;
  // Additional fields available with authentication
  timezone?: string;
  first_name?: string;
  last_name?: string;
  is_organization?: boolean;
  links?: Array<{
    label: string;
    url: string;
  }>;
  interests?: Array<{
    id: number;
    name: string;
  }>;
  registration_date?: string;
  last_profile_edit?: string;
}

/**
 * Creates an MD5 hash from an email address
 * @param email - The email to hash
 * @returns MD5 hashed string in hexadecimal format
 */
export const getEmailHash = (email: string): string => {
  const trimmedEmail = email.trim().toLowerCase();
  return md5(trimmedEmail);
};

/**
 * Generates a Gravatar URL from an email address
 * @param email - The user's email address
 * @param options - Configuration options for the Gravatar URL
 * @returns A complete Gravatar URL
 */
export const getGravatarUrl = (email: string, options: GravatarOptions = {}): string => {
  if (!email) return '';

  const hash = getEmailHash(email);
  const {
    size = 80,
    default: defaultImage = GravatarDefault.MM,
    rating = 'g',
    forceDefault = false,
  } = options;

  const queryParams = new URLSearchParams();

  if (size) queryParams.append('s', size.toString());
  if (defaultImage) queryParams.append('d', defaultImage);
  if (rating) queryParams.append('r', rating);
  if (forceDefault) queryParams.append('f', 'y');

  const queryString = queryParams.toString();
  return `https://www.gravatar.com/avatar/${hash}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Fetches full Gravatar profile data using the REST API
 * Requires API key for enhanced data
 * @param email - Email address
 * @returns Promise that resolves to profile data or null
 */
export async function getGravatarProfile(email: string): Promise<GravatarProfile | null> {
  if (!email) return null;

  try {
    const hash = getEmailHash(email);
    const apiKey = ENV_HELPERS.getGravatarApiKey();

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(`https://api.gravatar.com/v3/profiles/${hash}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No profile found
      }
      throw new Error(`Gravatar API error: ${response.status} ${response.statusText}`);
    }

    const profile = (await response.json()) as GravatarProfile;
    return profile;
  } catch (error) {
    console.warn('Failed to fetch Gravatar profile:', error);
    return null;
  }
}

/**
 * Checks if a Gravatar exists for the given email using the REST API
 * Falls back to image checking if API is not available
 * @param email - Email address to check
 * @returns Promise that resolves to true if avatar exists
 */
export async function hasGravatar(email: string): Promise<boolean> {
  if (!email) return false;

  // Try API-based checking first (more reliable)
  const apiKey = ENV_HELPERS.getGravatarApiKey();
  if (apiKey) {
    try {
      const profile = await getGravatarProfile(email);
      return profile !== null;
    } catch (error) {
      console.warn('API-based Gravatar check failed, falling back to image check:', error);
    }
  }

  // Fallback to image-based checking
  try {
    const url = await getGravatarUrl(email, { default: GravatarDefault.BLANK, size: 1 });

    // Use fetch with a timeout to check if image exists
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Gravatar returns 200 even for non-existent emails with default=blank
    // But the content-length will be different for actual vs blank images
    const contentLength = response.headers.get('content-length');
    return response.ok && contentLength !== null && Number(contentLength) > 100;
  } catch {
    // Network error or timeout - assume no Gravatar to avoid blocking
    return false;
  }
}

/**
 * Gets Gravatar URL with fallback handling and enhanced profile data
 * @param email - Email address
 * @param options - Gravatar options
 * @returns Promise that resolves to Gravatar URL or null if no avatar exists
 */
export async function getGravatarUrlWithFallback(
  email: string,
  options: GravatarOptions = {},
): Promise<string | null> {
  if (!email) return null;

  // First check if Gravatar exists (with timeout)
  const exists = await hasGravatar(email);

  if (!exists) {
    return null; // No Gravatar found
  }

  // Return Gravatar URL with specified options
  return getGravatarUrl(email, {
    size: 40,
    default: GravatarDefault.MM,
    rating: 'pg',
    ...options,
  });
}

/**
 * Enhanced avatar data with profile information
 */
export interface EnhancedAvatarData {
  avatarUrl: string;
  displayName?: string;
  location?: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  profileUrl?: string;
}

/**
 * Gets enhanced avatar data combining URL generation with profile information
 * @param email - Email address
 * @param options - Gravatar options
 * @returns Promise that resolves to enhanced avatar data
 */
export async function getEnhancedAvatarData(
  email: string,
  options: GravatarOptions = {},
): Promise<EnhancedAvatarData | null> {
  if (!email) return null;

  try {
    // Get profile data if API key is available
    const profile = await getGravatarProfile(email);

    // Generate avatar URL (always works)
    const avatarUrl = await getGravatarUrl(email, {
      size: 40,
      default: GravatarDefault.MM,
      rating: 'pg',
      ...options,
    });

    if (!profile) {
      // Return basic avatar data if no profile found
      return { avatarUrl };
    }

    // Return enhanced data with profile information
    return {
      avatarUrl: profile.avatar_url || avatarUrl,
      displayName: profile.display_name,
      location: profile.location,
      jobTitle: profile.job_title,
      company: profile.company,
      bio: profile.description,
      profileUrl: profile.profile_url,
    };
  } catch (error) {
    console.warn('Failed to get enhanced avatar data:', error);

    // Fallback to basic avatar URL
    const avatarUrl = await getGravatarUrl(email, {
      size: 40,
      default: GravatarDefault.MM,
      rating: 'pg',
      ...options,
    });

    return { avatarUrl };
  }
}
