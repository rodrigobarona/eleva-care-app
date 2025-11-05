#!/usr/bin/env node

/**
 * WorkOS Migration Script
 *
 * Automatically migrates Clerk imports to WorkOS AuthKit
 * Run with: node migrate-to-workos.js
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

let filesModified = 0;
let filesSkipped = 0;

// Patterns to replace
const replacements = [
  // Import replacements
  {
    from: /import\s+{\s*auth\s*}\s+from\s+['"]@clerk\/nextjs\/server['"]/g,
    to: "import { withAuth } from '@workos-inc/authkit-nextjs'",
  },
  {
    from: /import\s+{\s*auth,\s*currentUser\s*}\s+from\s+['"]@clerk\/nextjs\/server['"]/g,
    to: "import { withAuth } from '@workos-inc/authkit-nextjs'",
  },
  {
    from: /import\s+{\s*currentUser,\s*auth\s*}\s+from\s+['"]@clerk\/nextjs\/server['"]/g,
    to: "import { withAuth } from '@workos-inc/authkit-nextjs'",
  },
  {
    from: /import\s+{\s*currentUser\s*}\s+from\s+['"]@clerk\/nextjs\/server['"]/g,
    to: "import { withAuth } from '@workos-inc/authkit-nextjs'",
  },
  {
    from: /import\s+{\s*useUser\s*}\s+from\s+['"]@clerk\/nextjs['"]/g,
    to: "import { useAuth } from '@workos-inc/authkit-nextjs/components'",
  },
  // API route patterns - simple auth() calls
  {
    from: /const\s+{\s*userId\s*}\s+=\s+await\s+auth\(\);/g,
    to: 'const { user } = await withAuth();\n  const userId = user?.id;',
  },
  // Check for userId patterns
  {
    from: /if\s+\(\s*!userId\s*\)/g,
    to: 'if (!user)',
  },
  // Client component patterns
  {
    from: /const\s+{\s*user,\s*isLoaded\s*}\s+=\s+useUser\(\);/g,
    to: 'const { user, loading } = useAuth();\n  const isLoaded = !loading;',
  },
  {
    from: /const\s+{\s*user\s*}\s+=\s+useUser\(\);/g,
    to: 'const { user } = useAuth();',
  },
  {
    from: /const\s+{\s*isLoaded,\s*user\s*}\s+=\s+useUser\(\);/g,
    to: 'const { user, loading } = useAuth();\n  const isLoaded = !loading;',
  },
  // currentUser() patterns
  {
    from: /const\s+user\s+=\s+await\s+currentUser\(\);/g,
    to: 'const { user } = await withAuth();',
  },
];

/**
 * Check if file should be skipped
 */
function shouldSkipFile(filePath) {
  const skipPatterns = [
    '/node_modules/',
    '/dist/',
    '/.next/',
    '/tests/',
    '/docs/',
    'package.json',
    'pnpm-lock.yaml',
    '.md',
    '.backup',
    'migrate-to-workos.js',
    'migrate-clerk-to-workos.sh',
  ];

  return skipPatterns.some((pattern) => filePath.includes(pattern) || filePath.endsWith(pattern));
}

/**
 * Recursively find all TypeScript/TSX files
 */
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldSkipFile(filePath)) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Migrate a single file
 */
function migrateFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Check if file has Clerk imports
    if (!content.includes('@clerk')) {
      return false;
    }

    console.log(`${colors.yellow}Migrating:${colors.reset} ${filePath}`);

    // Create backup
    fs.writeFileSync(`${filePath}.backup`, content);

    // Apply all replacements
    let modified = false;
    for (const { from, to } of replacements) {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified++;
      return true;
    }

    // Remove backup if nothing changed
    fs.unlinkSync(`${filePath}.backup`);
    return false;
  } catch (error) {
    console.error(`${colors.red}Error processing ${filePath}:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Main migration function
 */
function migrate() {
  console.log(`${colors.cyan}🚀 Starting Clerk to WorkOS migration...${colors.reset}\n`);

  // Directories to scan
  const directories = ['app', 'components', 'lib', 'server', 'hooks'];

  let allFiles = [];
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      const files = findFiles(dir);
      allFiles = allFiles.concat(files);
    }
  }

  console.log(`${colors.cyan}📝 Found ${allFiles.length} files to scan${colors.reset}\n`);

  // Process each file
  for (const file of allFiles) {
    if (migrateFile(file)) {
      // File was modified
    } else {
      filesSkipped++;
    }
  }

  console.log(`\n${colors.green}✅ Migration complete!${colors.reset}`);
  console.log(`${colors.green}📊 Files modified: ${filesModified}${colors.reset}`);
  console.log(`${colors.cyan}📊 Files skipped: ${filesSkipped}${colors.reset}\n`);

  console.log(`${colors.yellow}⚠️  Next steps:${colors.reset}`);
  console.log('  1. Review changes: git diff');
  console.log('  2. Check for linter errors: pnpm lint');
  console.log('  3. Test the application: pnpm dev');
  console.log('  4. Remove backups: find . -name "*.backup" -delete');
  console.log('  5. Remove Clerk: pnpm remove @clerk/nextjs @clerk/localizations\n');
}

// Run migration
try {
  migrate();
} catch (error) {
  console.error(`${colors.red}Migration failed:${colors.reset}`, error);
  process.exit(1);
}
