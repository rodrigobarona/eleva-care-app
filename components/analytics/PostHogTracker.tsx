'use client';

import { usePostHogEvents, usePostHogFeatureFlag } from '@/lib/hooks/usePostHog';
import { useEffect } from 'react';

// PostHog Type Definitions
interface PostHogEventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

interface PostHogTrackerProps {
  children: React.ReactNode;
  eventName?: string;
  eventProperties?: PostHogEventProperties;
  featureFlag?: string;
  trackOnMount?: boolean;
}

/**
 * PostHog Tracker Component
 *
 * Wraps children and provides automatic event tracking capabilities.
 * Can be used to track page views, feature flag exposure, or custom events.
 *
 * @example
 * ```tsx
 * <PostHogTracker
 *   eventName="page_viewed"
 *   eventProperties={{ page: 'dashboard' }}
 *   featureFlag="new_dashboard_layout"
 *   trackOnMount
 * >
 *   <DashboardContent />
 * </PostHogTracker>
 * ```
 */
export function PostHogTracker({
  children,
  eventName,
  eventProperties,
  featureFlag,
  trackOnMount = false,
}: PostHogTrackerProps) {
  const { trackEvent } = usePostHogEvents();
  const { flagValue } = usePostHogFeatureFlag(featureFlag || '', false);

  useEffect(() => {
    if (trackOnMount && eventName) {
      trackEvent(eventName, eventProperties);
    }
  }, [trackOnMount, eventName, eventProperties, trackEvent]);

  useEffect(() => {
    if (featureFlag && flagValue) {
      trackEvent('feature_flag_exposure', {
        flag_key: featureFlag,
        flag_value: flagValue,
        ...eventProperties,
      });
    }
  }, [featureFlag, flagValue, trackEvent, eventProperties]);

  return <>{children}</>;
}

/**
 * Click Tracking Wrapper
 *
 * Automatically tracks click events on wrapped elements.
 */
interface ClickTrackerProps {
  children: React.ReactNode;
  eventName?: string;
  eventProperties?: PostHogEventProperties;
  element?: string;
}

export function ClickTracker({
  children,
  eventName: _eventName = 'element_clicked',
  eventProperties,
  element = 'unknown',
}: ClickTrackerProps) {
  const { trackEngagement } = usePostHogEvents();

  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    trackEngagement('click', element, {
      ...eventProperties,
      click_target: target?.tagName?.toLowerCase(),
      click_text: target?.textContent?.slice(0, 100),
    });
  };

  return (
    <div onClick={handleClick} onKeyDown={() => {}} role="button" tabIndex={0} data-ph-capture>
      {children}
    </div>
  );
}

/**
 * Form Tracking Wrapper
 *
 * Tracks form interactions and submissions.
 */
interface FormTrackerProps {
  children: React.ReactNode;
  formName: string;
  onSubmit?: (data: FormData) => void;
}

export function FormTracker({ children, formName, onSubmit }: FormTrackerProps) {
  const { trackEvent, trackConversion } = usePostHogEvents();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const formObject = Object.fromEntries(formData.entries());

    // Track form submission
    trackEvent('form_submitted', {
      form_name: formName,
      field_count: Object.keys(formObject).length,
      has_errors: false, // This should be determined by form validation
    });

    // Track as conversion step
    trackConversion('form_completion', formName, {
      field_count: Object.keys(formObject).length,
    });

    onSubmit?.(formData);
  };

  const handleFieldInteraction = (event: React.FocusEvent) => {
    const target = event.target as HTMLInputElement;
    trackEvent('form_field_interaction', {
      form_name: formName,
      field_name: target?.name,
      field_type: target?.type,
      interaction_type: 'focus',
    });
  };

  return (
    <form onSubmit={handleSubmit} onFocus={handleFieldInteraction} data-ph-capture>
      {children}
    </form>
  );
}

/**
 * Business Event Tracker
 *
 * Tracks specific business events with proper categorization.
 */
interface BusinessEventTrackerProps {
  children: React.ReactNode;
  event: 'appointment_booked' | 'payment_completed' | 'expert_contacted' | 'profile_completed';
  properties?: PostHogEventProperties;
  triggerOn?: 'mount' | 'click' | 'manual';
}

export function BusinessEventTracker({
  children,
  event,
  properties,
  triggerOn = 'click',
}: BusinessEventTrackerProps) {
  const { trackBusinessEvent } = usePostHogEvents();

  useEffect(() => {
    if (triggerOn === 'mount') {
      trackBusinessEvent(event, properties);
    }
  }, [triggerOn, event, properties, trackBusinessEvent]);

  const handleClick = () => {
    if (triggerOn === 'click') {
      trackBusinessEvent(event, properties);
    }
  };

  const handleKeyDown = (keyEvent: React.KeyboardEvent) => {
    if (triggerOn === 'click' && (keyEvent.key === 'Enter' || keyEvent.key === ' ')) {
      trackBusinessEvent(event, properties);
    }
  };

  if (triggerOn === 'click') {
    return (
      <div
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        data-ph-capture
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Performance Tracker
 *
 * Tracks component render performance and user interactions.
 */
interface PerformanceTrackerProps {
  children: React.ReactNode;
  componentName: string;
  trackRenderTime?: boolean;
}

export function PerformanceTracker({
  children,
  componentName,
  trackRenderTime = false,
}: PerformanceTrackerProps) {
  const { trackEvent } = usePostHogEvents();

  useEffect(() => {
    if (trackRenderTime) {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        trackEvent('component_render_time', {
          component_name: componentName,
          render_time: endTime - startTime,
        });
      };
    }
  }, [trackRenderTime, componentName, trackEvent]);

  return <>{children}</>;
}

/**
 * Error Tracker - React Error Boundary with PostHog integration
 */
interface ErrorTrackerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorTrackerState {
  hasError: boolean;
  error?: Error;
}

export class ErrorTracker extends React.Component<ErrorTrackerProps, ErrorTrackerState> {
  constructor(props: ErrorTrackerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorTrackerState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error with PostHog
    if (typeof window !== 'undefined' && (window as WindowWithPostHog).posthog) {
      (window as WindowWithPostHog).posthog.capture('react_error_boundary', {
        error_message: error.message,
        error_stack: error.stack,
        component_stack: errorInfo.componentStack,
        error_boundary: 'PostHogErrorTracker',
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div>
            <h2>Something went wrong.</h2>
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Global Error Tracking Setup
 * Call this function in your app initialization to track global errors
 */
export function setupGlobalErrorTracking() {
  if (typeof window === 'undefined') return;

  // Track unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    if ((window as WindowWithPostHog).posthog) {
      (window as WindowWithPostHog).posthog.capture('javascript_error', {
        error_message: event.error?.message || event.message,
        error_stack: event.error?.stack,
        filename: event.filename,
        line_number: event.lineno,
        column_number: event.colno,
        user_agent: navigator.userAgent,
      });
    }
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if ((window as WindowWithPostHog).posthog) {
      (window as WindowWithPostHog).posthog.capture('unhandled_promise_rejection', {
        reason: event.reason?.toString() || 'Unknown reason',
        stack: event.reason?.stack,
      });
    }
  });
}

// Type definitions for global PostHog access
declare global {
  interface WindowWithPostHog extends Window {
    posthog: import('posthog-js').PostHog;
  }
}
