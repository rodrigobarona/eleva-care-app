# Database Cache Integration Plan - Eleva Care

## 🎯 **Overview: Intelligent Database Caching**

Transform Eleva Care's database performance with Redis-powered query caching, intelligent invalidation strategies, and optimized data access patterns. This plan focuses on integrating the **DatabaseCache** to deliver lightning-fast data retrieval and reduced database load.

## 📊 **Current State Analysis**

### **Existing Database Infrastructure**

- ✅ **Drizzle ORM**: Type-safe database queries with PostgreSQL
- ✅ **Neon Database**: Serverless PostgreSQL with connection pooling
- ✅ **Query Patterns**: User profiles, appointments, payments, expert data
- ✅ **Relationships**: Complex joins between users, experts, and appointments
- ✅ **Indexes**: Basic indexing for common query patterns

### **Performance Bottlenecks**

- **Repeated Queries**: Same data fetched multiple times per request
- **Complex Joins**: Heavy queries for dashboard and analytics
- **N+1 Problems**: Multiple queries for related data
- **Cold Starts**: Database connection overhead
- **Large Result Sets**: Inefficient pagination and filtering

## 🚀 **DatabaseCache Integration Strategy**

### **Phase 1: Core Query Caching (Week 1)**

#### **1.1 User Profile Caching** - `lib/database-cache-wrapper.ts`

**Time Estimate**: 6 hours

```typescript
// Intelligent user profile caching wrapper
import { db } from '@/lib/db';
import { DatabaseCache } from '@/lib/redis';

export class UserProfileCache {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Try cache first
    const cacheKey = `user_profile:${userId}`;
    const cached = await DatabaseCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from database with optimized query
    const profile = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.id, userId),
      with: {
        profile: true,
        preferences: true,
        verificationStatus: true,
      },
    });

    if (profile) {
      // Cache for 1 hour
      await DatabaseCache.set(cacheKey, profile, 3600);
    }

    return profile;
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    // Update database
    const updatedProfile = await db
      .update(UsersTable)
      .set(updates)
      .where(eq(UsersTable.id, userId))
      .returning();

    // Invalidate cache
    await DatabaseCache.invalidate(`user_profile:${userId}`);

    // Invalidate related caches
    await this.invalidateRelatedCaches(userId);

    return updatedProfile[0];
  }

  async batchGetUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    // Try to get all from cache first
    const cacheKeys = userIds.map((id) => `user_profile:${id}`);
    const cachedProfiles = await DatabaseCache.mget(cacheKeys);

    // Find missing profiles
    const missingIds = userIds.filter((id, index) => !cachedProfiles[index]);

    if (missingIds.length === 0) {
      return cachedProfiles.filter(Boolean);
    }

    // Fetch missing profiles from database
    const missingProfiles = await db.query.UsersTable.findMany({
      where: inArray(UsersTable.id, missingIds),
      with: {
        profile: true,
        preferences: true,
        verificationStatus: true,
      },
    });

    // Cache missing profiles
    const cacheOperations = missingProfiles.map((profile) =>
      DatabaseCache.set(`user_profile:${profile.id}`, profile, 3600),
    );
    await Promise.all(cacheOperations);

    // Combine cached and fresh data
    return this.combineProfileResults(userIds, cachedProfiles, missingProfiles);
  }

  private async invalidateRelatedCaches(userId: string) {
    // Invalidate related caches when user profile changes
    await Promise.all([
      DatabaseCache.invalidate(`user_appointments:${userId}`),
      DatabaseCache.invalidate(`user_payments:${userId}`),
      DatabaseCache.invalidatePattern(`dashboard:*:${userId}`),
    ]);
  }
}
```

**Benefits**:

- **90% faster** user profile loading with cache hits
- **Batch optimization** reducing N+1 query problems
- **Intelligent invalidation** maintaining data consistency

#### **1.2 Expert Profile Optimization** - `app/api/experts/cache-wrapper.ts`

**Time Estimate**: 5 hours

