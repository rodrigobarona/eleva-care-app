/**
 * Clerk Security Utilities
 *
 * This module provides utilities for leveraging Clerk's built-in security features
 * and making intelligent decisions about when to send security notifications.
 */
import { clerkClient } from '@clerk/nextjs/server';

export interface SessionSecurityAnalysis {
  isNewDevice: boolean;
  isUnusualTiming: boolean;
  isGeographicAnomaly: boolean;
  riskScore: 'low' | 'medium' | 'high';
  shouldNotify: boolean;
  reason: string;
}

export interface ClerkSessionData {
  id: string;
  user_id?: string;
  client_id?: string;
  status?: string;
  last_active_at?: number;
  created_at?: number;
  abandon_at?: number;
  expire_at?: number;
  // Additional fields that might be available in webhook data
  actor?: unknown;
  object?: string;
  // Enhanced security data from webhook handler
  ipAddress?: string;
  vercelGeoData?: VercelGeoData;
}

export interface VercelGeoData {
  country?: string | null;
  countryRegion?: string | null;
  city?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  timezone?: string | null;
}

export interface UserSecurityPreferences {
  securityAlerts?: boolean;
  newDeviceAlerts?: boolean;
  locationChangeAlerts?: boolean;
  unusualTimingAlerts?: boolean;
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
}

export interface DeviceInfo {
  clientId: string;
  firstSeen: number;
  lastSeen: number;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
}

export interface LoginPattern {
  userId: string;
  typicalHours: number[]; // Hours of day when user typically logs in (0-23)
  typicalDays: number[]; // Days of week when user typically logs in (0-6)
  averageFrequency: number; // Average hours between logins
  lastLoginTime: number;
  recentLocations: string[]; // Recent IP addresses or locations
}

/**
 * Analyze a session for security risks using Clerk's data
 * This leverages Clerk's built-in device and location tracking
 */
export async function analyzeSessionSecurity(
  sessionData: ClerkSessionData,
  userId: string,
): Promise<SessionSecurityAnalysis> {
  try {
    // Get user preferences
    const preferences = await getUserSecurityPreferences(userId);

    // Initialize analysis
    const analysis: SessionSecurityAnalysis = {
      isNewDevice: false,
      isUnusualTiming: false,
      isGeographicAnomaly: false,
      riskScore: 'low',
      shouldNotify: false,
      reason: 'Normal login activity',
    };

    // 1. Device Detection - Check if client_id is new
    if (sessionData.client_id && preferences.newDeviceAlerts) {
      analysis.isNewDevice = await isNewDevice(userId, sessionData.client_id);
      if (analysis.isNewDevice) {
        console.log(`🔍 New device detected for user ${userId}: ${sessionData.client_id}`);
      }
    }

    // 2. Timing Analysis - Check if login time is unusual
    if (preferences.unusualTimingAlerts) {
      analysis.isUnusualTiming = await isUnusualTiming(
        userId,
        sessionData.created_at || Date.now(),
      );
      if (analysis.isUnusualTiming) {
        console.log(`🔍 Unusual timing detected for user ${userId}`);
      }
    }

    // 3. Geographic Anomaly - Check for location changes using Vercel's geolocation
    if (preferences.locationChangeAlerts) {
      analysis.isGeographicAnomaly = await isGeographicAnomaly(userId, sessionData);
      if (analysis.isGeographicAnomaly) {
        console.log(`🔍 Geographic anomaly detected for user ${userId}`);
      }
    }

    // Calculate risk score and notification decision
    const riskFactors = [
      analysis.isNewDevice,
      analysis.isUnusualTiming,
      analysis.isGeographicAnomaly,
    ].filter(Boolean).length;

    if (riskFactors > 0) {
      analysis.riskScore = riskFactors >= 2 ? 'high' : 'medium';
      analysis.shouldNotify = preferences.securityAlerts !== false;
      analysis.reason = `Security alert: ${[
        analysis.isNewDevice && 'new device',
        analysis.isUnusualTiming && 'unusual timing',
        analysis.isGeographicAnomaly && 'location change',
      ]
        .filter(Boolean)
        .join(', ')} detected`;
    }

    // Store device info for future analysis
    if (sessionData.client_id) {
      await updateDeviceInfo(userId, sessionData.client_id, sessionData.created_at || Date.now());
    }

    // Update login patterns
    await updateLoginPatterns(userId, sessionData.created_at || Date.now());

    return analysis;
  } catch (error) {
    console.error('Error analyzing session security:', error);

    // Default to safe behavior - notify on error
    return {
      isNewDevice: false,
      isUnusualTiming: false,
      isGeographicAnomaly: false,
      riskScore: 'medium',
      shouldNotify: true,
      reason: 'Unable to analyze session - sending notification as precaution',
    };
  }
}

