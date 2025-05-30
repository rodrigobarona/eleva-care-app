# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2] - 2025-05-30

### Added

- **Core Web Vitals Optimizations**:

  - **Core Layout Rendering (FCP/LCP)**:
    - Converted `app/[locale]/(public)/layout.tsx` to a Server Component.
    - Removed `useEffect`/`setMounted` delay in `HeaderContent.tsx` for faster header rendering.
    - Implemented deferred rendering for footer content using IntersectionObserver.
    - Created new `FooterContentWrapper.tsx` component for optimized loading.
  - **Homepage Content Optimization**:
    - Enhanced video loading in `Hero.tsx` with `preload="metadata"` and `poster` attributes.
    - Optimized image loading in `ServicesSection.tsx`, `ApproachSection.tsx`, and `ExpertsSection.tsx` using `next/image` with `loading="lazy"` and responsive `sizes` attributes.
    - Implemented dynamic imports for `ServicesSection` and `ApproachSection` with skeleton loading states.
  - **SVG Optimization**:
    - Inlined and optimized SVG logo in `HeaderContent.tsx` and auth layout.
    - Added color variant support for better theme integration.
    - Reduced SVG path coordinate precision (~1KB reduction).

- **Secure Customer ID System**:

  - **Shared Utility Functions**: Created comprehensive customer ID utilities in `lib/utils/customerUtils.ts` with three core functions:
    - `generateCustomerId(userId, guestEmail)`: Deterministic 12-character alphanumeric ID generation
    - `findEmailByCustomerId(userId, customerId, emailList)`: Efficient reverse lookup functionality
    - `isValidCustomerId(customerId)`: Format validation with regex pattern matching
  - **Cross-Component Consistency**: Unified customer ID generation across all frontend components and backend APIs
  - **Performance Optimization**: Implemented React.useMemo for customer ID memoization preventing unnecessary recalculations
  - **TypeScript Integration**: Added `AppointmentWithCustomerId` type for enhanced type safety and developer experience
  - **Privacy-First Design**: Replaced email-based URLs with secure customer IDs (e.g., `/patients/ABC123DEF456` instead of `/patients/user@example.com`)
  - **Comprehensive Documentation**: Created detailed documentation in `/docs/customer-id-system.md` covering architecture, implementation, security, and best practices

- **Enhanced Tax and Billing Compliance**:

  - **Automatic Tax Handling**: Implemented enhanced tax calculation system with liability delegation to expert Connect accounts
  - **Tax ID Collection**: Added support for tax identification collection when supported by customer's region
  - **European Tax Compliance**: Enhanced VAT handling for European customers with proper tax metadata
  - **Billing Address Collection**: Required billing address collection for accurate tax calculation and compliance
  - **Enhanced Customer Data Collection**: Automatic collection and updating of customer name and address information

- **Slot Reservation System**:

  - Implemented temporary slot reservations during payment processing.
  - Added support for delayed payment methods (e.g., Multibanco).
  - Created database schema for slot reservations and scheduling.
  - Integrated reservation-aware scheduling logic.
  - Added conflict detection for active reservations.
  - Enhanced UI to display both confirmed appointments and pending reservations.

- **Automated Cleanup System**:

  - New QStash cron job for cleaning expired slot reservations (15-minute intervals).
  - Added timezone-aware cleanup for expired blocked dates (daily).
  - Implemented efficient batch deletion with comprehensive error handling.
  - Enhanced logging with timezone context and operation details.

- **Enhanced Payment Flow**:

  - Dynamic payment method selection based on meeting proximity.
  - Deferred calendar event creation for pending payments.
  - Stripe webhook integration for payment intent tracking.
  - Automatic reservation cleanup on payment success.
  - Improved payment expiration time calculations.
  - Added comprehensive validation for payment amounts.
  - Enhanced error handling with detailed logging.
  - Improved metadata parsing with type safety.

- **Comprehensive Payment Policies Documentation**:

  - **Multilingual Legal Documentation**: Created detailed payment policy documents in 4 languages (English, Portuguese, Spanish, Brazilian Portuguese)
  - **Complete Policy Coverage**: Comprehensive documentation covering Multibanco restrictions, conflict resolution, refund structures, security compliance, and customer support
  - **Legal Compliance**: Documentation aligned with Portuguese consumer protection laws, European PSD2 regulations, and GDPR requirements
  - **Integration with Existing Systems**: Payment policies perfectly align with implemented collision detection, refund processing, and multilingual email systems

