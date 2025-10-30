// Shared Components Barrel Export

// Navigation
export { NavLink as NavLink } from './navigation/NavLink';
export { NavLinkContent as NavLinkContent } from './navigation/NavLinkContent';
export { default as SmoothLink } from './navigation/SmoothLink';

// i18n
export { LanguageSwitcher as LanguageSwitcher } from './i18n/LocaleSwitcher';
export { default as LocaleSwitcherSelect } from './i18n/LocaleSwitcherSelect';

// Loading
export { LoadingSpinner as LoadingSpinner } from './loading/LoadingSpinner';
export { HeroSkeleton as HomePageSkeletons } from './loading/HomePageSkeletons';

// Media
export { VideoPlayer } from './media/VideoPlayer';

// Text
export { default as TextBlock } from './text/TextBlock';
export { default as HeadlineSection } from './text/HeadlineSection';

// Animation
export { default as FadeInSection } from './animation/FadeInSection';

// Data Table
export { DataTable } from './data-table/DataTable';

// Rich Text
export { default as RichTextEditor } from './rich-text/RichTextEditor';

// Blocked Dates
export { BlockedDates } from './blocked-dates/BlockedDates';

// Utilities
export { RequireRole, AuthorizationProvider } from './AuthorizationProvider';
export { ErrorBoundaryWrapper } from './ErrorBoundaryWrapper';
export { ErrorFallback } from './ErrorFallback';
export { PlatformDisclaimer } from './PlatformDisclaimer';
export { ServerStatus } from './ServerStatus';
export { CookiePreferencesButton } from './CookiePreferencesButton';
export { Shell } from './shell';
