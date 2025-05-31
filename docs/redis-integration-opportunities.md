# Redis Integration Opportunities for Eleva Care

## Overview

Based on comprehensive analysis of the Eleva Care codebase, here are **high-impact Redis integration opportunities** that can significantly improve performance, scalability, and user experience.

## 🔥 **Priority 1: High-Impact Integrations**

### 1. **Advanced Rate Limiting System**

**Current State**: Basic rate limiting using database timestamps in `app/api/stripe/identity/verification/route.ts`

**Redis Enhancement**: Distributed, high-performance rate limiting with sliding windows

```typescript
// Usage in API routes
import { RateLimitCache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);
  const clientIP = request.ip || 'unknown';

  // User-based rate limiting (authenticated users)
  if (userId) {
    const userLimit = await RateLimitCache.checkRateLimit(
      `user:${userId}:identity-verification`,
      3, // 3 attempts
      3600, // per hour
    );

    if (!userLimit.allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${Math.ceil((userLimit.resetTime - Date.now()) / 1000)} seconds.`,
          resetTime: userLimit.resetTime,
        },
        { status: 429 },
      );
    }

    // Record the attempt
    await RateLimitCache.recordAttempt(`user:${userId}:identity-verification`, 3600);
  }

  // IP-based rate limiting (fallback)
  const ipLimit = await RateLimitCache.checkRateLimit(
    `ip:${clientIP}:identity-verification`,
    10, // 10 attempts per IP
    3600, // per hour
  );

  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests from this IP address',
        resetTime: ipLimit.resetTime,
      },
      { status: 429 },
    );
  }

  await RateLimitCache.recordAttempt(`ip:${clientIP}:identity-verification`, 3600);

  // Continue with normal processing...
}
```

**Benefits**:

- ✅ **Distributed**: Works across multiple server instances
- ✅ **Performance**: Sub-millisecond rate limit checks
- ✅ **Flexible**: Different limits for different endpoints
- ✅ **Accurate**: Sliding window prevents timing attacks

### 2. **Notification Queue Management**

**Current State**: Direct Novu API calls in `lib/notifications.ts`

**Redis Enhancement**: Intelligent queueing, batching, and retry logic

```typescript
// Enhanced notification system
import { NotificationQueueCache, QueuedNotification } from '@/lib/redis';

export async function createUserNotification(params: CreateNotificationParams): Promise<boolean> {
  const { userId, type, data = {} } = params;

  // Queue notification for batch processing
  await NotificationQueueCache.queueNotification(userId, {
    type,
    title: getNotificationTitle(type, data),
    message: getNotificationMessage(type, data),
    data,
    priority: getNotificationPriority(type),
    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor as string) : undefined,
  });

  return true;
}

// Background job to process notification queue
export async function processNotificationQueue() {
  const users = await getActiveUsers(); // Your logic to get users

  for (const user of users) {
    const pendingNotifications = await NotificationQueueCache.getPendingNotifications(user.id, 5);

    if (pendingNotifications.length > 0) {
      // Process in batch for better performance
      await sendBatchNotifications(user.id, pendingNotifications);

      // Remove processed notifications
      const notificationIds = pendingNotifications.map((n) => n.id);
      await NotificationQueueCache.removeProcessedNotifications(user.id, notificationIds);
    }
  }
}
```

**Benefits**:

- ✅ **Reliability**: Retry failed notifications
- ✅ **Performance**: Batch processing reduces API calls
- ✅ **Smart Delivery**: Priority-based ordering
- ✅ **Scheduling**: Delayed notification support

### 3. **Analytics & Metrics Caching**

**Current State**: PostHog calls scattered throughout the application

**Redis Enhancement**: Centralized analytics caching with batching

```typescript
// Enhanced PostHog integration
import { AnalyticsCache } from '@/lib/redis';

// Cache expensive analytics queries
export async function getDashboardAnalytics(userId: string) {
  const cacheKey = `dashboard-analytics:${userId}`;

  // Try cache first
  const cached = await AnalyticsCache.getAnalytics(cacheKey);
  if (cached && Date.now() - cached.cachedAt < 10 * 60 * 1000) {
    // 10 minutes
    return cached.data;
  }

  // Fetch fresh data
  const analyticsData = await fetchAnalyticsFromDatabase(userId);

  // Cache for next time
  await AnalyticsCache.cacheAnalytics(cacheKey, analyticsData, 1800); // 30 minutes

  return analyticsData;
}