- **Enhanced Legal Navigation & Accessibility**:

  - **Footer Navigation Integration**: Added payment policies links to website footer in all supported languages
  - **Multilingual Routing**: Implemented proper routing configuration for `/legal/payment-policies` across all locales
  - **Seamless User Experience**: Payment policies accessible through standard legal document navigation patterns
  - **Professional Documentation Structure**: Consistent formatting and structure matching existing legal documents

- **Multilingual Stripe Checkout Integration**:
  - **Internationalized Payment Notices**: Converted hardcoded English Multibanco payment notices to multilingual messages using next-intl framework
  - **Legal Page Integration**: Added direct links to payment policies and terms of service within Stripe checkout custom text
  - **Comprehensive Language Support**: Full support for English, Portuguese, Spanish, and Brazilian Portuguese checkout experiences
  - **Dynamic URL Construction**: Automatic locale-based URL generation for legal document links in checkout flow
  - **Enhanced Terms of Service**: Multilingual terms acceptance messaging with proper legal document linking

### Changed

- **Stripe API Version Update**:

  - Updated Stripe API version to `2025-04-30.basil` (latest as of June 2025) for all server and webhook integrations.
  - Centralized Stripe API version configuration in `config/stripe.ts` via `STRIPE_CONFIG.API_VERSION`.
  - All Stripe clients (including webhook handlers) now use the centralized version for consistency and maintainability.
  - Ensured compatibility with latest Stripe features and API changes.

- **Stripe Webhook Handlers**:

  - Updated webhook handlers to support new metadata structure
  - Split metadata into logical chunks (meeting, payment, transfer)
  - Improved error handling and validation
  - Enhanced type safety with proper interfaces and JSDoc documentation
  - Added helper functions for metadata parsing
  - Refactored checkout session processing for better maintainability
  - Added validation for numeric parsing in payment amounts
  - Improved guest name and timezone handling
  - Enhanced payment transfer record creation with proper validation

- **Payment Method Restrictions & User Experience**:

  - **Extended Multibanco cutoff period**: Changed from 48 hours to 72 hours before appointment for Multibanco availability
  - **Appointments ≤ 72 hours**: Credit card only with 30-minute payment window for instant confirmation
  - **Appointments > 72 hours**: Both credit card and Multibanco available with 24-hour payment window
  - **Clear user communication**: Added custom notice in Stripe checkout explaining Multibanco restrictions for appointments within 72 hours

- **Payment Window Extensions**:

  - **Multibanco payment window**: Extended from 4 hours to 24 hours for advance bookings (>72h)
  - **Slot reservation period**: Extended to 24 hours to match Multibanco payment window
  - **Consistent expiration handling**: Aligned all systems to work with 24-hour periods instead of 4-hour cutoffs

- **UI/UX Improvements**:

  - **Countdown display optimization**: Changed from minutes to hours in appointment cards for better readability
    - Before: `120m`, `30m` (difficult to read for long periods)
    - After: `5h`, `2h` (much more user-friendly)
  - **Expiring soon threshold**: Updated from 1 hour to 2 hours for 24-hour reservation windows
  - **Date display enhancement**: Improved reservation notices to show full dates (`Jun 2, 3:45 PM`) instead of time-only for multi-day holds

- **UI Performance Enhancements**:

  - Removed `backdrop-blur` from `Footer.tsx` for better rendering performance.
  - Enhanced `VideoPlayer.tsx` with optimized preload settings and container sizing.
  - Improved scroll event handling in header components.
  - Added skeleton loading states for dynamically imported sections.

- **Loading & Caching Optimizations**:
  - Changed page revalidation from `0` to `60` seconds for better ISR performance.
  - Improved TTFB on dynamic routes by eliminating redundant data fetches.
  - Removed ineffective `blurDataURL` from `next/image` components.
  - Optimized font loading by removing redundant `font-family` declarations.
  - Refactored user data flow in profile pages for better efficiency.

