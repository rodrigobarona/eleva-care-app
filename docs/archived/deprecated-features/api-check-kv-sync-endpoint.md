# Check KV Sync API Endpoint Documentation

## 🎯 Overview

The `check-kv-sync` endpoint is a **critical monitoring and debugging tool** that verifies data synchronization between Clerk authentication, the unified CustomerCache, and Stripe customer data.

## 📍 Endpoint Details

**URL:** `GET /api/user/check-kv-sync`  
**Authentication:** Required (Clerk session)  
**Runtime:** Node.js  
**Cache Strategy:** Dynamic (force-dynamic)

## 🔍 Purpose & Use Cases

### **Primary Functions**

1. **Data Integrity Verification** - Ensures cached user data matches Clerk profile
2. **Stripe Synchronization Check** - Validates Stripe customer data consistency
3. **Cache Health Monitoring** - Monitors unified CustomerCache performance
4. **Debugging Tool** - Helps diagnose user data sync issues

### **When to Use**

- ✅ **User Profile Issues** - When users report profile data inconsistencies
- ✅ **Payment Problems** - When Stripe integration seems out of sync
- ✅ **Cache Monitoring** - Regular health checks of the cache system
- ✅ **Debugging** - Investigating user data synchronization problems
- ✅ **Support Tickets** - Quick verification of user data integrity

## 🔧 How It Works

### **Step 1: Authentication Check**

```typescript
const { userId } = await auth();
const user = await currentUser();

if (!userId || !user) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
```

### **Step 2: Retrieve Cached Data**

```typescript
// Uses unified CustomerCache (migrated from direct Redis)
const kvUser = await CustomerCache.getCustomerByUserId(userId);
```

### **Step 3: Data Parsing & Validation**

```typescript
// Handles JSON string parsing from CustomerCache
let customerData: StripeCustomerData | null = null;
if (kvUser) {
  try {
    customerData = typeof kvUser === 'string' ? JSON.parse(kvUser) : kvUser;
  } catch (error) {
    console.warn('Failed to parse customer data from cache:', error);
    customerData = null;
  }
}
```

### **Step 4: Basic Data Sync Check**

```typescript
const basicDataInSync =
  customerData &&
  primaryEmail &&
  customerData.email === primaryEmail &&
  customerData.name === fullName &&
  customerData.userId === userId;
```

### **Step 5: Stripe Data Validation**

```typescript
if (customerData?.stripeCustomerId) {
  // Verify customer exists in Stripe
  const customer = await stripe.customers.retrieve(customerData.stripeCustomerId);

  // Check email consistency
  // Validate subscriptions array
  // Verify timestamps
}
```

## 📤 Response Format

### **Success Response**

```json
{
  "isInSync": true,
  "debug": {
    "hasCustomerData": true,
    "basicDataInSync": true,
    "stripeDataInSync": true,
    "cacheSource": "unified_customer_cache"
  }
}
```

### **Out of Sync Response**

```json
{
  "isInSync": false,
  "debug": {
    "hasCustomerData": true,
    "basicDataInSync": false,
    "stripeDataInSync": true,
    "cacheSource": "unified_customer_cache"
  }
}
```

### **Error Response**

```json
{
  "error": "Failed to check KV synchronization"
}
```

## 🏗️ Data Structure Validated

### **StripeCustomerData Interface**

```typescript
interface StripeCustomerData {
  stripeCustomerId: string; // Stripe customer ID
  email: string; // User's primary email
  userId: string; // Clerk user ID
  name?: string | null; // Full name from Clerk
  subscriptions?: string[]; // Array of subscription IDs
  defaultPaymentMethod?: string | null; // Default payment method
  created: number; // Creation timestamp
  updatedAt: number; // Last update timestamp
}
```

## ✅ Sync Validation Criteria

### **Basic Data Sync Checks**

- ✅ **Email Match** - Cached email matches Clerk primary email
- ✅ **Name Match** - Cached name matches constructed Clerk full name
- ✅ **User ID Match** - Cached userId matches Clerk userId
- ✅ **Data Exists** - Customer data exists in cache

### **Stripe Data Sync Checks**

- ✅ **Customer Exists** - Stripe customer ID is valid and not deleted
- ✅ **Email Consistency** - Stripe customer email matches Clerk email
- ✅ **Subscriptions Array** - Subscriptions field is a valid array
- ✅ **Timestamps Valid** - Created and updatedAt are valid numbers

## 🔄 Migration from Legacy System

### **Before Migration (Legacy)**

```typescript
// Used separate Redis client with different env vars
const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_READ_ONLY_TOKEN || '',
});
const kvUser = await redis.get<StripeCustomerData>(`user:${userId}`);
```

### **After Migration (Unified)**

