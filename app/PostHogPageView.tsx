'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { Suspense, useEffect, useRef } from 'react';

// PostHog and Browser API Type Definitions
interface PostHogProperties {
  [key: string]: string | number | boolean | null | undefined;
}

interface NavigatorConnection {
  effectiveType?: string;
}

interface ExtendedNavigator extends Navigator {
  connection?: NavigatorConnection;
}

interface WindowWithPageStartTime extends Window {
  pageStartTime?: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const previousPath = useRef<string>('');

  // Enhanced pageview tracking
  useEffect(() => {
    if (!pathname || !posthog) return;

    let url = window.origin + pathname;
    if (searchParams.toString()) {
      url = `${url}?${searchParams.toString()}`;
    }

    // Track page view with enhanced metadata
    const pageViewProperties: PostHogProperties = {
      $current_url: url,
      pathname: pathname,
      search_params: searchParams.toString(),
      referrer: document.referrer,
      previous_path: previousPath.current,
      page_title: document.title,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (error) {
          console.warn('Failed to get timezone, using UTC:', error);
          return 'UTC';
        }
      })(),
      connection_type: (navigator as ExtendedNavigator)?.connection?.effectiveType || 'unknown',
      // Route categorization
      route_category: getRouteCategory(pathname),
      is_authenticated_route: isAuthenticatedRoute(pathname),
      locale: getLocaleFromPath(pathname),
    };

    posthog.capture('$pageview', pageViewProperties);

    // Track time spent on previous page
    if (previousPath.current && previousPath.current !== pathname) {
      const windowWithStartTime = window as WindowWithPageStartTime;
      posthog.capture('page_leave', {
        pathname: previousPath.current,
        time_on_page: windowWithStartTime.pageStartTime
          ? Date.now() - windowWithStartTime.pageStartTime
          : null,
      });
    }

    // Set start time for current page
    (window as WindowWithPageStartTime).pageStartTime = Date.now();
    previousPath.current = pathname;

    // Track performance metrics
    if (typeof window !== 'undefined' && window.performance) {
      // Wait for page to be fully loaded
      setTimeout(async () => {
        const navigation = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming;
        if (navigation) {
          // Await async performance metrics to get actual values
          const largestContentfulPaint = await getLargestContentfulPaint();
          const cumulativeLayoutShift = await getCumulativeLayoutShift();

          posthog.capture('page_performance', {
            pathname: pathname,
            load_time: navigation.loadEventEnd - navigation.loadEventStart,
            dom_content_loaded:
              navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            first_paint: getFirstPaint(),
            largest_contentful_paint: largestContentfulPaint,
            cumulative_layout_shift: cumulativeLayoutShift,
          });
        }
      }, 1000);
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

// Helper functions
function getRouteCategory(pathname: string): string {
  if (pathname.includes('/(private)') || pathname.includes('/dashboard')) return 'app';
  if (pathname.includes('/admin')) return 'admin';
  if (pathname.includes('/auth')) return 'auth';
  if (pathname.includes('/api')) return 'api';
  if (pathname.startsWith('/[locale]')) return 'marketing';
  return 'other';
}

function isAuthenticatedRoute(pathname: string): boolean {
  return (
    pathname.includes('/(private)') ||
    pathname.includes('/dashboard') ||
    pathname.includes('/account') ||
    pathname.includes('/admin')
  );
}

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/');
  const possibleLocale = segments[1];
  const supportedLocales = ['en', 'pt', 'es', 'pt-BR'];
  return supportedLocales.includes(possibleLocale) ? possibleLocale : 'en';
}

function getFirstPaint(): number | null {
  const paintEntries = performance.getEntriesByType('paint');
  const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
  return firstPaint ? firstPaint.startTime : null;
}

function getLargestContentfulPaint(): Promise<number | null> {
  return new Promise<number | null>((resolve) => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry ? lastEntry.startTime : null);
        observer.disconnect();
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 10000);
    } else {
      resolve(null);
    }
  });
}

function getCumulativeLayoutShift(): Promise<number | null> {
  return new Promise<number | null>((resolve) => {
    if ('PerformanceObserver' in window) {
      let cumulativeScore = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as LayoutShiftEntry;
          if (!layoutShiftEntry.hadRecentInput) {
            cumulativeScore += layoutShiftEntry.value;
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });

      // Return score after 5 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(cumulativeScore);
      }, 5000);
    } else {
      resolve(null);
    }
  });
}

// Wrap in Suspense to avoid useSearchParams deopt
export default function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
