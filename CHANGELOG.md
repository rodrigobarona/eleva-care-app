# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-05-27

### Added

- **Comprehensive Blocked Dates System**:

  - Full blocked dates functionality with timezone-aware date handling
  - Add, edit, and delete blocked dates with optional notes
  - Hover-based edit/delete actions with smooth animations
  - Integration with both private schedule management and public booking pages
  - Proper timezone conversion preventing date display issues
  - Calendar integration that disables blocked dates for booking

- **Enhanced UI Design System**:

  - Unified button hierarchy with consistent styling across all forms
  - Primary actions: `rounded-lg` (Save, Update, Submit) - Deep Teal
  - Secondary actions: `rounded-md` (Add, Create) - Sage Green border
  - Tertiary actions: `rounded` (Cancel, form inputs) - Gray border
  - Icon actions: `rounded-full` (Edit, Delete) - Ghost style with color-coded hovers
  - Improved typography using new font families (Lora serif, DM Sans, IBM Plex Mono)

- **Advanced Scheduling Settings**:

  - Enhanced buffer time management with configurable before/after event buffers
  - Minimum notice period settings (1 hour to 2 weeks)
  - Time slot interval configuration (5 minutes to 2 hours)
  - Booking window settings (1 week to 1 year)
  - Visual feedback showing total meeting duration including buffers
  - Comprehensive tooltips and help text for all settings

- **Improved Form Experience**:

  - Loading states with spinners for all async operations
  - Success/error toast notifications for user feedback
  - Auto-save functionality with unsaved changes protection
  - Floating save buttons that appear only when forms are dirty
  - Enhanced accessibility with proper tooltips and ARIA labels

- **Calendar Navigation Improvements**:
  - Fixed calendar navigation positioning using component-specific styling
  - Proper arrow placement at top corners without affecting base calendar
  - Clean, minimal tab design without background colors or rounded corners
  - Enhanced tab states with color transitions and border indicators

### Changed

- **Typography Enhancements**:

  - Section headers now use serif font with improved hierarchy
  - Consistent text sizing and spacing across all forms
  - Better color contrast and readability
  - Monospace font for time displays and technical information

- **Layout Improvements**:

  - Cleaner schedule layout with better visual separation
  - Improved spacing and alignment in form sections
  - Enhanced mobile responsiveness for all components
  - Better grid layouts for complex forms

- **User Experience**:
  - Smoother transitions and animations throughout the app
  - More intuitive hover states and interactive elements
  - Better error handling and user feedback
  - Improved form validation with clear error messages

### Fixed

- **Timezone Issues**:

  - Resolved date display problems caused by timezone conversion
  - Fixed blocked dates showing incorrect dates (e.g., "Jun 01" instead of "Jun 02")
  - Proper timezone handling in both server actions and client components
  - Consistent date formatting across all components

- **Calendar Integration**:

  - Fixed navigation arrows positioning in blocked dates calendar
  - Resolved layout issues when calendar was used in different contexts
  - Proper disabled state handling for blocked and unavailable dates

- **Form State Management**:
  - Fixed false toast notifications when opening dialogs
  - Resolved form validation issues with async operations
  - Better handling of form state persistence across navigation

### Technical

- **Server Actions**:

  - Enhanced `getBlockedDates` and `getBlockedDatesForUser` functions
  - Improved error handling and timezone parameter passing
  - Better database integration with proper type safety

- **Component Architecture**:

  - Extracted reusable components for better maintainability
  - Improved prop interfaces and TypeScript definitions
  - Better separation of concerns between UI and business logic

- **Performance**:
  - Optimized re-renders with proper memoization
  - Improved loading states and async operation handling
  - Better caching strategies for frequently accessed data

### Dependencies

- Updated various UI components for better consistency
- Enhanced date handling libraries integration
- Improved form validation and state management libraries

---

## [0.1.0] - Previous Release

### Added

- Initial scheduling settings with buffer time management
- Basic booking form functionality
- Calendar integration with Google Calendar
- User authentication with Clerk
- Payment processing with Stripe
- Email notifications with Resend
- Database integration with Neon and Drizzle ORM