/**
 * Get enhanced session information from Clerk
 * This provides additional context like IP address, user agent, etc.
 */
export async function getEnhancedSessionInfo(sessionId: string) {
  try {
    const client = await clerkClient();
    const sessionDetails = await client.sessions.getSession(sessionId);

    // Extract available session metadata
    const sessionInfo = {
      sessionId,
      status: sessionDetails.status,
      lastActiveAt: sessionDetails.lastActiveAt,
      expireAt: sessionDetails.expireAt,
      abandonAt: sessionDetails.abandonAt,
      // Note: IP address and user agent are not directly available in Clerk's session API
      // These would need to be captured from the request headers in your webhook handler
      ipAddress: undefined, // Capture from request headers: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      userAgent: undefined, // Capture from request headers: req.headers['user-agent']
      location: undefined, // Derive from IP address using geolocation service
    };

    console.log(`📊 Enhanced session info retrieved for ${sessionId}:`, {
      status: sessionInfo.status,
      lastActiveAt: sessionInfo.lastActiveAt,
      expireAt: sessionInfo.expireAt,
    });

    return sessionInfo;
  } catch (error) {
    console.error('Error fetching enhanced session info:', error);
    return {
      sessionId,
      status: 'unknown',
      lastActiveAt: null,
      expireAt: null,
      abandonAt: null,
      ipAddress: undefined,
      userAgent: undefined,
      location: undefined,
    };
  }
}

/**
 * Check if user has enabled security notifications in their preferences
 * This respects user choice about security notifications
 */
export async function shouldSendSecurityNotification(userId: string): Promise<boolean> {
  try {
    const preferences = await getUserSecurityPreferences(userId);
    return preferences.securityAlerts !== false;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // Default to true for security
    return true;
  }
}

/**
 * Log security event for audit purposes
 * This creates an audit trail of security-related activities
 */
export async function logSecurityEvent(event: {
  userId: string;
  sessionId: string;
  eventType: string;
  riskScore: string;
  action: 'notified' | 'ignored';
  reason: string;
  metadata?: Record<string, unknown>;
}) {
  const auditEvent = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  console.log('🔒 Security Event:', auditEvent);

  try {
    // Store in audit database using the existing audit system
    const { logAuditEvent } = await import('@/lib/logAuditEvent');

    const { SECURITY_ALERT_NOTIFIED, SECURITY_ALERT_IGNORED } = await import('@/types/audit');

    await logAuditEvent(
      event.userId,
      event.action === 'notified' ? SECURITY_ALERT_NOTIFIED : SECURITY_ALERT_IGNORED,
      'security_event',
      event.sessionId,
      null, // oldValues
      {
        eventType: event.eventType,
        riskScore: event.riskScore,
        reason: event.reason,
        timestamp: auditEvent.timestamp,
        ...event.metadata,
      },
      'webhook', // ipAddress - from webhook context
      'clerk-webhook', // userAgent - webhook context
    );

    console.log(`✅ Security event logged to audit database for user ${event.userId}`);
  } catch (error) {
    console.error('Error logging security event to audit database:', error);
    // Don't throw - logging failure shouldn't break the security flow
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR ENHANCED SECURITY DETECTION
// ============================================================================

/**
 * Get user's security preferences from Clerk's publicMetadata
 */
export async function getUserSecurityPreferences(userId: string): Promise<UserSecurityPreferences> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const preferences = (user.publicMetadata?.securityPreferences as UserSecurityPreferences) || {};

    // Set defaults for undefined preferences
    return {
      securityAlerts: preferences.securityAlerts !== false, // Default to true
      newDeviceAlerts: preferences.newDeviceAlerts !== false, // Default to true
      locationChangeAlerts: preferences.locationChangeAlerts !== false, // Default to true
      unusualTimingAlerts: preferences.unusualTimingAlerts !== false, // Default to true
      emailNotifications: preferences.emailNotifications !== false, // Default to true
      inAppNotifications: preferences.inAppNotifications !== false, // Default to true
      ...preferences,
    };
  } catch (error) {
    console.error('Error fetching user security preferences:', error);
    // Return safe defaults
    return {
      securityAlerts: true,
      newDeviceAlerts: true,
      locationChangeAlerts: true,
      unusualTimingAlerts: true,
      emailNotifications: true,
      inAppNotifications: true,
    };
  }
}

/**
 * Update user's security preferences in Clerk's publicMetadata
 */
