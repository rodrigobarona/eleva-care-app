# MDX Server Path Traversal Protection Implementation

## Overview

Added comprehensive path traversal protection to `lib/mdx/server-mdx.tsx` to prevent directory traversal attacks through namespace and locale parameters.

## Security Measures Implemented

### 1. Input Validation (`validateSafeString`)

- **Whitelist regex**: Only allows `[a-zA-Z0-9_-]`
- **Explicit rejection** of:
  - `../` patterns
  - `./` patterns
  - Forward slashes `/`
  - Backslashes `\`
  - Empty strings
  - Special characters
  - Unicode characters

### 2. Path Normalization (`validateSecurePath`)

- Uses `path.normalize()` to resolve any `..` or `.` segments
- Verifies normalized path starts with base directory
- Throws clear error if traversal is detected

### 3. Protected Functions

All file operations now include validation:

- `getMDXFileContent`: Validates namespace, locale, and fallbackLocale
- `mdxFileExists`: Validates namespace and locale
- `getAvailableLocalesForNamespace`: Validates namespace

## Implementation Details

### Validation Flow

```typescript
1. validateSafeString(namespace, 'namespace')
   ├─ Check not empty
   ├─ Check matches SAFE_PATH_REGEX
   └─ Check no traversal patterns

2. Construct path
   const filePath = path.join(baseDir, namespace, `${locale}.mdx`)

3. validateSecurePath(filePath, baseDir) [IMPROVED]
   ├─ Resolve both paths to absolute form
   ├─ Compute relative path from base to target
   ├─ Check if relative path escapes (starts with '..')
   └─ Return resolved absolute path
```

### Recent Improvements

**Path Validation Enhancement** (resolve+relative approach):

- Changed from simple `startsWith` check to more robust `path.relative()` method
- Resolves both paths to absolute form before comparison
- Detects escapes even with complex path manipulations
- Cross-platform compatible (Windows and Unix)

**Fallback Locale Normalization**:

- Fallback locale now uses `getFileLocale()` for consistent file naming
- Primary and fallback lookups use same normalization logic
- Prevents mismatches between locale formats (e.g., `en-US` vs `en`)

**Remark Plugin Deduplication**:

- Automatically detects if `remarkGfm` is already in plugin list
- Prevents duplicate plugin application
- Supports both `plugin` and `[plugin, options]` formats

### Error Handling

- **Validation failures**: Return `exists:false` or empty array (graceful degradation)
- **Security violations**: Log to console with clear error messages
- **No filesystem access**: When validation fails, filesystem operations are skipped

## Test Coverage

Created comprehensive test suite in `tests/lib/server-mdx.test.ts`:

- ✅ **36/36 tests passing (100%)**
- ✅ All security tests passing (100%)
- ✅ Path traversal attempts properly rejected
- ✅ Invalid inputs properly rejected (with FS non-invocation assertions)
- ✅ Edge cases handled (unicode, URL encoding, null bytes)
- ✅ Fallback behavior validated (including locale normalization)
- ✅ Cache and file operations tested
- ✅ Type-safe mocks using `jest.SpyInstance`

### Test Results

**Path Traversal Protection** (all passing):

- Rejects `../../../etc/passwd`
- Rejects `./secret`
- Rejects `terms/../../etc`
- Rejects `terms\\..\secret`
- Rejects namespace with forward slashes
- Rejects namespace with backslashes
- Rejects locale with traversal patterns

**Invalid Input Protection** (all passing):

- Rejects empty strings
- Rejects special characters (`@`, `$`, etc.)
- Rejects unicode characters
- Rejects URL-encoded traversal attempts
- Rejects null byte injection

**Valid Inputs** (tested):

- Accepts alphanumeric characters
- Accepts hyphens: `expert-agreement`
- Accepts underscores: `payment_policies`
- Accepts locale variants: `en-US`

## Security Benefits

1. **Prevents directory traversal**: Cannot access files outside `content/` directory
2. **Validates all user inputs**: Strict whitelist prevents injection attacks
3. **Defense in depth**: Multiple validation layers (regex, normalization, path check)
4. **Clear logging**: Security violations are logged for monitoring
5. **Graceful failure**: Invalid requests fail safely without exposing system details

## Performance Improvements

### Smart Caching with Development Support

Added TTL-based caching for filesystem operations:

1. **Namespace Cache** (`getAllMDXNamespaces`)
   - Development: 5-second TTL for hot-reload support
   - Production: Permanent cache by default (configurable via `MDX_CACHE_TTL` env var)
   - Simplified from Map to simple variables

2. **Locale Cache** (`getAvailableLocalesForNamespace`)
   - Development: 5-second TTL for hot-reload support
   - Production: Permanent cache by default (configurable via `MDX_CACHE_TTL` env var)
   - Per-namespace caching with Map structure
   - Results sorted alphabetically for deterministic output (useful for tests and SSG)

**Production Runtime Updates**: Set `MDX_CACHE_TTL` environment variable (in milliseconds) to enable cache expiration in production for dynamic content scenarios.

### Type Safety Improvements

- Replaced `any[]` types with `import('unified').PluggableList` for plugin parameters
- Better IDE autocomplete and type checking for MDX plugins
- Added `unified` as dev dependency for proper types

## Files Modified

1. `lib/mdx/server-mdx.tsx` - Security validation, caching, and type improvements
2. `tests/lib/server-mdx.test.ts` - Comprehensive test suite
3. `tests/__mocks__/fs-promises.ts` - Mock for filesystem operations
4. `tests/__mocks__/next-mdx-remote-rsc.ts` - Mock for MDX rendering
5. `tests/__mocks__/remark-gfm.ts` - Mock for remark plugin
6. `jest.config.ts` - Added module mappings for new mocks
7. `package.json` - Added `unified` as dev dependency

## Usage Example

```typescript
// Safe usage
const result = await getMDXFileContent({
  namespace: 'terms',
  locale: 'en',
});

// Attempted attack - safely rejected
const malicious = await getMDXFileContent({
  namespace: '../../../etc/passwd',
  locale: 'en',
});
// Returns: { content: '', exists: false, usedFallback: false, locale: 'en' }
```

## Recommendations

1. **Monitor logs**: Watch for validation failures (potential attacks)
2. **Rate limiting**: Consider adding rate limits to MDX endpoints
3. **Content Security Policy**: Ensure CSP headers are set for rendered MDX
4. **Regular audits**: Periodically review file access patterns

## References

- OWASP Path Traversal: https://owasp.org/www-community/attacks/Path_Traversal
- CWE-22: Improper Limitation of a Pathname
- Node.js path.normalize: https://nodejs.org/api/path.html#pathnormalizepath