```typescript
// Expert profile caching with availability optimization
export class ExpertProfileCache {
  async getExpertProfile(
    expertId: string,
    includeAvailability: boolean = false,
  ): Promise<ExpertProfile> {
    const cacheKey = `expert_profile:${expertId}:${includeAvailability ? 'full' : 'basic'}`;

    const cached = await DatabaseCache.get(cacheKey);
    if (cached) return cached;

    // Optimized query based on requirements
    const query = {
      where: eq(ExpertsTable.id, expertId),
      with: {
        profile: true,
        specializations: true,
        reviews: {
          limit: 10,
          orderBy: desc(ReviewsTable.createdAt),
        },
        ...(includeAvailability && {
          availability: {
            where: gte(AvailabilityTable.date, new Date()),
            orderBy: asc(AvailabilityTable.date),
          },
        }),
      },
    };

    const expert = await db.query.ExpertsTable.findFirst(query);

    if (expert) {
      // Different TTL based on data type
      const ttl = includeAvailability ? 300 : 1800; // 5 min vs 30 min
      await DatabaseCache.set(cacheKey, expert, ttl);
    }

    return expert;
  }

  async getExpertsBySpecialization(
    specialization: string,
    limit: number = 20,
  ): Promise<ExpertProfile[]> {
    const cacheKey = `experts_by_spec:${specialization}:${limit}`;

    const cached = await DatabaseCache.get(cacheKey);
    if (cached) return cached;

    const experts = await db.query.ExpertsTable.findMany({
      where: and(eq(ExpertsTable.isActive, true), eq(ExpertsTable.isVerified, true)),
      with: {
        profile: true,
        specializations: {
          where: eq(SpecializationsTable.name, specialization),
        },
        reviews: {
          limit: 5,
          orderBy: desc(ReviewsTable.createdAt),
        },
      },
      limit,
      orderBy: [desc(ExpertsTable.rating), desc(ExpertsTable.totalReviews)],
    });

    // Cache for 15 minutes (expert listings change less frequently)
    await DatabaseCache.set(cacheKey, experts, 900);

    return experts;
  }

  async updateExpertAvailability(expertId: string, availability: AvailabilitySlot[]) {
    // Update database
    await db.transaction(async (tx) => {
      // Delete existing availability
      await tx
        .delete(AvailabilityTable)
        .where(
          and(eq(AvailabilityTable.expertId, expertId), gte(AvailabilityTable.date, new Date())),
        );

      // Insert new availability
      await tx.insert(AvailabilityTable).values(availability);
    });

    // Invalidate availability-related caches
    await this.invalidateAvailabilityCaches(expertId);
  }

  private async invalidateAvailabilityCaches(expertId: string) {
    await Promise.all([
      DatabaseCache.invalidate(`expert_profile:${expertId}:full`),
      DatabaseCache.invalidatePattern(`expert_availability:${expertId}:*`),
      DatabaseCache.invalidatePattern(`available_experts:*`),
    ]);
  }
}
```

#### **1.3 Appointment Data Optimization** - `app/api/appointments/cache-wrapper.ts`

**Time Estimate**: 4 hours