```typescript
// Uses unified CustomerCache with automatic fallbacks
import { CustomerCache } from '@/lib/redis';

const kvUser = await CustomerCache.getCustomerByUserId(userId);
```

### **Migration Benefits**

- ✅ **Unified Cache Access** - Consistent with other cache operations
- ✅ **Automatic Fallbacks** - Redis ↔ in-memory cache fallback
- ✅ **Better Error Handling** - Graceful degradation when cache unavailable
- ✅ **Debug Information** - Enhanced observability with debug object
- ✅ **Type Safety** - Full TypeScript integration

## 🔍 Debug Information

### **Debug Object Fields**

- `hasCustomerData` - Whether cached data exists for the user
- `basicDataInSync` - Whether basic user data matches Clerk
- `stripeDataInSync` - Whether Stripe data is consistent
- `cacheSource` - Always "unified_customer_cache" (post-migration)

### **Troubleshooting with Debug Info**

```typescript
// No cached data found
{ "hasCustomerData": false, "basicDataInSync": false }
// → User needs cache rebuild or onboarding incomplete

// Cache exists but data mismatch
{ "hasCustomerData": true, "basicDataInSync": false }
// → Cache needs refresh from Clerk/Stripe

// Stripe inconsistency
{ "basicDataInSync": true, "stripeDataInSync": false }
// → Stripe customer data needs sync
```

## 🛠️ Usage Examples

### **Frontend Health Check**

```typescript
const checkUserSync = async () => {
  try {
    const response = await fetch('/api/user/check-kv-sync');
    const data = await response.json();

    if (!data.isInSync) {
      // Show user data refresh prompt
      console.warn('User data out of sync:', data.debug);
    }
  } catch (error) {
    console.error('Sync check failed:', error);
  }
};
```

### **Admin Monitoring**

```typescript
// Check multiple users' sync status
const checkUsersSync = async (userIds: string[]) => {
  for (const userId of userIds) {
    // Authenticate as user or use admin endpoint
    const result = await checkUserSyncStatus(userId);
    if (!result.isInSync) {
      console.warn(`User ${userId} out of sync`);
    }
  }
};
```

### **Support Tool**

```bash
# Quick check for support ticket
curl -H "Authorization: Bearer $USER_TOKEN" \
     https://yourapp.com/api/user/check-kv-sync
```

## ⚡ Performance Considerations

### **Cache Performance**

- **Fast Lookup** - Uses optimized CustomerCache.getCustomerByUserId()
- **Automatic Fallback** - Falls back to in-memory cache if Redis unavailable
- **Minimal API Calls** - Only calls Stripe if cached customer ID exists

### **Rate Limiting**

- **Stripe API Calls** - Only made when customer data exists in cache
- **Cache Reads** - Very fast, suitable for frequent health checks
- **No Database Queries** - Uses cache-only data for basic checks

## 📊 Monitoring & Alerts

### **Recommended Monitoring**

```typescript
// Monitor sync health across users
const syncHealthMetrics = {
  totalChecks: 0,
  syncedUsers: 0,
  unsyncedUsers: 0,
  cacheHits: 0,
  cacheMisses: 0,
};
```

### **Alert Conditions**

- 🚨 **High Unsync Rate** - > 5% of users out of sync
- 🚨 **Cache Miss Rate** - > 10% cache misses
- 🚨 **Stripe API Errors** - Stripe customer retrieval failures
- 🚨 **Authentication Errors** - Clerk auth failures

## 🔗 Related Endpoints

- `/api/user/rebuild-kv` - Rebuilds user cache data
- `/api/user/profile` - User profile management
- `/api/user/billing` - Billing and subscription data
- `/api/stripe/identity/status` - Stripe identity verification status

## 📋 Integration Checklist

- [ ] **Authentication** - Ensure Clerk session is valid
- [ ] **Cache Access** - CustomerCache is properly initialized
- [ ] **Stripe Integration** - Stripe client configured correctly
- [ ] **Error Handling** - Graceful handling of cache/API failures
- [ ] **Monitoring** - Track sync status and debug information
- [ ] **Documentation** - Team knows when and how to use endpoint

## 🎯 Best Practices

### **When to Call This Endpoint**

- ✅ **User Login** - Optional health check after login
- ✅ **Profile Updates** - Verify sync after profile changes
- ✅ **Payment Issues** - Debug billing/payment problems
- ✅ **Support Requests** - First step in user data debugging
- ✅ **Regular Monitoring** - Periodic health checks

### **What NOT to Use It For**

- ❌ **Real-time Data** - Use direct API calls for real-time needs
- ❌ **High-frequency Calls** - Avoid excessive polling
- ❌ **Data Modification** - This is read-only, use dedicated update endpoints
- ❌ **Public Data** - Requires authentication, user-specific only

This endpoint is **essential for maintaining data integrity** in your application and provides valuable insights into the health of your unified cache system! 🚀