export async function updateUserSecurityPreferences(
  userId: string,
  preferences: Partial<UserSecurityPreferences>,
): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const currentPreferences =
      (user.publicMetadata?.securityPreferences as UserSecurityPreferences) || {};
    const updatedPreferences = { ...currentPreferences, ...preferences };

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        securityPreferences: updatedPreferences,
      },
    });

    console.log(`✅ Updated security preferences for user ${userId}`);
  } catch (error) {
    console.error('Error updating user security preferences:', error);
    throw error;
  }
}

/**
 * Check if the client_id represents a new device for the user
 */
async function isNewDevice(userId: string, clientId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Get stored device info from user's private metadata
    const deviceHistory = (user.privateMetadata?.deviceHistory as DeviceInfo[]) || [];

    // Check if this client_id has been seen before
    const existingDevice = deviceHistory.find((device) => device.clientId === clientId);

    if (!existingDevice) {
      console.log(`🔍 New device detected: ${clientId} for user ${userId}`);
      return true;
    }

    // Update last seen time for existing device
    existingDevice.lastSeen = Date.now();
    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        deviceHistory,
      },
    });

    return false;
  } catch (error) {
    console.error('Error checking device history:', error);
    // Default to considering it a new device for security
    return true;
  }
}

/**
 * Check if the login time is unusual for the user
 */
async function isUnusualTiming(userId: string, loginTime: number): Promise<boolean> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Get stored login patterns from user's private metadata
    const loginPattern = user.privateMetadata?.loginPattern as LoginPattern;

    if (!loginPattern || !loginPattern.typicalHours.length) {
      // Not enough data to determine unusual timing
      return false;
    }

    const loginDate = new Date(loginTime);
    const loginHour = loginDate.getHours();
    const loginDay = loginDate.getDay();

    // Check if login hour is within typical hours (with some tolerance)
    const isTypicalHour = loginPattern.typicalHours.some(
      (hour) => Math.abs(hour - loginHour) <= 2, // 2-hour tolerance
    );

    // Check if login day is within typical days
    const isTypicalDay = loginPattern.typicalDays.includes(loginDay);

    // Check frequency - is this login much sooner than usual?
    const timeSinceLastLogin = loginTime - loginPattern.lastLoginTime;
    const hourssSinceLastLogin = timeSinceLastLogin / (1000 * 60 * 60);
    const isUnusualFrequency = hourssSinceLastLogin < loginPattern.averageFrequency * 0.1; // Much more frequent than usual

    const isUnusual = !isTypicalHour || !isTypicalDay || isUnusualFrequency;

    if (isUnusual) {
      console.log(`🔍 Unusual timing detected for user ${userId}:`, {
        loginHour,
        loginDay,
        isTypicalHour,
        isTypicalDay,
        hourssSinceLastLogin,
        averageFrequency: loginPattern.averageFrequency,
      });
    }

    return isUnusual;
  } catch (error) {
    console.error('Error checking login timing:', error);
    return false;
  }
}

/**
 * Check for geographic anomalies (location changes)
 * Uses Vercel's built-in geolocation data (free and reliable)
 */
async function isGeographicAnomaly(
  userId: string,
  sessionData: ClerkSessionData,
): Promise<boolean> {
  try {
    const vercelGeoData = sessionData.vercelGeoData;

    if (!vercelGeoData || !vercelGeoData.country) {
      console.log(`🔍 Geographic anomaly check for user ${userId} - No geolocation data available`);
      return false;
    }

    // Get user's location history from private metadata
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const loginPattern = user.privateMetadata?.loginPattern as LoginPattern;

    if (!loginPattern || !loginPattern.recentLocations.length) {
      // First login or no location history - store current location and not anomalous
      await updateLocationHistory(userId, formatVercelLocation(vercelGeoData));
      return false;
    }

    // Check if this location is significantly different from recent locations
    const currentLocationString = formatVercelLocation(vercelGeoData);

    const isNewLocation = !loginPattern.recentLocations.some((recentLocation) => {
      // Check for exact city/country match first
      if (recentLocation === currentLocationString) {
        return true;
      }

      // If we have coordinates, calculate distance
      if (vercelGeoData.latitude && vercelGeoData.longitude) {
        const currentLat = parseFloat(vercelGeoData.latitude);
        const currentLon = parseFloat(vercelGeoData.longitude);

        // Parse stored location (format: "city,country" or "latitude,longitude")
        const [recentLat, recentLon] = recentLocation.split(',').map(Number);
        if (!isNaN(recentLat) && !isNaN(recentLon)) {
          // Calculate distance between coordinates (Haversine formula)
          const distance = calculateDistance(recentLat, recentLon, currentLat, currentLon);

          // Consider locations within 100km as "same location"
          return distance < 100;
        }
      }

      return false;
    });

    if (isNewLocation) {
      console.log(`🔍 Geographic anomaly detected for user ${userId}:`, {
        currentLocation: currentLocationString,
        recentLocations: loginPattern.recentLocations,
        vercelGeoData,
      });

      // Update location history with new location
      await updateLocationHistory(userId, currentLocationString);
    }

    return isNewLocation;
  } catch (error) {
    console.error('Error checking geographic anomaly:', error);
    return false;
  }
}