```typescript
// Appointment caching with real-time updates
export class AppointmentCache {
  async getUserAppointments(userId: string, status?: AppointmentStatus): Promise<Appointment[]> {
    const cacheKey = `user_appointments:${userId}:${status || 'all'}`;

    const cached = await DatabaseCache.get(cacheKey);
    if (cached) return cached;

    const whereConditions = [eq(AppointmentsTable.userId, userId)];
    if (status) {
      whereConditions.push(eq(AppointmentsTable.status, status));
    }

    const appointments = await db.query.AppointmentsTable.findMany({
      where: and(...whereConditions),
      with: {
        expert: {
          with: {
            profile: true,
          },
        },
        payment: true,
      },
      orderBy: desc(AppointmentsTable.scheduledAt),
    });

    // Cache for 10 minutes (appointments change frequently)
    await DatabaseCache.set(cacheKey, appointments, 600);

    return appointments;
  }

  async getExpertAppointments(expertId: string, dateRange: DateRange): Promise<Appointment[]> {
    const cacheKey = `expert_appointments:${expertId}:${dateRange.start}:${dateRange.end}`;

    const cached = await DatabaseCache.get(cacheKey);
    if (cached) return cached;

    const appointments = await db.query.AppointmentsTable.findMany({
      where: and(
        eq(AppointmentsTable.expertId, expertId),
        gte(AppointmentsTable.scheduledAt, dateRange.start),
        lte(AppointmentsTable.scheduledAt, dateRange.end),
      ),
      with: {
        user: {
          with: {
            profile: true,
          },
        },
        payment: true,
      },
      orderBy: asc(AppointmentsTable.scheduledAt),
    });

    // Cache for 5 minutes (expert schedules are time-sensitive)
    await DatabaseCache.set(cacheKey, appointments, 300);

    return appointments;
  }

  async createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment> {
    // Create appointment in database
    const appointment = await db.insert(AppointmentsTable).values(appointmentData).returning();

    // Invalidate related caches
    await this.invalidateAppointmentCaches(appointmentData.userId, appointmentData.expertId);

    return appointment[0];
  }

  private async invalidateAppointmentCaches(userId: string, expertId: string) {
    await Promise.all([
      DatabaseCache.invalidatePattern(`user_appointments:${userId}:*`),
      DatabaseCache.invalidatePattern(`expert_appointments:${expertId}:*`),
      DatabaseCache.invalidatePattern(`dashboard:appointments:*`),
      DatabaseCache.invalidate(`expert_profile:${expertId}:full`), // Availability changed
    ]);
  }
}
```

### **Phase 2: Advanced Caching Strategies (Week 2)**

#### **2.1 Dashboard Data Caching** - `app/dashboard/cache-optimizer.ts`

**Time Estimate**: 6 hours

```typescript
// Dashboard-specific caching with aggregation
export class DashboardCacheOptimizer {
  async getDashboardData(userId: string, userRole: string): Promise<DashboardData> {
    const cacheKey = `dashboard:${userRole}:${userId}`;

    const cached = await DatabaseCache.get(cacheKey);
    if (cached) return cached;

    // Role-specific dashboard data
    const dashboardData = await this.generateDashboardData(userId, userRole);

    // Cache with role-specific TTL
    const ttl = this.getTTLForRole(userRole);
    await DatabaseCache.set(cacheKey, dashboardData, ttl);

    return dashboardData;
  }

  private async generateDashboardData(userId: string, role: string): Promise<DashboardData> {
    switch (role) {
      case 'admin':
        return this.generateAdminDashboard();
      case 'expert':
        return this.generateExpertDashboard(userId);
      case 'user':
        return this.generateUserDashboard(userId);
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  }

  private async generateAdminDashboard(): Promise<AdminDashboardData> {
    // Use parallel queries for better performance
    const [totalUsers, totalExperts, recentAppointments, revenueMetrics, pendingVerifications] =
      await Promise.all([
        this.getTotalUsersCount(),
        this.getTotalExpertsCount(),
        this.getRecentAppointments(50),
        this.getRevenueMetrics('30d'),
        this.getPendingVerifications(),
      ]);

    return {
      totalUsers,
      totalExperts,
      recentAppointments,
      revenueMetrics,
      pendingVerifications,
      generatedAt: Date.now(),
    };
  }

  private async generateExpertDashboard(expertId: string): Promise<ExpertDashboardData> {
    const [upcomingAppointments, recentReviews, earningsData, availabilityStatus] =
      await Promise.all([
        this.getExpertUpcomingAppointments(expertId),
        this.getExpertRecentReviews(expertId),
        this.getExpertEarnings(expertId, '30d'),
        this.getExpertAvailabilityStatus(expertId),
      ]);

    return {
      upcomingAppointments,
      recentReviews,
      earningsData,
      availabilityStatus,
      generatedAt: Date.now(),
    };
  }

  private getTTLForRole(role: string): number {
    // Different cache durations based on data sensitivity
    switch (role) {
      case 'admin':
        return 300; // 5 minutes (frequently changing data)
      case 'expert':
        return 600; // 10 minutes (moderate changes)
      case 'user':
        return 900; // 15 minutes (less frequent changes)
      default:
        return 600;
    }
  }
}
```