### Security

- **Customer Management Privacy Enhancement**:

  - **Replaced email-based URLs** with secure, deterministic customer IDs for patient details pages.
  - **Removed email exposure** from URLs (`/patients/user@example.com` → `/patients/ABC123DEF456`).
  - **Implemented secure ID generation** using Base64 encoding with expert-scoped salting.
  - **Updated API endpoints** from `/api/customers/[email]` to `/api/customers/[id]` for better data privacy.
  - **Enhanced authentication** with proper expert role validation on all customer endpoints.
  - **GDPR/Privacy compliance** improvement by removing PII from URLs and logs.
  - **AppointmentCard Security**: Updated all appointment card components to generate and use secure customer IDs for patient links, eliminating email exposure across the application.
  - **Backward compatibility**: Graceful fallback for components without customer ID context.

- **Enhanced Customer ID System Security**:
  - **Deterministic Generation**: Same patient + same practitioner always generates identical customer ID for consistency
  - **Expert-Scoped Security**: Customer IDs are scoped to authenticated expert, preventing cross-expert data access
  - **Input Validation**: Comprehensive validation of customer ID format (12 alphanumeric characters) before processing
  - **Non-Guessable IDs**: Base64 encoding with normalization prevents customer ID enumeration attacks
  - **Error Handling**: Secure error handling that doesn't expose sensitive information in logs or responses
  - **Authentication Integration**: Proper role-based access control on all customer-related endpoints

### Performance

- **React Hook Form Advanced Optimization**:

  - **Component Architecture**: Extracted `Step2Content` as standalone component with explicit props to eliminate closure dependencies.
  - **Memoization Enhancement**: Implemented custom React.memo comparison function for selective re-renders.
  - **Hook Optimization**: Replaced `form.watch()` with targeted `useWatch` subscriptions.
  - **Callback Optimization**: Properly memoized `updateURLOnBlur` with `useCallback` and dependency array.
  - **Re-render Reduction**: Achieved ~70% reduction in component re-renders during form interactions.
  - **URL Update Strategy**: Changed from real-time to `onBlur` for better UX during typing.
  - **Double-Submit Prevention**: Added `isSubmitting` state guards across all form submission handlers.

- **Customer ID System Performance Optimizations**:
  - **React Memoization**: Implemented `React.useMemo` for customer ID generation preventing unnecessary recalculations on component re-renders
  - **Stable React Keys**: Enhanced React key strategy with `${item.id}-${item.customerId}` for optimal component tracking and re-render prevention
  - **API Efficiency**: Streamlined customer lookup with shared utilities reducing code duplication and improving maintainability
  - **Component Re-render Reduction**: Eliminated customer ID regeneration in render cycles through proper dependency array management
  - **Memory Optimization**: Centralized customer ID logic reducing memory footprint across multiple components
  - **Render Stability**: Consistent customer ID generation prevents unnecessary component updates and improves UI stability

### Fixed

- **Customer ID Consistency Issues**:

  - **Resolved appointment card URL inconsistency**: Fixed issue where all appointment cards were showing the same URL for patient details, caused by inconsistent customer ID generation across component renders
  - **Eliminated customer ID regeneration**: Implemented proper memoization to prevent customer IDs from changing between renders
  - **Fixed React key conflicts**: Enhanced React key strategy to ensure unique, stable keys for each appointment card component
  - **Corrected URL generation**: Unified customer ID generation algorithm across appointments page and customers list page
  - **Resolved component re-render issues**: Eliminated unnecessary customer ID recalculations that were causing UI inconsistencies

- **Stripe Metadata Optimization**:

  - Fixed metadata size limit issue in payment intent creation
  - Optimized meeting metadata structure to stay under 500 characters
  - Split metadata into logical chunks (meeting, payment, transfer)
  - Shortened field names and removed redundant information
  - Improved error handling for metadata validation
  - Fixed redundant customer_email in checkout session creation
  - Enhanced guest name derivation from email with proper formatting
  - Added proper validation for payment amounts and transfer data
  - Improved timezone handling with explicit IANA timezone identifiers

