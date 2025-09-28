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

    // 3. Geographic Anomaly - Check for location changes
    // Note: This would require IP address data from Clerk's session info
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
 * This can provide additional context like IP address, user agent, etc.
 */
export async function getEnhancedSessionInfo(sessionId: string) {
  try {
    // TODO: Use Clerk's session API to get enhanced information
    // This might include IP address, user agent, geographic location
    // const client = await clerkClient();
    // const sessionDetails = await client.sessions.getSession(sessionId);

    return {
      sessionId,
      // Additional metadata from Clerk (when API is implemented)
      ipAddress: undefined, // Available in Clerk's session data
      userAgent: undefined, // Available in Clerk's session data
      location: undefined, // Available in Clerk's session data
    };
  } catch (error) {
    console.error('Error fetching enhanced session info:', error);
    return null;
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
export function logSecurityEvent(event: {
  userId: string;
  sessionId: string;
  eventType: string;
  riskScore: string;
  action: 'notified' | 'ignored';
  reason: string;
}) {
  console.log('🔒 Security Event:', {
    timestamp: new Date().toISOString(),
    ...event,
  });

  // TODO: Store in audit database for compliance and analysis
  // This could integrate with your existing audit logging system
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
 * Note: This requires IP address data which may not be available in webhook data
 */
async function isGeographicAnomaly(
  userId: string,
  _sessionData: ClerkSessionData,
): Promise<boolean> {
  try {
    // TODO: Implement IP geolocation checking
    // This would require:
    // 1. Access to IP address from session data
    // 2. IP geolocation service (like MaxMind GeoIP)
    // 3. Comparison with user's recent locations

    console.log(
      `🔍 Geographic anomaly check for user ${userId} - IP data not available in webhook`,
    );

    // For now, return false as we don't have IP data in webhook
    // In a real implementation, you would:
    // 1. Get IP address from session
    // 2. Use geolocation service to get location
    // 3. Compare with user's recent locations stored in metadata

    return false;
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
