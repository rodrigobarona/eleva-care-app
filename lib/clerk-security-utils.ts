/**
 * Clerk Security Utilities
 *
 * This module provides utilities for leveraging Clerk's built-in security features
 * and making intelligent decisions about when to send security notifications.
 */

// import { clerkClient } from '@clerk/nextjs/server';

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
}

/**
 * Analyze a session for security risks using Clerk's data
 * This leverages Clerk's built-in device and location tracking
 */
export async function analyzeSessionSecurity(
  _sessionData: ClerkSessionData,
  _userId: string,
): Promise<SessionSecurityAnalysis> {
  try {
    // const client = await clerkClient();

    // Get user's recent sessions to compare patterns
    // const user = await client.users.getUser(userId);

    // TODO: Implement smart analysis based on:
    // 1. Client ID patterns (new device detection) - compare with user.lastSignInAt
    // 2. Session timing patterns - analyze user login history
    // 3. Geographic location changes - compare IP geolocation
    // 4. Frequency of logins - detect unusual patterns

    // For now, implement basic logic
    const analysis: SessionSecurityAnalysis = {
      isNewDevice: false, // TODO: Compare client_id with recent sessions
      isUnusualTiming: false, // TODO: Check if login time is unusual for user
      isGeographicAnomaly: false, // TODO: Check IP geolocation changes
      riskScore: 'low',
      shouldNotify: false,
      reason: 'Normal login activity',
    };

    // Determine if we should notify based on risk factors
    if (analysis.isNewDevice || analysis.isUnusualTiming || analysis.isGeographicAnomaly) {
      analysis.riskScore = analysis.isGeographicAnomaly ? 'high' : 'medium';
      analysis.shouldNotify = true;
      analysis.reason = `Security alert: ${[
        analysis.isNewDevice && 'new device',
        analysis.isUnusualTiming && 'unusual timing',
        analysis.isGeographicAnomaly && 'location change',
      ]
        .filter(Boolean)
        .join(', ')} detected`;
    }

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
export async function shouldSendSecurityNotification(_userId: string): Promise<boolean> {
  try {
    // TODO: Check user's notification preferences from user metadata
    // const client = await clerkClient();
    // const user = await client.users.getUser(userId);
    // const preferences = user.publicMetadata?.notificationPreferences;
    // return preferences?.securityAlerts !== false;

    // For now, default to true (send notifications)
    return true;
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