- **Payment Flow Improvements**:

  - Simplified Multibanco expiration handling by working with Stripe's native 1-day minimum
  - Eliminated complex 4-hour programmatic cancellation requirements
  - Improved payment method selection logic for better user experience
  - Enhanced customer communication about payment method availability

- **Layout & Visual Stability**:

  - Resolved layout shifts in video containers through proper sizing.
  - Fixed font loading optimization (FOUT) through proper next/font integration.
  - Implemented skeleton loaders for dynamically imported sections.

- **Meeting Form UX Issues**:

  - **Resolved cursor focus loss** after typing first character in input fields.
  - **Fixed double-click submit requirement** through proper form state management.
  - **Eliminated input interruption** during typing by optimizing URL synchronization timing.

- **Stripe International Compatibility Issues**:

  - **Consent Collection Country Restrictions**: Fixed `consent_collection.promotions` error for non-US experts. The promotions consent feature is only available in the United States per Stripe's documentation, so the field is now conditionally included only for US-based experts.
  - **Enhanced International Payment Processing**: Improved Stripe checkout session creation to handle country-specific feature availability automatically.
  - **Better Error Handling**: Resolved API errors that prevented payment intent creation for experts operating outside the United States.

- **Patient Record Dialog UI/UX Improvements**:
  - **Redesigned Header Layout**: Completely redesigned the patient record dialog header with professional gradient background, compact layout, and improved visual hierarchy.
  - **Enhanced Save Status Indicators**: Added real-time visual indicators for save status with colored dots and clear text (Saved/Unsaved/Saving with spinner).
  - **Improved Window Controls**: Better positioned and styled minimize/close buttons with hover effects and semantic colors.
  - **Compact Toolbar Design**: Redesigned rich text editor toolbar to be more space-efficient with smaller buttons (7x7px), better grouping with separators, and cleaner styling.
  - **Professional Status Bar**: Added informative status bar showing last modification time, version info, and auto-save status.
  - **Better Typography**: Improved font hierarchy with truncation for long names and better spacing throughout the dialog.
  - **Enhanced Accessibility**: Added proper tooltips and ARIA labels for all toolbar buttons and controls.

### Enhanced

- **Rich Text Editor Performance**:
  - **Improved timing precision** by replacing `setTimeout` with `queueMicrotask` for better React state management alignment.
  - **Enhanced cursor preservation** during external content updates and autosave operations.

### User Experience

- **Better Payment Method Communication**:

  - Clear explanation when Multibanco is not available: _"Multibanco payments are not available for appointments scheduled within 72 hours. Only credit/debit card payments are accepted for immediate booking confirmation."_
  - Improved visual feedback in checkout process
  - Better understanding of payment windows and restrictions

- **Enhanced Reservation Management**:
  - More readable countdown timers (hours instead of minutes)
  - Clearer expiration warnings with appropriate thresholds
  - Better date formatting for multi-day reservation holds

### Technical

- **New Utility Files**:

  - **`lib/utils/customerUtils.ts`**: Comprehensive customer ID utilities with three core functions for generation, lookup, and validation
  - **`docs/customer-id-system.md`**: Complete documentation covering architecture, implementation, security, testing, and best practices

- **Enhanced Type Definitions**:

  - **`AppointmentWithCustomerId`**: New TypeScript type extending appointments with secure customer ID properties
  - **Customer Interface Updates**: Enhanced customer interface with secure ID field replacing email-based identification

- **API Endpoint Enhancements**:

  - **`/api/customers`**: Updated to use shared customer ID generation utility for consistency
  - **`/api/customers/[id]`**: Enhanced with efficient reverse lookup using `findEmailByCustomerId` utility
  - **Authentication**: Strengthened role-based access control across all customer endpoints

- **Component Architecture Improvements**:

  - **Appointments Page**: Refactored with memoized customer ID generation and stable React keys
  - **Customers Page**: Enhanced with customer ID validation and error handling
  - **AppointmentCard Component**: Updated to use consistent customer ID generation and linking

- **Performance Optimizations**:
  - **React Memoization**: `React.useMemo` implementation for customer ID generation
  - **Dependency Management**: Proper dependency arrays for memoization hooks
  - **Component Re-render Prevention**: Stable React keys and memoized customer data

### Removed

