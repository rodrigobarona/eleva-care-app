# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-05-27

### Added

- **Comprehensive Blocked Dates Management System**:

  - Full blocked dates functionality allowing users to add, edit, and remove unavailable dates
  - Optional notes support for blocked dates with timezone awareness
  - Hover-based edit/delete actions with smooth animations and tooltips
  - Integration with both private schedule management and public booking pages
  - Calendar integration that prevents bookings on blocked dates
  - Proper timezone conversion preventing date display issues

- **Advanced Scheduling Settings & Configuration**:

  - Customizable buffer times for before and after events (0-120 minutes)
  - Minimum notice period settings (1 hour to 2 weeks)
  - Time slot interval configuration (5 minutes to 2 hours in 5-minute increments)
  - Booking window settings (1 week to 1 year)
  - Visual feedback showing total meeting duration including buffers
  - Comprehensive tooltips and contextual help text for all settings

- **Enhanced Form Experience & User Interface**:

  - Floating save buttons that appear only when forms are dirty
  - Loading states with spinners for all async operations
  - Success/error toast notifications for comprehensive user feedback
  - Auto-save functionality with unsaved changes protection
  - Enhanced accessibility with proper tooltips and ARIA labels
  - Dedicated timezone selector component with improved UX

- **Unified Design System & Typography**:

  - Consistent button hierarchy across all dashboard forms:
    - Primary actions: `rounded-full` (Save, Update, Submit) - Deep Teal
    - Secondary actions: `rounded-md` (Add, Create) - Sage Green border
    - Tertiary actions: `rounded` (Cancel, form inputs) - Gray border
    - Icon actions: `rounded-full` (Edit, Delete) - Ghost style with color-coded hovers
  - Improved typography using new font families (Lora serif, DM Sans, IBM Plex Mono)
  - Section headers now use serif font with improved visual hierarchy
  - Monospace font for time displays and technical information

- **Calendar Navigation & Layout Improvements**:
  - Fixed calendar navigation positioning using component-specific styling
  - Proper arrow placement at top corners without affecting base calendar component
  - Clean, minimal tab design without background colors or rounded corners
  - Enhanced tab states with color transitions and border indicators
  - Improved sidebar navigation with hierarchical calendar settings

### Changed

- **Layout & Spacing Enhancements**:

  - Cleaner schedule layout with better visual separation using three-column grid
  - Improved spacing and alignment in form sections with consistent padding
  - Enhanced mobile responsiveness for all components
  - Better grid layouts for complex forms with proper breakpoints

- **User Experience Improvements**:

  - Smoother transitions and animations throughout the application
  - More intuitive hover states and interactive elements
  - Better error handling and user feedback mechanisms
  - Improved form validation with clear, actionable error messages
  - Enhanced availability inputs with better visual feedback

- **Typography & Accessibility**:
  - Consistent text sizing and spacing across all forms
  - Better color contrast and readability improvements
  - Enhanced accessibility with proper semantic HTML and ARIA labels
  - Improved keyboard navigation support

### Fixed

- **Timezone & Date Handling Issues**:

  - Resolved date display problems caused by timezone conversion
  - Fixed blocked dates showing incorrect dates (e.g., "Jun 01" instead of "Jun 02")
  - Proper timezone handling in both server actions and client components
  - Consistent date formatting across all components and contexts

- **Calendar Integration & Navigation**:

  - Fixed navigation arrows positioning in blocked dates calendar
  - Resolved layout issues when calendar was used in different contexts
  - Proper disabled state handling for blocked and unavailable dates
  - Calendar navigation and disabled state inconsistencies resolved

- **Form State Management & Validation**:
  - Fixed false toast notifications when opening dialogs
  - Resolved form validation issues with async operations
  - Better handling of form state persistence across navigation
  - Improved error handling throughout scheduling and notification components

### Technical

- **Database Schema & Migrations**:

  - Added `scheduling_settings` table with columns for buffer times, notice periods, intervals, and booking windows
  - Added `blocked_dates` table with timezone support and optional notes
  - Applied database migrations for new booking window, timezone, and scheduling columns
  - Updated schema snapshots and migration metadata

