# QStash Signature Validation Enhancement

## Overview

Enhanced the QStash security configuration to properly validate Upstash signatures using `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY`, following official Upstash QStash security best practices.

## ⚠️ **Security Issue Addressed**

### **Problem**:

- Previous implementation relied primarily on custom headers (`x-qstash-request`)
- Lacked proper cryptographic signature validation
- Vulnerable to header spoofing attacks

### **Solution**:

- **Primary**: Cryptographic signature validation using `Upstash-Signature` header
- **Fallback**: Multiple validation layers with graceful degradation
- **Production-ready**: Proper key rotation support with current/next signing keys

## 📝 **Changes Made**

### 1. **Updated QStash Configuration** (`config/qstash.ts`)

```typescript
// 🔒 Security configuration
security: {
  requiredHeaders: ['Upstash-Signature', 'x-qstash-request'],
  // Match user agent case-insensitively at the edge/middleware
  allowedUserAgents: ['upstash', 'qstash'],
  fallbackAuth: process.env.NODE_ENV === 'production' ? false : true,
},
```

**Key Changes:**

- ✅ Added `'Upstash-Signature'` to required headers
- ✅ Kept existing `'x-qstash-request'` for backward compatibility
- ✅ Added comment about case-insensitive user agent matching

### 2. **Created Signature Validation Utility** (`lib/qstash-signature-validator.ts`)

#### **Core Functions:**

| Function                     | Purpose                   | Usage                        |
| ---------------------------- | ------------------------- | ---------------------------- |
| `validateUpstashSignature()` | Core signature validation | Primary security check       |
| `validateQStashRequest()`    | Comprehensive validation  | All-in-one validation        |
| `createQStashAuthResponse()` | Response helper           | Standardized error responses |

#### **Signature Validation Process:**

```typescript
// 1. Extract signature from headers (multiple variations supported)
const providedSignature =
  request.headers.get('Upstash-Signature') ||
  request.headers.get('upstash-signature') ||
  request.headers.get('x-upstash-signature');

// 2. Handle null case early
if (!providedSignature) {
  return { isValid: false, error: 'No signature found' };
}

// 3. Create signature payload (URL + body)
const sigPayload = request.nextUrl.toString() + body;

// 4. Validate against current signing key
const expectedSignature = crypto
  .createHmac('sha256', QSTASH_CURRENT_SIGNING_KEY)
  .update(sigPayload, 'utf8')
  .digest('base64');

// 5. Convert signatures to buffers and check lengths first
const providedBuffer = Buffer.from(providedSignature, 'base64');
const expectedBuffer = Buffer.from(expectedSignature, 'base64');

// 6. Return false if buffer lengths differ (avoids timingSafeEqual exception)
if (providedBuffer.length !== expectedBuffer.length) {
  return { isValid: false, error: 'Invalid signature format' };
}

// 7. Secure comparison (timing attack resistant)
const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
```

## 🔧 **Implementation Guide**

### **Environment Variables Required:**

```bash
# Primary signing key (required)
QSTASH_CURRENT_SIGNING_KEY=your_current_signing_key_here

# Next signing key for rotation (recommended)
QSTASH_NEXT_SIGNING_KEY=your_next_signing_key_here

# Emergency fallback (optional, for development)
CRON_API_KEY=your_emergency_api_key_here
```

### **Usage in Cron Endpoints:**

#### **Option 1: Quick Validation** (Recommended)

```typescript
import { createQStashAuthResponse, validateQStashRequest } from '@/lib/qstash-signature-validator';

export async function POST(request: NextRequest) {
  // Get request body for signature validation
  const body = await request.text();

  // Validate request
  const validationResult = await validateQStashRequest(request, body);

  // Handle validation failure
  const authResponse = createQStashAuthResponse(validationResult);
  if (authResponse) return authResponse;

  // ✅ Request is validated - proceed with cron logic
  // ... your cron logic here
}
```

#### **Option 2: Granular Control**

```typescript
import { validateUpstashSignature } from '@/lib/qstash-signature-validator';

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Only validate signature (no fallbacks)
  const signatureResult = await validateUpstashSignature(request, body);

  if (!signatureResult.isValid) {
    console.error('Signature validation failed:', signatureResult.error);
    return new Response('Unauthorized', { status: 401 });
  }

  console.log(`✅ Validated with ${signatureResult.usedKey} signing key`);

  // ✅ Proceed with cron logic
  // ... your cron logic here
}
```