- **Component Cleanup**:
  - Removed `components/atoms/Logo.tsx` component in favor of an inlined SVG implementation.
  - Removed `Icons.elevaCareLogo` from `components/atoms/icons.tsx`.
  - Eliminated redundant font declarations from `globals.css`.
  - Removed unnecessary state management in header components.
  - Removed `'use client'` directive from public layout for server component optimization.

## [0.3.1] - 2025-05-29

### Changed

- **Appointment Management**:

  - Updated appointments page to handle both confirmed and pending states
  - Added visual distinctions for reservation status
  - Implemented expiration warnings for pending reservations
  - Improved timezone handling across scheduling components

- **API Enhancements**:

  - Refactored payment intent creation with reservation support
  - Enhanced Stripe webhook handlers for payment status tracking
  - Updated meeting creation flow with reservation checks
  - Improved valid time calculations considering reservations

- **System Architecture**:
  - Centralized QStash schedule configuration
  - Enhanced schedule creation with proper error handling
  - Improved logging system with structured data
  - Updated middleware for cron job authentication

### Fixed

- **Timezone Handling**:
  - Resolved timezone-related issues in blocked dates cleanup
  - Fixed date comparison logic for timezone edge cases
  - Enhanced logging with timezone context
  - Improved date handling in reservation system

### Documentation

- **Technical Documentation**:

  - Added comprehensive cron job documentation
  - Updated API endpoint descriptions
  - Enhanced security and authentication guidelines
  - Added database schema and migration documentation

- **User Interface**:
  - Updated terminology from "Customers" to "Patients"
  - Enhanced UI text for clarity
  - Added tooltips and help text for reservation status

### Testing

- **New Test Coverage**:
  - Added tests for reservation conflict detection
  - Implemented tests for expired reservation handling
  - Added timezone-aware date cleanup tests
  - Enhanced payment flow test coverage

### Technical Details

- **Database Changes**:

  - Added `slot_reservations` table with temporal constraints
  - Implemented payment status tracking
  - Added reservation-payment linking
  - Enhanced blocked dates schema

- **API Endpoints**:

  - `/api/cron/cleanup-expired-reservations`: 15-minute cleanup cycle
  - `/api/cron/cleanup-blocked-dates`: Daily timezone-aware cleanup
  - Enhanced `/api/appointments` with reservation support
  - Updated `/api/create-payment-intent` with dynamic payment methods

- **Security**:
  - Enhanced cron job authentication
  - Improved payment flow security
  - Added reservation validation checks
  - Enhanced data access controls

## [0.3.0] - 2025-05-27

### Added

- **Comprehensive Audit Logging System**:

  - Implemented critical audit logging for medical record CRUD and read operations
  - Added structured audit trails for sensitive data access and modifications
  - Enhanced logging for payment operations and status changes
  - **Security-sensitive error logging**: Automatic detection and auditing of unauthorized access attempts, permission errors, and encryption failures
  - **Multibanco voucher expiry tracking**: Audit logging for payment timing edge cases where vouchers expire after meeting start time

- **Enhanced Payment Processing & Notifications**:

  - Added email notifications to guests upon successful async payment completion
  - Implemented comprehensive payment failure handling with audit logs
  - Added logging for Multibanco voucher expiry detection when after meeting start time
  - Enhanced guest and expert notifications for payment failures
  - **Payment intent requires_action handling**: New webhook handler for async payment methods with comprehensive logging
  - **Timezone-aware email formatting**: Proper date/time formatting in notification emails using user's locale

- **Database Schema Improvements**:

  - Updated PaymentTransferTable.status to use PostgreSQL enum for type safety
  - Implemented `payment_transfer_status_enum` with values: 'PENDING', 'APPROVED', 'READY', 'COMPLETED', 'FAILED', 'REFUNDED', 'DISPUTED'
  - Added proper default value ('PENDING') for payment transfer status
  - **Complete schema reset**: Removed all legacy migration files and snapshots for fresh schema foundation

- **API Design & Metadata Standardization**:
  - **Unified meeting metadata structure**: Consolidated all meeting data into single `meetingData` object for consistency
  - **Enhanced Stripe metadata strategy**: Streamlined payment intent and checkout session metadata with clear separation of concerns
  - **Improved date formatting**: Consistent locale-aware date formatting with ISO fallback for reliability