- **Server Actions & API Routes**:

  - Enhanced `getBlockedDates` and `getBlockedDatesForUser` functions with timezone handling
  - New `server/schedulingSettings.ts` service for user scheduling settings management
  - New `server/actions/blocked-dates.ts` module for blocked dates CRUD operations
  - New `app/api/scheduling-settings/route.ts` API endpoint for GET/PATCH operations
  - Improved error handling and timezone parameter passing throughout server actions

- **Component Architecture & Performance**:

  - **New Components**:
    - `components/molecules/blocked-dates.tsx`: Complete blocked dates management with calendar integration
    - `components/molecules/timezone-select/index.tsx`: Grouped, searchable timezone selector with tooltips
    - `components/atoms/scroll-area.tsx`: Custom scroll area wrapping Radix UI primitives
    - `components/organisms/forms/SchedulingSettingsForm.tsx`: Comprehensive scheduling settings form
  - **Enhanced Components**:
    - `components/organisms/forms/ScheduleForm.tsx`: Major upgrade with blocked dates, improved availability UI, and floating save button
    - `components/organisms/forms/MeetingForm.tsx`: Added buffer time and blocked dates support with duration display
    - `components/organisms/BookingLayout.tsx`: Integrated blocked dates logic and calendar disable functionality
    - `components/organisms/sidebar/AppSidebar.tsx`: Enhanced with hierarchical calendar sub-items
  - Extracted reusable components for better maintainability
  - Improved prop interfaces and TypeScript definitions
  - Better separation of concerns between UI and business logic
  - Optimized re-renders with proper memoization

- **Business Logic & Scheduling Engine**:

  - Enhanced `lib/getValidTimesFromSchedule.ts` with dynamic scheduling settings integration
  - Improved conflict detection and availability logic with buffer time consideration
  - Dynamic time slot interval calculation based on user preferences
  - Advanced booking window and minimum notice period enforcement

- **Configuration & Constants**:

  - New `lib/constants/scheduling.ts` with default scheduling settings and exported constants
  - Updated `tailwind.config.ts` with new font families and forms plugin
  - Enhanced `lib/formatters.ts` with improved timezone offset handling and error fallbacks

- **Dependencies & Build System**:
  - Updated Tailwind configuration for enhanced styling and form support
  - Added Tailwind forms plugin for better form styling
  - Enhanced date handling libraries integration
  - Improved form validation and state management libraries
  - Updated various UI components for better consistency

### Removed

- **Legacy Components & Pages**:
  - Removed `temp_backup/[username]/*` legacy profile and booking pages
  - Cleaned up outdated payment processing and success page implementations
  - Replaced legacy booking flow with new comprehensive scheduling system

### Database Migrations

- **0001_scheduling_settings**: Added scheduling_settings table with user preferences
- **0002_blocked_dates**: Added blocked_dates table with timezone and notes support
- **0003_booking_window_updates**: Enhanced booking window calculations and constraints
- **0004_timezone_columns**: Added timezone support across scheduling tables

### API Changes

- **New Endpoints**:

  - `GET /api/scheduling-settings`: Retrieve user scheduling preferences
  - `PATCH /api/scheduling-settings`: Update user scheduling settings with validation

- **Enhanced Server Actions**:
  - `addBlockedDates`: Create blocked dates with timezone awareness
  - `removeBlockedDate`: Delete specific blocked dates
  - `getBlockedDates`: Retrieve user's blocked dates
  - `getBlockedDatesForUser`: Public endpoint for booking calendar integration

### Documentation

- **Comprehensive Design Guidelines**:

  - Added dashboard forms design guide with complete implementation examples
  - Created design system rules for consistent form development
  - Documented button hierarchy, typography system, and layout patterns
  - Implementation checklist for developers
  - Accessibility guidelines and best practices

- **Technical Documentation**:
  - Enhanced scheduling features documentation
  - Component usage guides and examples
  - Form state management patterns
  - Timezone handling best practices

### Chores

- **Build & Development**:

  - Updated dependencies for enhanced functionality
  - Improved build processes and type checking
  - Enhanced development tooling and linting rules

- **Code Quality**:
  - Consistent code formatting and organization
  - Improved TypeScript types and interfaces
  - Better error handling patterns throughout the codebase

---

## [0.1.0] - Previous Release

### Added

- Initial scheduling settings with basic buffer time management
- Basic booking form functionality
- Calendar integration with Google Calendar
- User authentication with Clerk
- Payment processing with Stripe
- Email notifications with Resend
- Database integration with Neon and Drizzle ORM
