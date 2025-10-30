#!/usr/bin/env node

/**
 * Script to automatically fix barrel export statements based on actual component exports
 */

const fs = require('fs');
const path = require('path');

function getExportType(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Check for default export
    for (const line of lines) {
      if (line.trim().startsWith('export default')) {
        return 'default';
      }
    }

    // Check for named function export
    const funcMatch = content.match(/^export\s+(async\s+)?function\s+(\w+)/m);
    if (funcMatch) {
      return { type: 'named', name: funcMatch[2] };
    }

    // Check for named const/let export
    const constMatch = content.match(/^export\s+(const|let)\s+(\w+)/m);
    if (constMatch) {
      return { type: 'named', name: constMatch[2] };
    }

    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Fix shared/index.ts
const sharedComponents = {
  'navigation/NavLink': 'NavLink',
  'navigation/NavLinkContent': 'NavLinkContent',
  'navigation/SmoothLink': 'SmoothLink',
  'i18n/LocaleSwitcher': 'LanguageSwitcher',
  'i18n/LocaleSwitcherSelect': 'LocaleSwitcherSelect',
  'loading/LoadingSpinner': 'LoadingSpinner',
  'loading/HomePageSkeletons': 'HomePageSkeletons',
  'media/VideoPlayer': 'VideoPlayer',
  'text/TextBlock': 'TextBlock',
  'text/HeadlineSection': 'HeadlineSection',
  'animation/FadeInSection': 'FadeInSection',
  'data-table/DataTable': 'DataTable',
  'rich-text/RichTextEditor': 'RichTextEditor',
  'blocked-dates/BlockedDates': 'BlockedDates',
};

function fixSharedExports() {
  const componentsDir = path.join(process.cwd(), 'components/shared');
  let content = '// Shared Components Barrel Export\n\n';

  // Navigation
  content += '// Navigation\n';
  for (const [subpath, exportName] of Object.entries(sharedComponents)) {
    if (subpath.startsWith('navigation/')) {
      const filePath = path.join(componentsDir, `${subpath}.tsx`);
      const exportType = getExportType(filePath);

      if (exportType === 'default') {
        content += `export { default as ${exportName} } from './${subpath}';\n`;
      } else if (exportType && exportType.type === 'named') {
        content += `export { ${exportType.name} as ${exportName} } from './${subpath}';\n`;
      }
    }
  }

  //  i18n
  content += '\n// i18n\n';
  for (const [subpath, exportName] of Object.entries(sharedComponents)) {
    if (subpath.startsWith('i18n/')) {
      const filePath = path.join(componentsDir, `${subpath}.tsx`);
      const exportType = getExportType(filePath);

      if (exportType === 'default') {
        content += `export { default as ${exportName} } from './${subpath}';\n`;
      } else if (exportType && exportType.type === 'named') {
        content += `export { ${exportType.name} as ${exportName} } from './${subpath}';\n`;
      }
    }
  }

  // Loading
  content += '\n// Loading\n';
  for (const [subpath, exportName] of Object.entries(sharedComponents)) {
    if (subpath.startsWith('loading/')) {
      const filePath = path.join(componentsDir, `${subpath}.tsx`);
      const exportType = getExportType(filePath);

      if (exportType === 'default') {
        content += `export { default as ${exportName} } from './${subpath}';\n`;
      } else if (exportType && exportType.type === 'named') {
        content += `export { ${exportType.name} as ${exportName} } from './${subpath}';\n`;
      }
    }
  }

  // Media, Text, Animation
  content += '\n// Media\n';
  content += `export { VideoPlayer } from './media/VideoPlayer';\n`;
  content += '\n// Text\n';
  content += `export { TextBlock } from './text/TextBlock';\n`;
  content += `export { default as HeadlineSection } from './text/HeadlineSection';\n`;
  content += '\n// Animation\n';
  content += `export { default as FadeInSection } from './animation/FadeInSection';\n`;

  // Data Table
  content += '\n// Data Table\n';
  content += `export { default as DataTable } from './data-table/DataTable';\n`;

  // Rich Text
  content += '\n// Rich Text\n';
  content += `export { default as RichTextEditor } from './rich-text/RichTextEditor';\n`;

  // Blocked Dates
  content += '\n// Blocked Dates\n';
  content += `export { default as BlockedDates } from './blocked-dates/BlockedDates';\n`;

  // Utilities
  content += '\n// Utilities\n';
  content += `export { RequireRole, AuthorizationProvider } from './AuthorizationProvider';\n`;
  content += `export { default as ErrorBoundaryWrapper } from './ErrorBoundaryWrapper';\n`;
  content += `export { default as ErrorFallback } from './ErrorFallback';\n`;
  content += `export { default as PlatformDisclaimer } from './PlatformDisclaimer';\n`;
  content += `export { ServerStatus } from './ServerStatus';\n`;
  content += `export { CookiePreferencesButton } from './CookiePreferencesButton';\n`;
  content += `export { default as Shell } from './shell';\n`;

  fs.writeFileSync(path.join(componentsDir, 'index.ts'), content);
  console.log('✅ Fixed components/shared/index.ts');
}

fixSharedExports();
