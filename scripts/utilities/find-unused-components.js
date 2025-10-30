#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '../../');
const componentsDir = path.join(rootDir, 'components');

// Directories to search for component usage
const searchDirs = ['app', 'components', 'lib', 'emails'];

// Get all component files
function getAllComponentFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllComponentFiles(filePath, fileList);
    } else if (
      (file.endsWith('.tsx') || file.endsWith('.ts')) &&
      !file.includes('index.ts') &&
      !file.includes('.DS_Store')
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Check if a component is used anywhere
function isComponentUsed(componentPath, componentName) {
  // Get the relative path from components directory
  const relativePath = path.relative(componentsDir, componentPath);
  const dir = path.dirname(relativePath);
  const baseName = path.basename(componentName, path.extname(componentName));

  // Build search patterns
  const patterns = [
    `from '@/components/${dir}/${baseName}'`,
    `from '@/components/${dir}'`, // Barrel import
    `from "@/components/${dir}/${baseName}"`,
    `from "@/components/${dir}"`, // Barrel import
    `import('@/components/${dir}/${baseName}')`, // Dynamic import
    `'@/components/${dir}/${baseName}'`,
    `"@/components/${dir}/${baseName}"`,
  ];

  // Search in all directories
  for (const searchDir of searchDirs) {
    const searchPath = path.join(rootDir, searchDir);
    if (!fs.existsSync(searchPath)) continue;

    for (const pattern of patterns) {
      try {
        const result = execSync(
          `grep -r "${pattern}" "${searchPath}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`,
          { encoding: 'utf-8' },
        );

        // Exclude the file itself
        const matches = result
          .split('\n')
          .filter((line) => line.trim())
          .filter((line) => !line.includes(componentPath));

        if (matches.length > 0) {
          return { used: true, matches: matches.length };
        }
      } catch (error) {
        // Continue searching
      }
    }
  }

  return { used: false, matches: 0 };
}

console.log('🔍 Analyzing component usage...\n');

const allComponents = getAllComponentFiles(componentsDir);
const results = {
  used: [],
  unused: [],
  emailComponents: [],
  authComponents: [],
  analyticsComponents: [],
  notificationComponents: [],
};

allComponents.forEach((componentPath) => {
  const relativePath = path.relative(componentsDir, componentPath);
  const componentName = path.basename(componentPath);

  // Special handling for specific directories
  if (relativePath.includes('emails/')) {
    results.emailComponents.push({ path: relativePath, name: componentName });
    return;
  }

  if (relativePath.includes('auth/')) {
    results.authComponents.push({ path: relativePath, name: componentName });
    return;
  }

  if (relativePath.includes('analytics/')) {
    results.analyticsComponents.push({ path: relativePath, name: componentName });
    return;
  }

  if (relativePath.includes('notifications/secure-novu-inbox')) {
    results.notificationComponents.push({ path: relativePath, name: componentName });
    return;
  }

  const usage = isComponentUsed(componentPath, componentName);

  if (usage.used) {
    results.used.push({
      path: relativePath,
      name: componentName,
      references: usage.matches,
    });
  } else {
    results.unused.push({
      path: relativePath,
      name: componentName,
    });
  }
});

// Display results
console.log('📊 Component Usage Report\n');
console.log('='.repeat(60));

console.log(`\n✅ Used Components: ${results.used.length}`);
results.used
  .sort((a, b) => a.path.localeCompare(b.path))
  .forEach((comp) => {
    console.log(`  ✓ ${comp.path} (${comp.references} refs)`);
  });

console.log(`\n❌ Unused Components: ${results.unused.length}`);
if (results.unused.length > 0) {
  results.unused
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach((comp) => {
      console.log(`  ✗ ${comp.path}`);
    });
}

console.log(`\n📧 Email Components (React Email): ${results.emailComponents.length}`);
results.emailComponents.forEach((comp) => {
  console.log(`  📧 ${comp.path}`);
});

console.log(`\n🔐 Auth Components: ${results.authComponents.length}`);
results.authComponents.forEach((comp) => {
  console.log(`  🔐 ${comp.path}`);
});

console.log(`\n📈 Analytics Components: ${results.analyticsComponents.length}`);
results.analyticsComponents.forEach((comp) => {
  console.log(`  📈 ${comp.path}`);
});

console.log(`\n🔔 Notification Components: ${results.notificationComponents.length}`);
results.notificationComponents.forEach((comp) => {
  console.log(`  🔔 ${comp.path}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n💡 Recommendations:');
if (results.unused.length > 0) {
  console.log(`  • Move ${results.unused.length} unused component(s) to components/_archive/`);
}
console.log(`  • Email components are used by React Email (keep them)`);
console.log(`  • Auth components may be used by middleware (verify before archiving)`);
console.log(`  • Analytics/Notification components may be used at runtime (verify)`);

// Write results to JSON file
const outputPath = path.join(rootDir, 'docs/04-development/unused-components.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\n📄 Full report saved to: docs/04-development/unused-components.json`);