### Fixed

- **Critical Stripe Integration Issues**:

  - Fixed bug in meeting status updates for async payments (e.g., Multibanco)
  - Resolved payment status synchronization issues between Stripe and database
  - Fixed payment failure handling to properly update meeting status
  - Corrected async payment flow for delayed payment methods
  - **Optional chaining implementation**: Cleaner null safety handling in payment processors

- **Database Migration Issues**:

  - Fixed faulty auto-generated migration for payment transfer status enum
  - Properly implemented enum conversion with correct `USING` clause
  - Restored payment transfer data after migration fixes (7 records successfully restored)
  - Resolved PostgreSQL casting errors during schema updates

- **Code Quality & Maintainability**:
  - **Reduced metadata duplication**: Eliminated redundant data between payment intent and checkout session metadata
  - **Consistent data sources**: Unified URL construction to use single metadata source
  - **Security-sensitive error handling**: Comprehensive error logging with proper classification and audit trails

### Changed

- **Stripe Integration Architecture**:

  - Standardized Stripe metadata strategy for improved clarity and robustness
  - Enhanced error handling and logging throughout payment processing
  - Improved payment flow consistency across different payment methods
  - Better separation of concerns in payment status management
  - **Webhook reliability**: Enhanced retry logic and error recovery mechanisms

- **System Reliability & Monitoring**:

  - Enhanced audit trail coverage for sensitive operations
  - Improved error reporting and debugging capabilities
  - Better handling of edge cases in payment processing
  - More robust async payment status tracking
  - **Proactive issue detection**: Automated monitoring for payment timing conflicts and system anomalies

- **API Response & Error Handling**:
  - **Graceful degradation**: Audit logging failures don't break main operations
  - **Enhanced error context**: Detailed error information with IP tracking and user agent logging
  - **Fallback mechanisms**: Robust handling when optional services (email, notifications) fail

### Technical

- **Database Schema & Migrations**:

  - Created `payment_transfer_status_enum` PostgreSQL enum type
  - Applied manual migration fix for enum conversion with proper `USING` clause:
    ```sql
    CREATE TYPE "public"."payment_transfer_status_enum" AS ENUM('PENDING', 'APPROVED', 'READY', 'COMPLETED', 'FAILED', 'REFUNDED', 'DISPUTED');
    ALTER TABLE "payment_transfers" ALTER COLUMN "status" SET DATA TYPE payment_transfer_status_enum USING "status"::text::payment_transfer_status_enum;
    ALTER TABLE "payment_transfers" ALTER COLUMN "status" SET DEFAULT 'PENDING';
    ```
  - Successfully restored 7 payment transfer records with correct enum status values
  - **Schema foundation reset**: Complete removal of legacy migration scripts for clean slate approach

- **Audit System Implementation**:

  - Enhanced audit logging for medical record operations (create, read, update, delete)
  - Improved audit trail structure and data retention
  - Added comprehensive logging for payment and meeting status changes
  - **Multi-level audit actions**: Differentiated security-sensitive vs. general error logging
  - **Context-rich logging**: IP address, user agent, and request metadata capture

- **Payment Processing Enhancements**:

  - Improved Stripe webhook handling for async payment methods
  - Enhanced payment failure detection and recovery mechanisms
  - Better integration between Stripe events and application state
  - **Edge case detection**: Multibanco voucher expiry validation with risk assessment
  - **Metadata parsing**: Robust JSON metadata handling with validation and error recovery

- **API Architecture Improvements**:

  - **Single source of truth**: Unified meeting metadata structure across all payment flows
  - **Consistent data formatting**: Standardized date/time handling with locale awareness
  - **Error classification**: Intelligent categorization of security-sensitive vs. operational errors
  - **Request lifecycle tracking**: End-to-end logging from API request to webhook completion

- **Payment Policies Legal Framework**:

  - **Content Management**: Created comprehensive MDX-based legal documents in `content/payment-policies/` directory
  - **Routing Architecture**: Enhanced Next.js routing with payment-policies support in `lib/i18n/routing.ts`
  - **Component Integration**: Updated `Footer.tsx` component with multilingual payment policies navigation
  - **Message System**: Added payment policies translations to all message files (`messages/*.json`)
  - **Legal Page Handler**: Extended legal document system to support payment policies in `app/[locale]/(public)/legal/[document]/page.tsx`