// Track metrics efficiently
export async function trackUserAction(action: string, userId: string) {
  // Increment counter in Redis
  await AnalyticsCache.incrementMetric(`user-action:${action}:daily:${getDateKey()}`);
  await AnalyticsCache.incrementMetric(
    `user-action:${action}:user:${userId}:daily:${getDateKey()}`,
  );

  // Cache PostHog data for batch sending
  await AnalyticsCache.cachePostHogData(userId, {
    action,
    timestamp: Date.now(),
    properties: { userId },
  });
}
```

**Benefits**:

- ✅ **Performance**: Fast analytics dashboard loading
- ✅ **Cost Savings**: Reduced expensive database queries
- ✅ **Real-time**: Live metrics without PostHog delays
- ✅ **Batch Processing**: Efficient PostHog data sending

### 4. **Session Enhancement**

**Current State**: Clerk handles basic session management

**Redis Enhancement**: Extended session data and activity tracking

```typescript
// Enhanced session management
import { SessionCache } from '@/lib/redis';

// Middleware to enhance session data
export async function enhanceSession(request: NextRequest) {
  const { userId, sessionId } = getAuth(request);

  if (userId && sessionId) {
    // Get user roles and preferences
    const userRoles = await getUserRoles(userId);
    const deviceInfo = getDeviceInfo(request);

    // Store enhanced session data
    await SessionCache.setSessionData(sessionId, {
      userId,
      roles: userRoles,
      lastActivity: Date.now(),
      deviceInfo,
      preferences: await getUserPreferences(userId),
    });

    // Update activity timestamp
    await SessionCache.updateSessionActivity(sessionId);
  }
}

// Quick role checks without database calls
export async function hasRoleFromSession(sessionId: string, role: string): Promise<boolean> {
  const sessionData = await SessionCache.getSessionData(sessionId);
  return sessionData?.roles.includes(role) || false;
}
```

**Benefits**:

- ✅ **Performance**: Instant role/permission checks
- ✅ **Activity Tracking**: Real-time user activity monitoring
- ✅ **Device Management**: Enhanced security insights
- ✅ **Preferences**: Fast user preference access

## 🎯 **Priority 2: Performance Optimizations**

### 5. **Database Query Caching**

**Current State**: Direct database queries in components and API routes

**Redis Enhancement**: Smart query result caching

```typescript
// Create a database cache layer
import { CustomerCache } from '@/lib/redis';

export class DatabaseCache {
  static async getUser(userId: string, ttl: number = 1800) {
    const cacheKey = `db:user:${userId}`;

    // Try cache first
    const cached = await CustomerCache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Fetch from database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (user) {
      await CustomerCache.set(cacheKey, JSON.stringify(user), ttl);
    }

    return user;
  }

  static async getExpertProfile(userId: string) {
    const cacheKey = `db:profile:${userId}`;

    const cached = await CustomerCache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const profile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, userId),
      with: {
        events: true,
        availability: true,
      },
    });

    if (profile) {
      await CustomerCache.set(cacheKey, JSON.stringify(profile), 600); // 10 minutes
    }

    return profile;
  }

  // Invalidate cache when data changes
  static async invalidateUser(userId: string) {
    await CustomerCache.delete(`db:user:${userId}`);
    await CustomerCache.delete(`db:profile:${userId}`);
  }
}
```

### 6. **Temporary Data Storage**

**Current State**: Some temporary data stored in database or memory

**Redis Enhancement**: Efficient temporary storage with automatic cleanup

```typescript
// Temporary storage for multi-step processes
export class TempDataCache {
  private static readonly CACHE_PREFIX = 'temp:';

  static async storeSetupProgress(userId: string, step: string, data: Record<string, unknown>) {
    const cacheKey = this.CACHE_PREFIX + `setup:${userId}:${step}`;
    await redisManager.set(cacheKey, JSON.stringify(data), 3600); // 1 hour
  }

  static async getSetupProgress(userId: string, step: string) {
    const cacheKey = this.CACHE_PREFIX + `setup:${userId}:${step}`;
    const cached = await redisManager.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  static async storeOAuthState(state: string, data: Record<string, unknown>) {
    const cacheKey = this.CACHE_PREFIX + `oauth:${state}`;
    await redisManager.set(cacheKey, JSON.stringify(data), 900); // 15 minutes
  }

  static async getOAuthState(state: string) {
    const cacheKey = this.CACHE_PREFIX + `oauth:${state}`;
    const cached = await redisManager.get(cacheKey);
    if (cached) {
      await redisManager.del(cacheKey); // One-time use
      return JSON.parse(cached);
    }
    return null;
  }
}
```

## 🚀 **Priority 3: Advanced Features**

### 7. **Real-time Features**

**Redis Enhancement**: Pub/Sub for real-time updates

```typescript
// Real-time appointment updates
export class RealtimeUpdates {
  static async publishAppointmentUpdate(appointmentId: string, update: Record<string, unknown>) {
    const channel = `appointment:${appointmentId}`;
    await redisManager.publish(channel, JSON.stringify(update));
  }

  static async subscribeToAppointment(appointmentId: string, callback: (data: any) => void) {
    const channel = `appointment:${appointmentId}`;
    await redisManager.subscribe(channel, callback);
  }

