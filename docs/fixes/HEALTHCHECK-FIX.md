# Health Check 503 Error - Root Cause & Fix

## 🔍 The Problem

```
Better Stack Alert: HTTP 503 from /api/healthcheck?services=true
Service: Resend returned 401 Unauthorized
```

## ❌ What I Initially Thought (WRONG)

I initially thought Resend wasn't configured in production. **This was incorrect!**

## ✅ Actual Root Cause

The health check was calling the **wrong Resend API endpoint** using raw `fetch()`:

```typescript
// ❌ WRONG - This endpoint returns 401
const response = await fetch('https://api.resend.com/api-keys', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${ENV_CONFIG.RESEND_API_KEY}`,
  },
});
```

**Why it failed:**

- `/api-keys` endpoint is for **managing** API keys
- It requires different permissions or authentication method
- It's not designed for health checks
- Returns 401 even with valid API key

## ✅ The Fix

Use the **official Resend SDK** instead of raw API calls:

```typescript
// ✅ CORRECT - Use Resend SDK
const { Resend } = await import('resend');
const resend = new Resend(ENV_CONFIG.RESEND_API_KEY);

// domains.list() is a lightweight operation perfect for health checks
await resend.domains.list();
```

**Why this works:**

- ✅ Uses official SDK with proper authentication
- ✅ `domains.list()` is a lightweight read operation
- ✅ Properly validates API connectivity
- ✅ Returns clear error messages

## 📊 Before vs After

### Before (Raw Fetch)

```bash
$ curl https://eleva.care/api/healthcheck?services=true

HTTP 503 Service Unavailable
{
  "services": {
    "overall": "down",
    "summary": {
      "total": 10,
      "healthy": 9,
      "down": 1
    }
  }
}

# Resend detail:
{
  "service": "resend",
  "status": "down",
  "error": "HTTP 401: Unauthorized"
}
```

### After (Resend SDK)

```bash
$ curl https://eleva.care/api/healthcheck?services=true

HTTP 200 OK
{
  "services": {
    "overall": "healthy",
    "summary": {
      "total": 10,
      "healthy": 10,
      "down": 0
    }
  }
}

# Resend detail:
{
  "service": "resend",
  "status": "healthy",
  "responseTime": 245,
  "message": "Resend API connection successful (245ms)"
}
```

## 🚀 Deployment

```bash
# Commit the fix
git add lib/service-health.ts
git commit -m "fix: use Resend SDK for health check instead of raw API call"
git push

# Vercel will auto-deploy
# Better Stack should turn green in 1-2 minutes
```

## 🧪 Testing

```bash
# Test locally first
pnpm dev

# Check all services
curl http://localhost:3000/api/healthcheck?services=true | jq '.'

# Check Resend specifically
curl http://localhost:3000/api/health/resend | jq '.'

# Expected: status: "healthy"
```

## 📝 Lessons Learned

1. ✅ **Always use official SDKs** when available
   - They handle authentication properly
   - They use the right endpoints
   - They provide better error messages

2. ✅ **Test health checks in production** before going live
   - Use staging environment first
   - Verify each service individually
   - Check Better Stack alerts

3. ✅ **Don't assume missing configuration** without checking
   - Environment variables might be set
   - Issue could be API usage, not configuration

4. ✅ **Document API endpoints used** for health checks
   - Not all endpoints are suitable
   - Some require special permissions
   - Lightweight operations are best

## 🔧 Similar Pattern Applied

The same pattern could apply to other services. If you see 401/403 errors:

**Bad:**

```typescript
// Raw fetch to arbitrary endpoint
fetch('https://api.service.com/some-endpoint', {
  headers: { Authorization: `Bearer ${key}` },
});
```

**Good:**

```typescript
// Use official SDK
const sdk = new ServiceSDK(key);
await sdk.healthCheck(); // or similar lightweight operation
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] `/api/healthcheck?services=true` returns 200
- [ ] All 10 services show `"status": "healthy"`
- [ ] Better Stack monitor shows green
- [ ] No more 503 alerts
- [ ] Response time < 3000ms

## 📖 Related

- Implementation: `lib/service-health.ts`
- Main endpoint: `app/api/healthcheck/route.ts`
- Individual services: `app/api/health/[service]/route.ts`
- Documentation: `docs/03-infrastructure/monitoring/`