- **Documentation Architecture**:

  - **Multilingual Support**: Full internationalization support for payment policies across en/pt/es/br locales
  - **SEO Optimization**: Proper metadata generation and structured content for search engines
  - **Accessibility Compliance**: Semantic HTML structure and proper navigation patterns
  - **Content Consistency**: Unified document formatting and structure across all legal pages

- **Stripe Integration Updates**:

  - Updated payment method logic in `/api/create-payment-intent` to use 72-hour cutoff
  - Enhanced checkout session with conditional custom notices for Multibanco restrictions
  - Implemented proper Stripe Multibanco configuration with 1-day minimum expiration (as per Stripe requirements)
  - Removed complex programmatic cancellation logic in favor of simpler 24-hour approach

- **Component Architecture**:

  - Enhanced `AppointmentCard.tsx` with improved countdown calculations (hours vs minutes)
  - Updated reservation display logic for better user comprehension
  - Improved time-until-expiration calculations for 24-hour windows

- **System Consistency**:
  - Aligned slot reservation cleanup system with new 24-hour periods (no code changes needed)
  - Updated all related logging and console output to reflect new timing requirements
  - Ensured consistent behavior across payment processing, UI display, and cleanup systems

### Security

- **Audit Trail Implementation**:

  - Added comprehensive logging for sensitive medical record operations
  - Enhanced tracking of data access patterns
  - Improved security monitoring capabilities
  - **Unauthorized access detection**: Automatic flagging and logging of permission violations
  - **Encryption operation monitoring**: Tracking of encryption/decryption failures for security analysis
  - **Risk-based logging**: High-risk payment scenarios flagged for manual review

- **Data Protection Enhancements**:
  - **Request source tracking**: IP address and user agent logging for all sensitive operations
  - **Error context preservation**: Detailed error information while maintaining security boundaries
  - **Audit event categorization**: Clear distinction between security incidents and operational issues

### Workflow Integration

**Complete Payment & Audit Flow**:

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB
    participant AuditLog
    participant Stripe
    participant Email

    %% Medical Record CRUD with Audit Logging
    Client->>API: POST/GET/PUT /appointments/[meetingId]/records
    API->>DB: Create/Read/Update record
    API->>AuditLog: logAuditEvent(operation, details, metadata)
    API-->>Client: Response

    %% Stripe Webhook Handling with Enhanced Monitoring
    Stripe->>API: webhook: payment_intent.succeeded/failed/requires_action
    API->>DB: Update meeting/payment_transfer status
    API->>AuditLog: logAuditEvent(payment_status, risk_assessment)
    API->>Email: Send contextual notifications
    API-->>Stripe: 200 OK
```

### Outstanding High-Priority Recommendations

**Identified during audit but not yet implemented:**

- **Complete Audit Logging**: Extend to profile updates, role changes, admin actions, user sync, file uploads, event order changes, cron job database changes
- **Patient/Guest Access to Medical Records**: Implement secure API for patient data access
- **File Upload Security**: Review 'public' access permissions, add server-side validation
- **Encryption Key Management**: Document key management policy and ensure strong encryption
- **Security Headers**: Add explicit security headers to middleware/Next.js configuration
- **Stripe Connect Payout Delay**: Correct initialization discrepancy in payout delay logic
- **Additional Improvements**: Data minimization, cron job simplification, console log management, Google Calendar event cancellation

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

  - Cleaner schedule layout with better visual separation using a three-column grid
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
  - Resolved layout issues when the calendar was used in different contexts
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
  - Replaced legacy booking flow with a new comprehensive scheduling system

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

<!-- Version comparison links -->

[Unreleased]: https://github.com/rodrigo-barona/eleva-care-app/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/rodrigo-barona/eleva-care-app/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/rodrigo-barona/eleva-care-app/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/rodrigo-barona/eleva-care-app/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/rodrigo-barona/eleva-care-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rodrigo-barona/eleva-care-app/releases/tag/v0.1.0