## 🛡️ **Security Layers**

The new validation implements **defense in depth** with multiple security layers:

### **1. Primary: Cryptographic Signature** (Strongest)

- ✅ **Method**: HMAC-SHA256 signature verification
- ✅ **Keys**: `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY`
- ✅ **Rotation**: Supports seamless key rotation
- ✅ **Security**: Timing attack resistant comparison

### **2. Fallback: Custom Header + User Agent**

- ✅ **Method**: `x-qstash-request` header + Upstash user agent
- ✅ **Use case**: Backward compatibility, development
- ✅ **Security**: Moderate (header + user agent validation)

### **3. Emergency: API Key**

- ✅ **Method**: `x-api-key` header validation
- ✅ **Use case**: Emergency access, debugging
- ✅ **Security**: Basic (shared secret)

### **4. Development: User Agent Only**

- ⚠️ **Method**: User agent string matching
- ⚠️ **Use case**: Development environment only
- ⚠️ **Security**: Weak (easily spoofed)

## 🎯 **Production Deployment**

### **Required Steps:**

1. **Set Environment Variables:**

   ```bash
   # In your production environment (.env.production, Vercel, etc.)
   QSTASH_CURRENT_SIGNING_KEY=your_production_signing_key
   QSTASH_NEXT_SIGNING_KEY=your_next_production_signing_key
   ```

2. **Update Cron Endpoints:**
   - Replace existing validation with new `validateQStashRequest()`
   - Test all cron endpoints with QStash webhooks
   - Monitor logs for validation success/failure

3. **Key Rotation Process:**

   ```bash
   # Step 1: Set next key
   QSTASH_NEXT_SIGNING_KEY=new_signing_key

   # Step 2: Deploy application (validates with both keys)

   # Step 3: Update QStash to use new key

   # Step 4: Move keys
   QSTASH_CURRENT_SIGNING_KEY=new_signing_key
   QSTASH_NEXT_SIGNING_KEY=newer_signing_key
   ```

## ✅ **Benefits**

### **Security Improvements:**

- 🔐 **Cryptographic validation** prevents header spoofing
- 🔄 **Key rotation support** for zero-downtime updates
- 🛡️ **Multiple validation layers** provide resilience
- ⏱️ **Timing attack resistance** in signature comparison

### **Operational Benefits:**

- 📊 **Detailed logging** for debugging and monitoring
- 🔧 **Easy integration** with existing cron endpoints
- 🚀 **Production-ready** with proper error handling
- 📖 **Comprehensive documentation** for maintenance

## 🧪 **Testing**

### **Validation Types to Test:**

1. **Valid QStash Request** (with proper signature)
2. **Invalid Signature** (should return 401)
3. **Missing Signature** (should fallback to headers)
4. **Key Rotation** (both current and next keys work)
5. **Emergency API Key** (fallback authentication)

### **Example Test:**

```typescript
// Valid request should pass
const validRequest = new Request('https://example.com/api/cron/test', {
  headers: {
    'Upstash-Signature': 'valid_signature_here',
    'user-agent': 'QStash/1.0',
  },
});

const result = await validateQStashRequest(validRequest, '');
expect(result.isValid).toBe(true);
expect(result.validationType).toBe('signature');
```

## 📋 **Migration Checklist**

- [ ] Update `config/qstash.ts` security configuration
- [ ] Create `lib/qstash-signature-validator.ts` utility
- [ ] Set production environment variables
- [ ] Update all cron endpoints to use new validation
- [ ] Test signature validation in staging environment
- [ ] Monitor production logs for validation issues
- [ ] Document key rotation process for team

## 🚨 **Important Notes**

- **Never commit signing keys** to version control
- **Use different keys** for different environments
- **Monitor validation logs** for security issues
- **Implement key rotation** regularly (quarterly recommended)
- **Keep fallback methods** for emergency access

This enhancement significantly improves the security posture of QStash integrations while maintaining backward compatibility and operational flexibility.
