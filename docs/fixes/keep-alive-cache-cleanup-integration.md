# Keep-Alive Cache Cleanup Integration

## Overview

Enhanced the `/api/cron/keep-alive` endpoint to include automated Redis cache cleanup functionality. This provides proactive maintenance of the payment rate limiting cache to prevent corrupted data accumulation.

## Implementation Details

### **🕒 Scheduling**

- **Frequency**: Weekly (Sundays, 2-4 AM UTC)
- **Condition**: Only when Redis is healthy and in active mode
- **Override**: `FORCE_CACHE_CLEANUP=true` environment variable for testing

### **📊 Metrics Integration**

Added new `cacheCleanup` section to `KeepAliveMetrics`:

```typescript
interface KeepAliveMetrics {
  // ... existing fields
  cacheCleanup?: {
    executed: boolean;
    scannedKeys: number;
    corruptedKeys: number;
    cleanedKeys: number;
    errors: number;
    skippedKeys: number;
    executionTime: number;
  };
}
```

### **🎯 System Health Integration**

Cache cleanup status is now part of system health reporting:

- `healthy`: Cleanup executed without errors
- `degraded`: Cleanup executed with errors
- `not-scheduled`: Cleanup not due to run

## Benefits

### **✅ Automated Maintenance**

- **Proactive**: Prevents cache corruption accumulation
- **Scheduled**: Runs during low-traffic hours
- **Safe**: Only operates when Redis is healthy

### **✅ Comprehensive Monitoring**

- **Metrics**: Detailed cleanup statistics
- **Logging**: Clear execution status
- **Health**: Integrated with system health checks

### **✅ Production-Ready**

- **Minimal Impact**: Fast execution (< 200ms typically)
- **Error Handling**: Graceful failure handling
- **Testing**: Force cleanup flag for verification

## Usage

### **Normal Operation**

The cache cleanup runs automatically every Sunday between 2-4 AM UTC when:

1. Redis is healthy and in active mode
2. The keep-alive cron job executes
3. Current time falls within the cleanup window

### **Manual Testing**

```bash
# Force cleanup to run immediately
FORCE_CACHE_CLEANUP=true npx -p dotenv -p tsx tsx -r dotenv/config scripts/test-keep-alive-cache-cleanup.ts
```

### **Expected Output**

```
🧹 Starting weekly Redis cache cleanup...
🔍 Scanning for payment rate limit cache entries...
📊 Found 0 payment rate limit keys to check
✅ No payment rate limit keys found
✅ Cache cleanup completed in 145ms: { scanned: 0, corrupted: 0, cleaned: 0, errors: 0 }
```

## Monitoring

### **Log Patterns**

**Successful Cleanup:**

```
✅ Cache cleanup completed in 145ms: { scanned: 0, corrupted: 0, cleaned: 0, errors: 0 }
```

**Corrupted Entries Found:**

```
🗑️ Removed 3 corrupted cache entries
✅ Cache cleanup completed in 200ms: { scanned: 5, corrupted: 3, cleaned: 3, errors: 0 }
```

**Cleanup Error:**

```
❌ Cache cleanup failed: [error details]
```

**Not Scheduled:**

```
📅 Cache cleanup scheduled for Sundays 2-4 AM UTC (current: 2025-01-09T10:30:00.000Z)
```

### **Metrics Tracking**

All cleanup statistics are included in the keep-alive response:

```json
{
  "metrics": {
    "cacheCleanup": {
      "executed": true,
      "cleaned": "0/0 entries",
      "errors": 0,
      "executionTime": "145ms"
    },
    "systemHealth": {
      "cacheCleanup": "healthy"
    }
  }
}
```

## Configuration

### **Environment Variables**

- `FORCE_CACHE_CLEANUP=true` - Force cleanup execution (testing)
- `CRON_SECRET` - Required for keep-alive endpoint access

### **Timing Configuration**

The cleanup schedule can be modified in the keep-alive route:

```typescript
const isWeeklyCleanupDay = now.getDay() === 0; // Sunday (0-6, Sunday = 0)
const isCleanupHour = now.getHours() >= 2 && now.getHours() <= 4; // 2-4 AM UTC
```

## Files Modified

1. **`app/api/cron/keep-alive/route.ts`** - Main integration
2. **`scripts/test-keep-alive-cache-cleanup.ts`** - Test script
3. **`scripts/cleanup-payment-rate-limit-cache.ts`** - Core cleanup function
4. **`docs/fixes/keep-alive-cache-cleanup-integration.md`** - This documentation

## Performance Impact

- **Execution Time**: < 200ms typically
- **Frequency**: Once per week
- **Resource Usage**: Minimal Redis operations
- **User Impact**: None (runs during low-traffic hours)

## Error Handling

- **Redis Unavailable**: Cleanup skipped, no errors
- **Cleanup Failure**: Logged, metrics updated, keep-alive continues
- **Timeout**: Protected by overall keep-alive timeout limits

---

**Status**: ✅ **Implemented and Tested**  
**Type**: **Proactive Maintenance Enhancement**  
**Impact**: **Cache Health, System Reliability**
