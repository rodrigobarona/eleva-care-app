/**
 * 📊 Webhook Monitoring with Redis
 *
 * Tracks webhook processing success/failure rates, performance metrics,
 * and provides real-time health monitoring for webhook endpoints.
 *
 * Features:
 * - Rolling window of last 100 webhook events
 * - Success/failure rate tracking
 * - Processing time metrics
 * - Recent failure details for debugging
 * - Automatic alerting integration
 *
 * Usage:
 * ```typescript
 * const monitor = RedisWebhookMonitor.getInstance();
 *
 * // Record success
 * await monitor.recordSuccess('stripe', 'checkout.session.completed', 'evt_123', 250);
 *
 * // Record failure
 * await monitor.recordFailure('stripe', 'checkout.session.completed', 'evt_123', 'Invalid metadata');
 *
 * // Get statistics
 * const stats = await monitor.getStats('stripe');
 * ```
 */
import { redisManager } from './manager';

interface WebhookEvent {
  eventId: string;
  eventType: string;
  success: boolean;
  processingTimeMs?: number;
  error?: string;
  timestamp: string;
}

interface WebhookStats {
  successCount: number;
  failureCount: number;
  averageProcessingTimeMs: number;
  lastSuccessTimestamp: string | null;
  lastFailureTimestamp: string | null;
  recentEvents: number;
}

interface RecentFailure {
  eventId: string;
  eventType: string;
  error: string;
  timestamp: string;
}

