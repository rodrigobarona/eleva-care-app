'use client';

import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useState } from 'react';

// PostHog Type Definitions
interface PostHogEventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

type BusinessEventType =
  | 'appointment_booked'
  | 'payment_completed'
  | 'expert_contacted'
  | 'profile_completed';
type EngagementType = 'click' | 'scroll' | 'hover' | 'focus';

/**
 * Enhanced PostHog hook for feature flags
 */
export function usePostHogFeatureFlag(flagKey: string, defaultValue: boolean = false) {
  const posthog = usePostHog();
  const [flagValue, setFlagValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!posthog) return;

    const checkFlag = () => {
      const value = posthog.isFeatureEnabled(flagKey);
      setFlagValue(value ?? defaultValue);
      setIsLoading(false);
    };

    // Check immediately
    checkFlag();

    // Listen for feature flag updates
    posthog.onFeatureFlags(checkFlag);

    // Note: PostHog's onFeatureFlags doesn't provide an unsubscribe mechanism
    // The cleanup will happen automatically when the component unmounts
    return () => {
      // No cleanup needed - PostHog handles this internally
    };
  }, [posthog, flagKey, defaultValue]);

  return { flagValue, isLoading };
}

/**
 * Enhanced event tracking hook
 */
export function usePostHogEvents() {
  const posthog = usePostHog();
  const { user } = useAuth();

  const trackEvent = useCallback(
    (eventName: string, properties?: PostHogEventProperties) => {
      if (!posthog) return;

      const enrichedProperties: PostHogEventProperties = {
        ...properties,
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        session_id: posthog.get_session_id(),
      };

      posthog.capture(eventName, enrichedProperties);
    },
    [posthog, user?.id],
  );

  const trackUserAction = useCallback(
    (action: string, context?: PostHogEventProperties) => {
      trackEvent('user_action', {
        action,
        ...context,
      });
    },
    [trackEvent],
  );

  const trackBusinessEvent = useCallback(
    (event: BusinessEventType, properties?: PostHogEventProperties) => {
      trackEvent(`business_${event}`, properties);
    },
    [trackEvent],
  );

  const trackEngagement = useCallback(
    (type: EngagementType, element: string, properties?: PostHogEventProperties) => {
      trackEvent('engagement', {
        type,
        element,
        ...properties,
      });
    },
    [trackEvent],
  );

  const trackConversion = useCallback(
    (funnel: string, step: string, properties?: PostHogEventProperties) => {
      trackEvent('conversion_step', {
        funnel,
        step,
        ...properties,
      });
    },
    [trackEvent],
  );

  const trackError = useCallback(
    (error: Error | string, context?: PostHogEventProperties) => {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;

      trackEvent('error_occurred', {
        error_message: errorMessage,
        error_stack: errorStack,
        ...context,
      });
    },
    [trackEvent],
  );

  return {
    trackEvent,
    trackUserAction,
    trackBusinessEvent,
    trackEngagement,
    trackConversion,
    trackError,
  };
}

/**
 * A/B Testing hook
 */
export function usePostHogABTest(experimentKey: string, variants: string[]) {
  const posthog = usePostHog();
  const [variant, setVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!posthog) return;

    const checkExperiment = () => {
      const experimentVariant = posthog.getFeatureFlag(experimentKey);

      if (experimentVariant && variants.includes(experimentVariant as string)) {
        setVariant(experimentVariant as string);
      } else {
        setVariant(variants[0]); // Default to first variant
      }

      setIsLoading(false);
    };

    checkExperiment();
    posthog.onFeatureFlags(checkExperiment);

    // Note: PostHog's onFeatureFlags doesn't provide an unsubscribe mechanism
    // The cleanup will happen automatically when the component unmounts
    return () => {
      // No cleanup needed - PostHog handles this internally
    };
  }, [posthog, experimentKey, variants]);

  const trackExperimentExposure = useCallback(() => {
    if (!posthog || !variant) return;

    posthog.capture('experiment_exposure', {
      experiment_key: experimentKey,
      variant: variant,
    });
  }, [posthog, experimentKey, variant]);

  return { variant, isLoading, trackExperimentExposure };
}

/**
 * User identification hook
 */
export function usePostHogIdentification() {
  const posthog = usePostHog();
  const { user, loading } = useAuth();
  const isLoaded = !loading;

  useEffect(() => {
    if (!posthog || !isLoaded) return;

    if (user) {
      // Identify user with enhanced properties
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        first_name: user.firstName,
        last_name: user.lastName,
        avatar: user.imageUrl,
        created_at: user.createdAt,
        email_verified: user.primaryEmailAddress?.verification?.status === 'verified',
        phone_verified: user.primaryPhoneNumber?.verification?.status === 'verified',
        last_sign_in: user.lastSignInAt,
        phone: user.primaryPhoneNumber?.phoneNumber,
        has_image: !!user.imageUrl,
      });

      // Set people properties
      posthog.people.set({
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        avatar: user.imageUrl,
        last_seen: new Date().toISOString(),
      });
    } else {
      // Reset identification for anonymous users
      posthog.reset();
    }
  }, [posthog, user, isLoaded]);

  const identifyUser = useCallback(
    (userId: string, properties?: PostHogEventProperties) => {
      if (!posthog) return;
      posthog.identify(userId, properties);
    },
    [posthog],
  );

  const aliasUser = useCallback(
    (alias: string) => {
      if (!posthog) return;
      posthog.alias(alias);
    },
    [posthog],
  );

  return { identifyUser, aliasUser };
}

/**
 * Performance tracking hook
 */
export function usePostHogPerformance() {
  const { trackEvent } = usePostHogEvents();

  const trackPerformanceMetric = useCallback(
    (metric: string, value: number, context?: PostHogEventProperties) => {
      trackEvent('performance_metric', {
        metric,
        value,
        ...context,
      });
    },
    [trackEvent],
  );

  const trackPageLoadTime = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return;

    trackPerformanceMetric('page_load_time', navigation.loadEventEnd - navigation.loadEventStart, {
      pathname: window.location.pathname,
    });
  }, [trackPerformanceMetric]);

  const trackApiCallTime = useCallback(
    (endpoint: string, duration: number, status?: number) => {
      trackPerformanceMetric('api_call_time', duration, {
        endpoint,
        status: status?.toString(),
      });
    },
    [trackPerformanceMetric],
  );

  return {
    trackPerformanceMetric,
    trackPageLoadTime,
    trackApiCallTime,
  };
}
