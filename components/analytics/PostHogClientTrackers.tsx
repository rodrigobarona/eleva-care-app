'use client';

/**
 * PostHog trackers (pageviews + user identification).
 *
 * This module is loaded lazily from app/providers.tsx (next/dynamic, ssr: false)
 * only after posthog-js has been initialized, so `posthog-js` and
 * `posthog-js/react` stay out of the critical client bundle. It renders no UI
 * and does NOT wrap the app's children.
 */
import PostHogPageView from '@/app/PostHogPageView';
import { useUser } from '@clerk/nextjs';
import { useParams, usePathname } from 'next/navigation';
import type { PostHog } from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

// TypeScript interfaces for Clerk metadata
interface ClerkPublicMetadata {
  signInCount?: number;
  role?: string;
  onboardingCompleted?: boolean;
  sessionCount?: number;
}

// PostHog user identification and tracking
function PostHogUserTracker({ posthog }: { posthog: PostHog }) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const params = useParams();

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;

    const locale = (params?.locale as string) || 'en';
    const isPrivateRoute =
      pathname?.startsWith('/(private)') ||
      pathname?.includes('/dashboard') ||
      pathname?.includes('/account') ||
      pathname?.includes('/admin');

    posthog.register({
      route_type: isPrivateRoute ? 'private' : 'public',
      locale: locale,
      user_authenticated: !!user,
    });

    if (user) {
      const metadata = user.publicMetadata as ClerkPublicMetadata;

      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.primaryPhoneNumber?.phoneNumber,
        avatar: user.imageUrl,
        created_at: user.createdAt,
        last_sign_in: user.lastSignInAt,
        email_verified: user.primaryEmailAddress?.verification?.status === 'verified',
        phone_verified: user.primaryPhoneNumber?.verification?.status === 'verified',
        has_image: !!user.imageUrl,
        sign_in_count: metadata?.signInCount || 0,
        user_role: metadata?.role || 'user',
        onboarding_completed: metadata?.onboardingCompleted || false,
        preferred_locale: locale,
        timezone: (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch (error) {
            console.warn('Failed to get timezone, using UTC:', error);
            return 'UTC';
          }
        })(),
      });

      posthog.people.set({
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        avatar: user.imageUrl,
        locale: locale,
        last_seen: new Date().toISOString(),
        total_sessions: (metadata?.sessionCount || 0) + 1,
      });

      if (user.lastSignInAt) {
        const timeSinceLastSignIn = Date.now() - new Date(user.lastSignInAt).getTime();
        if (timeSinceLastSignIn < 60000) {
          posthog.capture('user_signed_in', {
            sign_in_method: 'clerk',
            is_new_session: true,
            locale: locale,
          });
        }
      }
    } else {
      posthog.register({
        user_type: 'anonymous',
        locale: locale,
      });
    }

    posthog.register({
      page_type: isPrivateRoute ? 'app' : 'marketing',
      page_section: isPrivateRoute
        ? pathname?.split('/')[2] || 'dashboard'
        : pathname?.split('/')[2] || 'home',
    });
  }, [user, isLoaded, pathname, params, posthog]);

  return null;
}

export default function PostHogClientTrackers({ client }: { client: PostHog }) {
  return (
    <PHProvider client={client}>
      <PostHogPageView />
      <PostHogUserTracker posthog={client} />
    </PHProvider>
  );
}