export class RedisWebhookMonitor {
  private static instance: RedisWebhookMonitor;
  private readonly ROLLING_WINDOW_SIZE = 100; // Track last 100 events
  private readonly FAILURE_HISTORY_SIZE = 20; // Keep last 20 failures for debugging
  private readonly STATS_TTL = 60 * 60 * 24 * 7; // 7 days

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): RedisWebhookMonitor {
    if (!RedisWebhookMonitor.instance) {
      RedisWebhookMonitor.instance = new RedisWebhookMonitor();
    }
    return RedisWebhookMonitor.instance;
  }

  /**
   * Record a successful webhook processing
   */
  async recordSuccess(
    provider: string,
    eventType: string,
    eventId: string,
    processingTimeMs: number,
  ): Promise<void> {
    try {
      const event: WebhookEvent = {
        eventId,
        eventType,
        success: true,
        processingTimeMs,
        timestamp: new Date().toISOString(),
      };

      await Promise.all([
        // Add to rolling window
        this.addToRollingWindow(provider, event),
        // Update last success timestamp
        redisManager.set(`webhook:${provider}:last_success`, event.timestamp, this.STATS_TTL),
        // Increment success counter
        redisManager.incr(`webhook:${provider}:success_count`),
        // Update processing time moving average
        this.updateProcessingTimeAverage(provider, processingTimeMs),
      ]);

      console.log(`✅ Webhook success recorded: ${provider}/${eventType} (${processingTimeMs}ms)`);
    } catch (error) {
      console.error('Failed to record webhook success:', error);
      // Don't throw - monitoring failure shouldn't break the webhook
    }
  }

  /**
   * Record a failed webhook processing
   */
  async recordFailure(
    provider: string,
    eventType: string,
    eventId: string,
    error: string,
  ): Promise<void> {
    try {
      const event: WebhookEvent = {
        eventId,
        eventType,
        success: false,
        error,
        timestamp: new Date().toISOString(),
      };

      const failure: RecentFailure = {
        eventId,
        eventType,
        error,
        timestamp: event.timestamp,
      };

      await Promise.all([
        // Add to rolling window
        this.addToRollingWindow(provider, event),
        // Update last failure timestamp
        redisManager.set(`webhook:${provider}:last_failure`, event.timestamp, this.STATS_TTL),
        // Increment failure counter
        redisManager.incr(`webhook:${provider}:failure_count`),
        // Add to failure history for debugging
        this.addToFailureHistory(provider, failure),
      ]);

      console.error(`❌ Webhook failure recorded: ${provider}/${eventType} - ${error}`);

      // Check if we should trigger an alert
      await this.checkAndTriggerAlert(provider);
    } catch (error) {
      console.error('Failed to record webhook failure:', error);
      // Don't throw - monitoring failure shouldn't break the webhook
    }
  }

  /**
   * Get webhook statistics for a provider
   */
  async getStats(provider: string): Promise<WebhookStats> {
    try {
      const [successCountStr, failureCountStr, avgTimeStr, lastSuccess, lastFailure, eventsStr] =
        await Promise.all([
          redisManager.get(`webhook:${provider}:success_count`),
          redisManager.get(`webhook:${provider}:failure_count`),
          redisManager.get(`webhook:${provider}:avg_processing_time`),
          redisManager.get(`webhook:${provider}:last_success`),
          redisManager.get(`webhook:${provider}:last_failure`),
          redisManager.get(`webhook:${provider}:events`),
        ]);

      // Get recent events count from rolling window
      let recentEvents = 0;
      if (eventsStr) {
        try {
          const events = JSON.parse(eventsStr) as WebhookEvent[];
          recentEvents = Array.isArray(events) ? events.length : 0;
        } catch {
          recentEvents = 0;
        }
      }

      return {
        successCount: Number.parseInt(successCountStr || '0', 10),
        failureCount: Number.parseInt(failureCountStr || '0', 10),
        averageProcessingTimeMs: Number.parseFloat(avgTimeStr || '0'),
        lastSuccessTimestamp: lastSuccess,
        lastFailureTimestamp: lastFailure,
        recentEvents,
      };
    } catch (error) {
      console.error('Failed to get webhook stats:', error);
      return {
        successCount: 0,
        failureCount: 0,
        averageProcessingTimeMs: 0,
        lastSuccessTimestamp: null,
        lastFailureTimestamp: null,
        recentEvents: 0,
      };
    }
  }

  /**
   * Get recent failures for debugging
   */
  async getRecentFailures(provider: string, limit = 10): Promise<RecentFailure[]> {
    try {
      const failuresStr = await redisManager.get(`webhook:${provider}:recent_failures`);
      if (!failuresStr) return [];

      const failures = JSON.parse(failuresStr) as RecentFailure[];
      return Array.isArray(failures) ? failures.slice(0, limit) : [];
    } catch (error) {
      console.error('Failed to get recent failures:', error);
      return [];
    }
  }

  /**
   * Reset statistics for a provider (useful for testing)
   */
  async resetStats(provider: string): Promise<void> {
    try {
      await Promise.all([
        redisManager.del(`webhook:${provider}:events`),
        redisManager.del(`webhook:${provider}:success_count`),
        redisManager.del(`webhook:${provider}:failure_count`),
        redisManager.del(`webhook:${provider}:avg_processing_time`),
        redisManager.del(`webhook:${provider}:last_success`),
        redisManager.del(`webhook:${provider}:last_failure`),
        redisManager.del(`webhook:${provider}:recent_failures`),
        redisManager.del(`webhook:${provider}:alert_sent`),
      ]);
      console.log(`🔄 Reset webhook stats for: ${provider}`);
    } catch (error) {
      console.error('Failed to reset webhook stats:', error);
    }
  }

  /**
   * Add event to rolling window
   */
  private async addToRollingWindow(provider: string, event: WebhookEvent): Promise<void> {
    try {
      const key = `webhook:${provider}:events`;
      const eventsStr = await redisManager.get(key);

      let events: WebhookEvent[] = [];
      if (eventsStr) {
        try {
          events = JSON.parse(eventsStr) as WebhookEvent[];
          if (!Array.isArray(events)) events = [];
        } catch {
          events = [];
        }
      }

      // Add new event at the beginning
      events.unshift(event);

      // Keep only last N events
      events = events.slice(0, this.ROLLING_WINDOW_SIZE);

      await redisManager.set(key, JSON.stringify(events), this.STATS_TTL);
    } catch (error) {
      console.error('Failed to add to rolling window:', error);
    }
  }

  /**
   * Update processing time moving average
   */
  private async updateProcessingTimeAverage(
    provider: string,
    processingTimeMs: number,
  ): Promise<void> {
    try {
      const key = `webhook:${provider}:avg_processing_time`;
      const avgStr = await redisManager.get(key);
      const currentAvg = avgStr ? Number.parseFloat(avgStr) : 0;

      // Simple moving average (weight new sample at 10%)
      const newAvg =
        currentAvg === 0 ? processingTimeMs : currentAvg * 0.9 + processingTimeMs * 0.1;

      await redisManager.set(key, newAvg.toFixed(2), this.STATS_TTL);
    } catch (error) {
      console.error('Failed to update processing time average:', error);
    }
  }

  /**
   * Add failure to history
   */
  private async addToFailureHistory(provider: string, failure: RecentFailure): Promise<void> {
    try {
      const key = `webhook:${provider}:recent_failures`;
      const failuresStr = await redisManager.get(key);

      let failures: RecentFailure[] = [];
      if (failuresStr) {
        try {
          failures = JSON.parse(failuresStr) as RecentFailure[];
          if (!Array.isArray(failures)) failures = [];
        } catch {
          failures = [];
        }
      }

      // Add new failure at the beginning
      failures.unshift(failure);

      // Keep only last N failures
      failures = failures.slice(0, this.FAILURE_HISTORY_SIZE);

      await redisManager.set(key, JSON.stringify(failures), this.STATS_TTL);
    } catch (error) {
      console.error('Failed to add to failure history:', error);
    }
  }

  /**
   * Check if we should trigger an alert based on failure rate
   */
  private async checkAndTriggerAlert(provider: string): Promise<void> {
    try {
      const stats = await this.getStats(provider);
      const totalEvents = stats.successCount + stats.failureCount;

      // Only check if we have enough data (at least 10 events)
      if (totalEvents < 10) return;

      const successRate = stats.successCount / totalEvents;

      // Alert if success rate drops below 80%
      if (successRate < 0.8) {
        // Check if we already sent an alert recently (avoid spam)
        const alertKey = `webhook:${provider}:alert_sent`;
        const alertSent = await redisManager.get(alertKey);

        if (!alertSent) {
          // Set flag to prevent duplicate alerts (expires after 1 hour)
          await redisManager.set(alertKey, '1', 3600);

          // Trigger alert via Novu
          await this.sendAlert(provider, successRate, stats);
        }
      }
    } catch (error) {
      console.error('Failed to check/trigger alert:', error);
    }
  }

  /**
   * Send alert via Novu when webhook health is degraded
   */
  private async sendAlert(
    provider: string,
    successRate: number,
    stats: WebhookStats,
  ): Promise<void> {
    try {
      // Import Novu utilities dynamically to avoid circular dependencies
      const { triggerWorkflow } = await import('@/app/utils/novu');
      const { ENV_CONFIG } = await import('@/config/env');

      if (!ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID) {
        console.warn('No admin subscriber ID configured for webhook alerts');
        return;
      }

      const recentFailures = await this.getRecentFailures(provider, 5);

      await triggerWorkflow({
        workflowId: 'webhook-health-alert',
        to: {
          subscriberId: ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID,
        },
        payload: {
          provider,
          successRate: (successRate * 100).toFixed(1),
          totalSuccess: stats.successCount,
          totalFailures: stats.failureCount,
          lastFailure: stats.lastFailureTimestamp,
          recentFailures: recentFailures.map((f) => ({
            eventType: f.eventType,
            error: f.error,
            timestamp: f.timestamp,
          })),
          healthUrl: `${ENV_CONFIG.NEXT_PUBLIC_APP_URL}/api/health/${provider}-webhooks`,
          timestamp: new Date().toISOString(),
        },
      });

      console.log(
        `🚨 Webhook health alert sent for ${provider} (success rate: ${(successRate * 100).toFixed(1)}%)`,
      );
    } catch (error) {
      console.error('Failed to send webhook health alert:', error);
    }
  }
}

/**
 * Export singleton instance for convenience
 */
export const webhookMonitor = RedisWebhookMonitor.getInstance();