/**
 * Update device information for future analysis
 */
async function updateDeviceInfo(
  userId: string,
  clientId: string,
  timestamp: number,
): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const deviceHistory = (user.privateMetadata?.deviceHistory as DeviceInfo[]) || [];

    let deviceInfo = deviceHistory.find((device) => device.clientId === clientId);

    if (!deviceInfo) {
      // New device
      deviceInfo = {
        clientId,
        firstSeen: timestamp,
        lastSeen: timestamp,
      };
      deviceHistory.push(deviceInfo);
    } else {
      // Update existing device
      deviceInfo.lastSeen = timestamp;
    }

    // Keep only last 10 devices to prevent metadata bloat
    const recentDevices = deviceHistory.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 10);

    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        deviceHistory: recentDevices,
      },
    });
  } catch (error) {
    console.error('Error updating device info:', error);
  }
}

/**
 * Update login patterns for timing analysis
 */
async function updateLoginPatterns(userId: string, loginTime: number): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const existingPattern = user.privateMetadata?.loginPattern as LoginPattern;
    const loginDate = new Date(loginTime);
    const loginHour = loginDate.getHours();
    const loginDay = loginDate.getDay();

    let loginPattern: LoginPattern;

    if (!existingPattern) {
      // First login pattern
      loginPattern = {
        userId,
        typicalHours: [loginHour],
        typicalDays: [loginDay],
        averageFrequency: 24, // Default to 24 hours
        lastLoginTime: loginTime,
        recentLocations: [],
      };
    } else {
      // Update existing pattern
      const timeSinceLastLogin = loginTime - existingPattern.lastLoginTime;
      const hoursSinceLastLogin = timeSinceLastLogin / (1000 * 60 * 60);

      // Update typical hours (keep most common hours)
      const updatedHours = [...existingPattern.typicalHours, loginHour];
      const hourCounts = updatedHours.reduce(
        (acc, hour) => {
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      );

      // Keep top 5 most common hours
      const topHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([hour]) => parseInt(hour));

      // Update typical days
      const updatedDays = [...new Set([...existingPattern.typicalDays, loginDay])];

      // Update average frequency (weighted average)
      const newAverageFrequency =
        existingPattern.averageFrequency * 0.8 + hoursSinceLastLogin * 0.2;

      loginPattern = {
        ...existingPattern,
        typicalHours: topHours,
        typicalDays: updatedDays,
        averageFrequency: newAverageFrequency,
        lastLoginTime: loginTime,
      };
    }

    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        loginPattern,
      },
    });
  } catch (error) {
    console.error('Error updating login patterns:', error);
  }
}

// ============================================================================
// VERCEL GEOLOCATION HELPERS
// ============================================================================

/**
 * Format Vercel geolocation data into a consistent string format
 * Uses Vercel's built-in geolocation headers (free and reliable)
 */
function formatVercelLocation(vercelGeoData: VercelGeoData): string {
  const city = vercelGeoData.city || 'Unknown';
  const region = vercelGeoData.countryRegion;
  const country = vercelGeoData.country || 'Unknown';

  // If we have coordinates, use them for more precise tracking
  if (vercelGeoData.latitude && vercelGeoData.longitude) {
    return `${vercelGeoData.latitude},${vercelGeoData.longitude}`;
  }

  // Otherwise use city/region/country format
  return region ? `${city}, ${region}, ${country}` : `${city}, ${country}`;
}

/**
 * Calculate distance between two geographic points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Update user's location history in private metadata
 * Now uses Vercel's geolocation data for more accurate tracking
 */
async function updateLocationHistory(userId: string, location: string): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const loginPattern = (user.privateMetadata?.loginPattern as LoginPattern) || {
      userId,
      typicalHours: [],
      typicalDays: [],
      averageFrequency: 24,
      lastLoginTime: Date.now(),
      recentLocations: [],
    };

    // Add new location and keep only last 5 locations
    const updatedLocations = [location, ...loginPattern.recentLocations]
      .filter((loc, index, arr) => arr.indexOf(loc) === index) // Remove duplicates
      .slice(0, 5); // Keep only 5 most recent

    const updatedPattern = {
      ...loginPattern,
      recentLocations: updatedLocations,
    };

    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        loginPattern: updatedPattern,
      },
    });

    console.log(`📍 Updated location history for user ${userId}:`, updatedLocations);
  } catch (error) {
    console.error('Error updating location history:', error);
  }
}
