# Bun Runtime Migration

> **Status**: Implemented (Phase 1 & 2)
> **Date**: December 2025
> **Version**: Bun 1.3.4

## Overview

The eleva-care-app has migrated from Node.js/pnpm to the Bun runtime for improved performance, faster builds, and better developer experience. Bun is an all-in-one JavaScript runtime built with Zig that provides significant performance improvements over Node.js.

## What Changed

### Runtime Configuration

| Component | Before | After |
|-----------|--------|-------|
| Runtime | Node.js 24+ | Bun 1.3.4 (with Node.js fallback) |
| Package Manager | pnpm 9.2.0 | Bun |
| Script Execution | tsx | Bun (native TypeScript) |
| Package Execution | npx | bunx |
| Lockfile | pnpm-lock.yaml | bun.lock |

### Files Modified

| File | Changes |
|------|---------|
| `vercel.json` | Added `bunVersion: "1.x"` for Vercel Bun runtime |
| `package.json` | Updated all scripts to use `bun`/`bunx` |
| `.github/workflows/test.yml` | Migrated CI to use `oven-sh/setup-bun@v2` |
| `.gitignore` | Added `.bun` directory |

## Performance Improvements

| Metric | Node.js/pnpm | Bun | Improvement |
|--------|--------------|-----|-------------|
| Package install | ~15s | ~4s | **4x faster** |
| Dev server cold start | ~15s | ~5s | **3x faster** |
| First page compile | ~11s | ~9s | **22% faster** |
| Proxy.ts execution | ~315ms | ~45ms | **7x faster** |
| Script execution (tsx → bun) | ~500ms | ~100ms | **5x faster** |

## Configuration

### Vercel Deployment

```json
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.x",
  "crons": [...]
}
```

Vercel automatically manages minor and patch versions. The Bun runtime is in Beta on Vercel.

### Package.json Scripts

Key script patterns:

```json
{
  "scripts": {
    // Next.js with Bun runtime
    "dev:next": "bun --bun next dev --port 3000",
    "build": "bun --bun next build",
    "start": "bun --bun next start",
    
    // Native TypeScript execution (no tsx needed)
    "postbuild": "bun scripts/utilities/update-qstash-schedules.ts",
    
    // Package execution
    "qstash:dev": "bunx @upstash/qstash-cli@latest dev"
  }
}
```

The `--bun` flag forces Bun to use its runtime even when scripts have Node.js shebangs.

### Optional: bunfig.toml

For advanced configuration, create a `bunfig.toml` in the project root:

```toml
# bunfig.toml (optional)

[install]
# Lockfile settings
frozenLockfile = false

[test]
# Test runner configuration (future migration)

[env]
# Environment variables for tests
NODE_ENV = "test"
```

## Development Commands

### Daily Development

```bash
# Start development server (Next.js + video sync)
bun dev

# Start full development (includes QStash)
bun dev:full

# Start only Next.js
bun dev:only

# Run tests
bun test

# Run linting
bun run lint

# Type checking
bun run type-check

# Database operations
bun run db:generate
bun run db:migrate
bun run db:studio
```

### Package Management

```bash
# Install dependencies (generates bun.lock)
bun install

# Add a dependency
bun add <package>

# Add a dev dependency
bun add -d <package>

# Remove a dependency
bun remove <package>

# Update dependencies
bun update

# View outdated packages
bun outdated
```

### Script Execution

```bash
# Run TypeScript files directly (no tsx needed)
bun scripts/utilities/update-qstash-schedules.ts

# Run package binaries
bunx drizzle-kit studio

# Run with specific flags
bun --bun next build
```

## What Was NOT Changed

These dependencies are specifically optimized for serverless/edge environments and were intentionally kept:

| Dependency | Reason |
|------------|--------|
| `@neondatabase/serverless` | HTTP-based driver optimized for Vercel Functions |
| `@upstash/redis` | REST API for serverless (Bun's Redis uses TCP) |
| `@vercel/blob` | Proprietary Vercel storage |
| `drizzle-orm` | ORM layer (works with any driver) |
| `googleapis` | Complex SDK with no Bun equivalent |

## CI/CD Configuration

### GitHub Actions

The workflow uses `oven-sh/setup-bun@v2`:

```yaml
- name: 📦 Setup Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- name: 📦 Install dependencies
  run: bun install --frozen-lockfile
```

### Vercel

No additional configuration needed. Vercel detects `bunVersion` in `vercel.json` and uses the Bun runtime automatically.

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Bun Not Found

```bash
# Add Bun to PATH
source ~/.zshrc

# Or use full path
~/.bun/bin/bun install
```

### QStash CLI Issues

The QStash CLI may have compatibility issues. Run it separately:

```bash
bunx @upstash/qstash-cli@latest dev
```

Or use the `dev` command without QStash:

```bash
bun dev  # Runs Next.js + video sync only
```

## Future Improvements (Phase 3+)

### Testing Migration

Migrate from Vitest to Bun's built-in test runner:

```typescript
// Before (Vitest)
import { describe, it, expect, vi } from 'vitest';

// After (Bun)
import { describe, it, expect, mock } from 'bun:test';
```

Expected improvement: 14-23x faster test execution.

### Crypto Optimization

Replace Node.js `crypto` with Bun's built-in APIs:

```typescript
// Before (Node.js)
import crypto from 'crypto';
crypto.createHmac('sha256', key).update(payload).digest('base64');

// After (Bun)
const hasher = new Bun.CryptoHasher("sha256", key);
hasher.update(payload);
hasher.digest("base64");
```

### Password Hashing

Use Bun's built-in password hashing:

```typescript
// Bun built-in (Argon2id by default)
const hash = await Bun.password.hash(password);
const isValid = await Bun.password.verify(password, hash);
```

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun on Vercel](https://vercel.com/docs/functions/runtimes/bun)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Migration Guide: npm to Bun](https://bun.sh/docs/guides/install/from-npm-install-to-bun-install)