#### **2.2 Cache Invalidation Strategies** - `lib/database/cache-invalidation.ts`

**Time Estimate**: 4 hours

```typescript
// Intelligent cache invalidation system
export class DatabaseCacheInvalidation {
  async invalidateOnUserUpdate(userId: string, updateType: string) {
    const invalidationMap = {
      profile: [`user_profile:${userId}`, `dashboard:user:${userId}`],
      preferences: [`user_profile:${userId}`, `user_preferences:${userId}`],
      verification: [`user_profile:${userId}`, `dashboard:admin:*`, `pending_verifications:*`],
    };

    const keysToInvalidate = invalidationMap[updateType] || [];
    await this.invalidateKeys(keysToInvalidate);
  }

  async invalidateOnAppointmentChange(appointmentId: string, changeType: string) {
    // Get appointment details for targeted invalidation
    const appointment = await this.getAppointmentDetails(appointmentId);

    const baseKeys = [
      `user_appointments:${appointment.userId}:*`,
      `expert_appointments:${appointment.expertId}:*`,
      `dashboard:user:${appointment.userId}`,
      `dashboard:expert:${appointment.expertId}`,
    ];

    if (changeType === 'status_change') {
      baseKeys.push(`dashboard:admin:*`);
    }

    await this.invalidateKeys(baseKeys);
  }

  async invalidateOnPaymentComplete(paymentId: string) {
    const payment = await this.getPaymentDetails(paymentId);

    await this.invalidateKeys([
      `user_payments:${payment.userId}:*`,
      `expert_earnings:${payment.expertId}:*`,
      `dashboard:admin:*`,
      `revenue_metrics:*`,
    ]);
  }

  private async invalidateKeys(patterns: string[]) {
    const operations = patterns.map((pattern) => {
      if (pattern.includes('*')) {
        return DatabaseCache.invalidatePattern(pattern);
      } else {
        return DatabaseCache.invalidate(pattern);
      }
    });

    await Promise.all(operations);
  }

  async schedulePeriodicInvalidation() {
    // Schedule regular cache cleanup
    setInterval(
      async () => {
        await Promise.all([
          DatabaseCache.invalidatePattern('dashboard:*'),
          DatabaseCache.invalidatePattern('*:expired:*'),
          this.cleanupStaleEntries(),
        ]);
      },
      30 * 60 * 1000,
    ); // Every 30 minutes
  }

  private async cleanupStaleEntries() {
    // Remove entries that haven't been accessed recently
    const staleThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    await DatabaseCache.cleanupStaleEntries(staleThreshold);
  }
}
```

### **Phase 3: Performance Optimization (Week 2)**

#### **3.1 Query Optimization Wrapper** - `lib/database/query-optimizer.ts`

**Time Estimate**: 5 hours