  static async publishExpertStatusUpdate(expertId: string, status: 'online' | 'busy' | 'offline') {
    const channel = `expert:${expertId}:status`;
    await redisManager.publish(channel, JSON.stringify({ status, timestamp: Date.now() }));
  }
}
```

### 8. **Distributed Locks**

**Redis Enhancement**: Prevent race conditions in critical operations

```typescript
// Distributed locking for critical operations
export class DistributedLock {
  static async acquireLock(resource: string, ttl: number = 30): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    const result = await redisManager.setNX(lockKey, lockValue, ttl);
    return result ? lockValue : null;
  }

  static async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    return (await redisManager.eval(script, [lockKey], [lockValue])) === 1;
  }
}

// Usage in payment processing
export async function processPayment(appointmentId: string) {
  const lockValue = await DistributedLock.acquireLock(`payment:${appointmentId}`, 60);
  if (!lockValue) {
    throw new Error('Payment already being processed');
  }

  try {
    // Process payment logic
    await handlePaymentProcessing(appointmentId);
  } finally {
    await DistributedLock.releaseLock(`payment:${appointmentId}`, lockValue);
  }
}
```

## 📊 **Implementation Priority & Impact**

| Feature             | Implementation Effort | Performance Impact | Business Value | Priority  |
| ------------------- | --------------------- | ------------------ | -------------- | --------- |
| Rate Limiting       | Low                   | High               | High           | 🔥 **P0** |
| Analytics Caching   | Medium                | High               | High           | 🔥 **P0** |
| Session Enhancement | Low                   | Medium             | High           | 🔥 **P0** |
| Notification Queue  | Medium                | Medium             | High           | 🎯 **P1** |
| Database Caching    | Medium                | High               | Medium         | 🎯 **P1** |
| Temp Data Storage   | Low                   | Medium             | Medium         | 🎯 **P1** |
| Real-time Features  | High                  | Medium             | High           | 🚀 **P2** |
| Distributed Locks   | Medium                | Low                | High           | 🚀 **P2** |

## 🛠 **Implementation Strategy**

### Phase 1: Foundation (Week 1-2)

1. Implement `RateLimitCache` for critical API endpoints
2. Add `AnalyticsCache` for dashboard performance
3. Deploy `SessionCache` for enhanced user experience

### Phase 2: Optimization (Week 3-4)

1. Implement `NotificationQueueCache` for reliable notifications
2. Add `DatabaseCache` for frequently accessed data
3. Deploy `TempDataCache` for multi-step processes

### Phase 3: Advanced (Week 5-6)

1. Implement real-time features with Pub/Sub
2. Add distributed locking for critical operations
3. Performance monitoring and optimization

## 🔧 **Integration Examples**

### Rate Limiting Integration

```typescript
// app/api/stripe/identity/verification/route.ts
import { RateLimitCache } from '@/lib/redis';

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  // Replace database-based rate limiting
  const rateLimit = await RateLimitCache.checkRateLimit(
    `identity-verification:${userId}`,
    5, // 5 attempts
    300, // per 5 minutes
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. ${rateLimit.remaining} attempts remaining.`,
        cooldownRemaining: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
      },
      { status: 429 },
    );
  }

  await RateLimitCache.recordAttempt(`identity-verification:${userId}`, 300);

  // Continue with existing logic...
}
```

### Analytics Integration

```typescript
// app/api/customers/route.ts
import { AnalyticsCache } from '@/lib/redis';

export async function GET() {
  const { userId } = await auth();
  const cacheKey = `customers:${userId}`;

  // Check cache first
  const cached = await AnalyticsCache.getAnalytics(cacheKey);
  if (cached) {
    return NextResponse.json(cached.data);
  }

  // Expensive database query
  const customers = await db.select({...}).from(MeetingTable)...;

  // Cache results
  await AnalyticsCache.cacheAnalytics(cacheKey, customers, 900); // 15 minutes

  return NextResponse.json(customers);
}
```

## 🎯 **Expected Benefits**

### Performance Improvements

- **50-80% faster** API response times for cached data
- **90%+ reduction** in database load for read operations
- **Sub-millisecond** rate limit checks
- **10x faster** role/permission validation

### Scalability Enhancements

- **Horizontal scaling** ready for multiple server instances
- **Distributed state** management across regions
- **Queue-based processing** for high-throughput scenarios
- **Real-time capabilities** for live features

### User Experience

- **Instant dashboard loading** with cached analytics
- **Reliable notifications** with retry logic
- **Responsive rate limiting** with clear feedback
- **Enhanced security** with activity tracking

This comprehensive Redis integration plan will transform Eleva Care into a **high-performance, scalable healthcare platform** ready for enterprise-level usage! 🚀
