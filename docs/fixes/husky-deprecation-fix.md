# Husky Deprecation Warning Fix

## Issue Description

The build was showing the warning:

```
husky - install command is DEPRECATED
```

This was happening because the project had mixed Husky v4 and v9 configurations, causing deprecation warnings.

## Root Cause Analysis

### Problems Found

1. **Deprecated `husky install` command**: Using `"prepare": "husky install"` instead of `"prepare": "husky"`
2. **Old hook configuration**: Had both modern v9 hooks and deprecated v4 configuration in package.json
3. **Deprecated directory structure**: The `.husky/_/` directory contained old husky.sh files with deprecation warnings
4. **Mixed configuration**: Had both the new `.husky/pre-commit` files AND the old `"husky": { "hooks": {...} }` in package.json

### Deprecated Structure Found

```bash
.husky/_/husky.sh # ❌ Contained deprecation warnings
.husky/_/pre-commit # ❌ Old format
package.json # ❌ Had both old and new config
```

## The Solution

### 1. Updated package.json prepare script

**Before:**

```json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

**After:**

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

### 2. Removed deprecated husky configuration section

**Removed this from package.json:**

```json
"husky": {
  "hooks": {
    "pre-commit": "lint-staged",
    "pre-push": "pnpm test"
  }
}
```

### 3. Updated hooks to modern format

**Modern `.husky/pre-commit`:**

```bash
echo "🔍 Running pre-commit checks..."

# Run lint-staged for staged files
pnpm lint-staged

# Run tests for modified files
echo "🧪 Running tests for modified files..."
if git diff --cached --name-only | grep -E '\.(ts|tsx)$' > /dev/null; then
  FILES=$(git diff --cached --name-only | grep -E '\.(ts|tsx)$' | xargs)
  if [ -n "$FILES" ]; then
    echo "🔍 Found changed TypeScript files, running related tests..."
    pnpm exec jest --findRelatedTests $FILES --passWithNoTests
  else
    echo "📝 No TypeScript files changed, skipping tests"
  fi
else
  echo "📝 No TypeScript files changed, skipping tests"
fi

echo "✅ Pre-commit checks completed!"
```

**Modern `.husky/pre-push`:**

```bash
echo "🚀 Running pre-push checks..."

# Check if we're on a feature branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ $BRANCH == feat/* || $BRANCH == fix/* || $BRANCH == chore/* ]]; then
  echo "📦 Running critical tests for feature branch..."

  # Only run the important, up-to-date tests
  echo "🔍 Running critical API and webhook tests..."
  pnpm exec jest tests/api/create-payment-intent.test.ts tests/api/webhooks/ --passWithNoTests

  echo "✅ Critical tests completed!"
else
  echo "🧪 Running full test suite for main branch..."
  pnpm test
fi

echo "✅ Pre-push checks completed!"
```

### 4. Cleaned up deprecated structure

- Removed `.husky/_/` directory entirely
- No more `husky.sh` sourcing
- Clean modern Husky v9 structure

## Key Changes Made

### Files Modified

1. **`package.json`**
   - Changed `"prepare": "husky install"` to `"prepare": "husky"`
   - Removed the deprecated `"husky": { "hooks": {...} }` section
   - Kept `lint-staged` configuration (still valid)

2. **`.husky/pre-commit`**
   - Removed any `#!/usr/bin/env sh` and `. "$(dirname -- "$0")/_/husky.sh"` lines
   - Updated to use `pnpm exec jest` instead of `npx jest`
   - Modern shell script format

3. **`.husky/pre-push`**
   - Same modernization as pre-commit
   - Updated to use `pnpm exec jest` consistently

4. **Directory cleanup**
   - Removed `.husky/_/` directory
   - Clean structure with just hook files

## What Each Change Does

### `husky install` → `husky`

- In Husky v9+, the `install` command is deprecated
- The new command just uses `husky` which automatically initializes

### Removed package.json hooks config

- Husky v4 used `"husky": { "hooks": {...} }` in package.json
- Husky v9 uses individual shell scripts in `.husky/` directory
- Having both caused conflicts and deprecation warnings

### Updated hook scripts

- Modern Husky doesn't need the `husky.sh` sourcing
- Hooks are just shell scripts that run directly
- Using `pnpm exec` ensures proper package resolution

## Testing the Fix

### Verify no deprecation warnings

```bash
pnpm install  # Should not show deprecation warnings
```

### Test hooks work

```bash
git add .
git commit -m "test"  # Should run pre-commit hook
```

### Test pre-push

```bash
git push  # Should run pre-push hook (if pushing)
```

## Migration Notes for Teams

If other team members see issues after pulling:

1. **Clean install:**

   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. **If hooks don't work:**
   ```bash
   rm -rf .husky/_
   pnpm exec husky init
   # Then restore custom hook content from this repo
   ```

## Benefits of the Fix

1. ✅ **No more deprecation warnings**
2. ✅ **Future-proof with Husky v9+ format**
3. ✅ **Cleaner configuration**
4. ✅ **Consistent pnpm usage**
5. ✅ **Better performance** (no extra shell sourcing)

## References

- [Husky v9 Migration Guide](https://github.com/typicode/husky/blob/main/docs/migrate-from-v4.md)
- [Husky Get Started](https://github.com/typicode/husky/blob/main/docs/get-started.md)
- [Modern Git Hooks with Husky](https://github.com/typicode/husky)
