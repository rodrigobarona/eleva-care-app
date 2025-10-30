#!/usr/bin/env node

/**
 * Component Import Migration Script
 *
 * This script migrates imports from the old atomic design structure
 * (atoms/, molecules/, organisms/) to the new feature-based structure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import mappings from old to new structure
const importMappings = {
  // UI Components (atoms -> ui)
  '@/components/atoms/button': '@/components/ui/button',
  '@/components/atoms/card': '@/components/ui/card',
  '@/components/atoms/input': '@/components/ui/input',
  '@/components/atoms/label': '@/components/ui/label',
  '@/components/atoms/checkbox': '@/components/ui/checkbox',
  '@/components/atoms/avatar': '@/components/ui/avatar',
  '@/components/atoms/badge': '@/components/ui/badge',
  '@/components/atoms/skeleton': '@/components/ui/skeleton',
  '@/components/atoms/progress': '@/components/ui/progress',
  '@/components/atoms/separator': '@/components/ui/separator',
  '@/components/atoms/switch': '@/components/ui/switch',
  '@/components/atoms/textarea': '@/components/ui/textarea',
  '@/components/atoms/toggle': '@/components/ui/toggle',
  '@/components/atoms/alert': '@/components/ui/alert',
  '@/components/atoms/popover': '@/components/ui/popover',
  '@/components/atoms/scroll-area': '@/components/ui/scroll-area',
  '@/components/atoms/toast': '@/components/ui/toast',
  '@/components/atoms/tooltip': '@/components/ui/tooltip',
  '@/components/atoms/alert-dialog': '@/components/ui/alert-dialog',
  '@/components/atoms/tabs': '@/components/ui/tabs',
  '@/components/atoms/select': '@/components/ui/select',

  // UI Components (molecules -> ui)
  '@/components/molecules/alert-dialog': '@/components/ui/alert-dialog',
  '@/components/molecules/accordion': '@/components/ui/accordion',
  '@/components/molecules/breadcrumb': '@/components/ui/breadcrumb',
  '@/components/molecules/calendar': '@/components/ui/calendar',
  '@/components/molecules/carousel': '@/components/ui/carousel',
  '@/components/molecules/dialog': '@/components/ui/dialog',
  '@/components/molecules/dropdown-menu': '@/components/ui/dropdown-menu',
  '@/components/molecules/form': '@/components/ui/form',
  '@/components/molecules/sheet': '@/components/ui/sheet',
  '@/components/molecules/sonner': '@/components/ui/sonner',
  '@/components/molecules/table': '@/components/ui/table',
  '@/components/molecules/tabs': '@/components/ui/tabs',
  '@/components/molecules/select': '@/components/ui/select',
  '@/components/molecules/timezone-select': '@/components/ui/timezone-select',

  // Feature: Appointments
  '@/components/organisms/AppointmentCard': '@/components/features/appointments/AppointmentCard',
  '@/components/organisms/RecordDialog': '@/components/features/appointments/RecordDialog',
  '@/components/molecules/RecordEditor': '@/components/features/appointments/RecordEditor',

  // Feature: Booking
  '@/components/organisms/BookingLayout': '@/components/features/booking/BookingLayout',
  '@/components/organisms/EventsList': '@/components/features/booking/EventsList',
  '@/components/molecules/EventBookingList': '@/components/features/booking/EventBookingList',
  '@/components/molecules/CopyEventButton': '@/components/features/booking/CopyEventButton',
  '@/components/molecules/NextAvailableTimeClient':
    '@/components/features/booking/NextAvailableTimeClient',
  '@/components/molecules/BookingLoadingSkeleton':
    '@/components/features/booking/BookingLoadingSkeleton',

  // Feature: Expert Setup
  '@/components/organisms/ExpertSetupBanner':
    '@/components/features/expert-setup/ExpertSetupBanner',
  '@/components/organisms/ExpertSetupBannerWrapper':
    '@/components/features/expert-setup/ExpertSetupBannerWrapper',
  '@/components/organisms/ExpertSetupChecklist':
    '@/components/features/expert-setup/ExpertSetupChecklist',
  '@/components/organisms/ExpertSetupChecklistWrapper':
    '@/components/features/expert-setup/ExpertSetupChecklistWrapper',
  '@/components/organisms/SetupCompletePublishCard':
    '@/components/features/expert-setup/SetupCompletePublishCard',

  // Feature: Forms
  '@/components/organisms/forms/AccountForm': '@/components/features/forms/AccountForm',
  '@/components/organisms/forms/EventForm': '@/components/features/forms/EventForm',
  '@/components/organisms/forms/EventFormWrapper': '@/components/features/forms/EventFormWrapper',
  '@/components/organisms/forms/ExpertForm': '@/components/features/forms/ExpertForm',
  '@/components/organisms/forms/MeetingForm': '@/components/features/forms/MeetingForm',
  '@/components/organisms/forms/PaymentStep': '@/components/features/forms/PaymentStep',
  '@/components/organisms/forms/ScheduleForm': '@/components/features/forms/ScheduleForm',
  '@/components/organisms/forms/SchedulingSettingsForm':
    '@/components/features/forms/SchedulingSettingsForm',

  // Feature: Profile
  '@/components/organisms/ProfilePublishToggle':
    '@/components/features/profile/ProfilePublishToggle',
  '@/components/molecules/ProfilePageLoadingSkeleton':
    '@/components/features/profile/ProfilePageLoadingSkeleton',
  '@/components/organisms/SecurityPreferencesForm':
    '@/components/features/profile/SecurityPreferencesForm',

  // Feature: Categories
  '@/components/organisms/category-list': '@/components/features/categories/CategoryList',

  // Feature: Admin
  '@/components/organisms/admin/UserRoleManager': '@/components/features/admin/UserRoleManager',

  // Layout: Header
  '@/components/organisms/Header': '@/components/layout/header/Header',
  '@/components/organisms/HeaderContent': '@/components/layout/header/HeaderContent',

  // Layout: Footer
  '@/components/organisms/Footer': '@/components/layout/footer/Footer',
  '@/components/organisms/FooterContentWrapper': '@/components/layout/footer/FooterContentWrapper',

  // Layout: Sidebar
  '@/components/organisms/sidebar/AppSidebar': '@/components/layout/sidebar/AppSidebar',
  '@/components/organisms/sidebar/AppBreadcrumb': '@/components/layout/sidebar/AppBreadcrumb',
  '@/components/organisms/sidebar/AppBreadcrumbContent':
    '@/components/layout/sidebar/AppBreadcrumbContent',
  '@/components/organisms/sidebar/NavMain': '@/components/layout/sidebar/NavMain',
  '@/components/organisms/sidebar/NavMainContent': '@/components/layout/sidebar/NavMainContent',
  '@/components/organisms/sidebar/NavUser': '@/components/layout/sidebar/NavUser',
  '@/components/organisms/sidebar/NavSecondary': '@/components/layout/sidebar/NavSecondary',
  '@/components/organisms/sidebar/sidebar': '@/components/layout/sidebar/sidebar',
  '@/components/organisms/layout/UserNavNotifications': '@/components/layout/UserNavNotifications',

  // Sections: Home
  '@/components/organisms/home/Hero': '@/components/sections/home/Hero',
  '@/components/organisms/home/HeroSection': '@/components/sections/home/HeroSection',
  '@/components/organisms/home/MissionSection': '@/components/sections/home/MissionSection',
  '@/components/organisms/home/ApproachSection': '@/components/sections/home/ApproachSection',
  '@/components/organisms/home/ExpertsSection': '@/components/sections/home/ExpertsSection',
  '@/components/organisms/home/Services': '@/components/sections/home/Services',
  '@/components/organisms/home/TeamSection': '@/components/sections/home/TeamSection',
  '@/components/organisms/home/NewsletterSection': '@/components/sections/home/NewsletterSection',
  '@/components/organisms/home/PodcastSection': '@/components/sections/home/PodcastSection',
  '@/components/organisms/home/SocialSection': '@/components/sections/home/SocialSection',

  // Sections: About
  '@/components/organisms/about/AdvisorsSection': '@/components/sections/about/AdvisorsSection',
  '@/components/organisms/about/BeliefsSection': '@/components/sections/about/BeliefsSection',
  '@/components/organisms/about/ClinicalExpertsSection':
    '@/components/sections/about/ClinicalExpertsSection',
  '@/components/organisms/about/JoinNetworkSection':
    '@/components/sections/about/JoinNetworkSection',
  '@/components/organisms/about/MissionSection': '@/components/sections/about/MissionSection',
  '@/components/organisms/about/TeamSection': '@/components/sections/about/TeamSection',

  // Shared: Navigation
  '@/components/atoms/NavLink': '@/components/shared/navigation/NavLink',
  '@/components/atoms/NavLinkContent': '@/components/shared/navigation/NavLinkContent',
  '@/components/atoms/SmoothLink': '@/components/shared/navigation/SmoothLink',

  // Shared: i18n
  '@/components/molecules/LocaleSwitcher': '@/components/shared/i18n/LocaleSwitcher',
  '@/components/molecules/LocaleSwitcherSelect': '@/components/shared/i18n/LocaleSwitcherSelect',

  // Shared: Loading
  '@/components/atoms/LoadingSpinner': '@/components/shared/loading/LoadingSpinner',
  '@/components/molecules/HomePageSkeletons': '@/components/shared/loading/HomePageSkeletons',

  // Shared: Media
  '@/components/molecules/videoPlayer': '@/components/shared/media/VideoPlayer',

  // Shared: Text
  '@/components/atoms/TextBlock': '@/components/shared/text/TextBlock',
  '@/components/molecules/HeadlineSection': '@/components/shared/text/HeadlineSection',

  // Shared: Animation
  '@/components/atoms/FadeInSection': '@/components/shared/animation/FadeInSection',

  // Shared: Data Table
  '@/components/molecules/data-table': '@/components/shared/data-table/DataTable',

  // Shared: Rich Text
  '@/components/molecules/RichTextEditor': '@/components/shared/rich-text/RichTextEditor',

  // Shared: Blocked Dates
  '@/components/molecules/blocked-dates': '@/components/shared/blocked-dates/BlockedDates',

  // Shared: Utilities
  '@/components/molecules/AuthorizationProvider': '@/components/shared/AuthorizationProvider',
  '@/components/molecules/ErrorBoundaryWrapper': '@/components/shared/ErrorBoundaryWrapper',
  '@/components/molecules/ErrorFallback': '@/components/shared/ErrorFallback',
  '@/components/molecules/PlatformDisclaimer': '@/components/shared/PlatformDisclaimer',
  '@/components/atoms/ServerStatus': '@/components/shared/ServerStatus',
  '@/components/atoms/CookiePreferencesButton': '@/components/shared/CookiePreferencesButton',
  '@/components/molecules/shell': '@/components/shared/shell',

  // Integrations
  '@/components/molecules/StripeConnectEmbed':
    '@/components/integrations/stripe/StripeConnectEmbed',
  '@/components/notifications/secure-novu-inbox': '@/components/integrations/novu/SecureNovuInbox',
  '@/components/analytics/PostHogTracker': '@/components/integrations/analytics/PostHogTracker',

  // Icons
  '@/components/atoms/icons': '@/components/icons/icons',
};

function migrateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Sort mappings by length (longest first) to avoid partial replacements
    const sortedMappings = Object.entries(importMappings).sort((a, b) => b[0].length - a[0].length);

    for (const [oldPath, newPath] of sortedMappings) {
      // Match import statements with this path
      const importRegex = new RegExp(`from\\s+['"]${oldPath.replace(/\//g, '\\/')}['"]`, 'g');
      if (content.match(importRegex)) {
        content = content.replace(importRegex, `from '${newPath}'`);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.mdx']) {
  const files = [];

  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip node_modules and other directories
      if (entry.isDirectory()) {
        if (!['node_modules', '.next', '.git', 'coverage'].includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function main() {
  console.log('🚀 Starting component import migration...\n');

  const projectRoot = process.cwd();
  const dirsToScan = [
    path.join(projectRoot, 'app'),
    path.join(projectRoot, 'components'),
    path.join(projectRoot, 'lib'),
    path.join(projectRoot, 'tests'),
    path.join(projectRoot, 'content'),
    path.join(projectRoot, 'emails'),
  ];

  let totalFiles = 0;
  let modifiedFiles = 0;

  for (const dir of dirsToScan) {
    if (!fs.existsSync(dir)) continue;

    console.log(`📁 Scanning ${path.relative(projectRoot, dir)}...`);
    const files = getAllFiles(dir);
    totalFiles += files.length;

    for (const file of files) {
      if (migrateImportsInFile(file)) {
        modifiedFiles++;
        console.log(`  ✅ ${path.relative(projectRoot, file)}`);
      }
    }
  }

  console.log(`\n✨ Migration complete!`);
  console.log(`📊 Stats:`);
  console.log(`   - Total files scanned: ${totalFiles}`);
  console.log(`   - Files modified: ${modifiedFiles}`);
  console.log(`   - Files unchanged: ${totalFiles - modifiedFiles}`);
}

if (require.main === module) {
  main();
}

module.exports = { migrateImportsInFile, importMappings };