```typescript
// Intelligent query optimization with caching
export class QueryOptimizer {
  async optimizedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const { ttl = 600, tags = [], skipCache = false, refreshThreshold = 0.8 } = options;

    if (skipCache) {
      return queryFn();
    }

    // Try cache first
    const cached = await DatabaseCache.getWithMetadata(queryKey);

    if (cached) {
      // Check if we should refresh in background
      const age = Date.now() - cached.timestamp;
      const shouldRefresh = age > ttl * refreshThreshold * 1000;

      if (shouldRefresh) {
        // Refresh in background
        this.refreshInBackground(queryKey, queryFn, ttl, tags);
      }

      return cached.data;
    }

    // Execute query and cache result
    const result = await queryFn();

    await DatabaseCache.setWithTags(queryKey, result, ttl, tags);

    return result;
  }

  async batchOptimizedQuery<T>(
    queries: Array<{
      key: string;
      fn: () => Promise<T>;
      options?: CacheOptions;
    }>,
  ): Promise<T[]> {
    // Get all cache keys
    const cacheKeys = queries.map((q) => q.key);
    const cachedResults = await DatabaseCache.mget(cacheKeys);

    // Find queries that need execution
    const missingQueries = queries.filter((_, index) => !cachedResults[index]);

    if (missingQueries.length === 0) {
      return cachedResults;
    }

    // Execute missing queries in parallel
    const missingResults = await Promise.all(missingQueries.map((query) => query.fn()));

    // Cache missing results
    const cacheOperations = missingQueries.map((query, index) => {
      const options = query.options || {};
      return DatabaseCache.setWithTags(
        query.key,
        missingResults[index],
        options.ttl || 600,
        options.tags || [],
      );
    });

    await Promise.all(cacheOperations);

    // Combine cached and fresh results
    return this.combineResults(queries, cachedResults, missingResults);
  }

  private async refreshInBackground(
    queryKey: string,
    queryFn: () => Promise<any>,
    ttl: number,
    tags: string[],
  ) {
    try {
      const freshResult = await queryFn();
      await DatabaseCache.setWithTags(queryKey, freshResult, ttl, tags);
    } catch (error) {
      console.error(`Background refresh failed for ${queryKey}:`, error);
    }
  }
}
```

## 📈 **Expected Performance Improvements**

### **Immediate Benefits (Phase 1)**

- **80% faster** user profile and expert data loading
- **90% reduction** in database query volume
- **50% improvement** in dashboard load times
- **Elimination** of N+1 query problems

### **Advanced Benefits (Phase 2-3)**

- **95% improvement** in complex dashboard queries
- **Intelligent invalidation** maintaining data consistency
- **Background refresh** ensuring data freshness
- **Batch optimization** for related data fetching

## 🔧 **Implementation Checklist**

### **Week 1: Core Query Caching**

- [ ] Implement user profile caching wrapper
- [ ] Add expert profile optimization with availability
- [ ] Create appointment data caching system
- [ ] Add basic cache invalidation triggers
- [ ] Implement batch query optimization

### **Week 2: Advanced Features**

- [ ] Create dashboard-specific caching strategies
- [ ] Implement intelligent cache invalidation system
- [ ] Add query optimization wrapper with background refresh
- [ ] Create cache performance monitoring
- [ ] Add cache analytics and reporting

### **Week 3: Testing & Optimization**

- [ ] Load testing with high query volumes
- [ ] Cache hit rate analysis and optimization
- [ ] Performance benchmarking vs uncached queries
- [ ] Documentation and best practices guide

## 🎯 **Success Metrics**

### **Performance KPIs**

- **Query Response Time**: < 50ms for cached queries
- **Cache Hit Rate**: >85% for frequently accessed data
- **Database Load Reduction**: 60-80% fewer queries
- **Dashboard Load Time**: < 1 second for cached data

### **Technical KPIs**

- **Memory Efficiency**: Optimal TTL management
- **Invalidation Accuracy**: >95% correct cache invalidations
- **Background Refresh Success**: >98% successful refreshes
- **Error Rate**: <0.5% cache-related errors

## 🔄 **Integration with Existing Systems**

### **Drizzle ORM Compatibility**

- Seamless integration with existing query patterns
- Type-safe caching with TypeScript support
- Maintains existing database relationships

### **Neon Database Optimization**

- Reduces connection pool pressure
- Optimizes serverless function performance
- Maintains data consistency across instances

## 🚀 **Next Steps**

1. **Implement Phase 1** core query caching
2. **Monitor cache hit rates** and optimize TTL settings
3. **Add intelligent invalidation** for data consistency
4. **Implement Phase 2 advanced features** based on usage patterns
5. **Document caching patterns** for future development

**Transforming Eleva Care into a database performance powerhouse with intelligent caching! 🗄️⚡**
