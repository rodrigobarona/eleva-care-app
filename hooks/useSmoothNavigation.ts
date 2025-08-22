'use client';

import { useSmoothScroll } from '@/components/providers/SmoothScrollProvider';
import { usePathname, useRouter } from 'next/navigation';

export function useSmoothNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { scrollTo } = useSmoothScroll();

  const navigateWithHash = (href: string) => {
    console.log('🔗 SmoothNavigation:', { href, currentPath: pathname });

    const [path, hash] = href.split('#');

    if (!hash) {
      // No hash, just navigate normally
      console.log('📍 No hash - normal navigation');
      router.push(href);
      return;
    }

    // Normalize paths for comparison (remove locale prefixes)
    const normalizeRoute = (route: string) => {
      // Remove locale prefix (e.g., /en, /pt, /es, /br)
      return route.replace(/^\/[a-z]{2}(-[a-z]{2})?/, '') || '/';
    };

    const currentNormalizedPath = normalizeRoute(pathname);
    const targetNormalizedPath = normalizeRoute(path);

    console.log('🔍 Path comparison:', {
      current: currentNormalizedPath,
      target: targetNormalizedPath,
      hash,
    });

    // Check if we're staying on the same page
    if (currentNormalizedPath === targetNormalizedPath) {
      // Same page navigation - just scroll with appropriate offset
      console.log('✅ Same page - scrolling to hash');
      setTimeout(() => {
        // Use larger offset for same-page navigation to account for header
        scrollTo(`#${hash}`, { offset: -120 });
      }, 100);
      return;
    }

    // Cross-page navigation with hash
    console.log('🚀 Cross-page navigation');

    // Navigate to the new page first
    router.push(path);

    // Wait for navigation and page render, then scroll with multiple attempts
    const scrollAfterNavigation = (attempt: number = 1) => {
      console.log(`🔄 Scroll attempt ${attempt} for hash: ${hash}`);

      const element = document.querySelector(`#${hash}`);
      if (element) {
        console.log('🎯 Found element, scrolling:', element);

        // Wait a bit more for any dynamic content to load
        setTimeout(() => {
          // Use different offset for cross-page navigation
          scrollTo(`#${hash}`, { offset: -110, duration: 1.5 });
        }, 100);
      } else {
        console.warn(`⚠️ Element not found on attempt ${attempt}:`, hash);

        // Retry with exponential backoff if element not found and we haven't tried too many times
        if (attempt < 4) {
          setTimeout(() => {
            scrollAfterNavigation(attempt + 1);
          }, attempt * 300); // 300ms, 600ms, 900ms delays
        } else {
          console.error('❌ Element still not found after 4 attempts:', hash);
        }
      }
    };

    // Start scroll attempts with different timings for better reliability
    setTimeout(() => scrollAfterNavigation(1), 400); // First attempt after 400ms
    setTimeout(() => scrollAfterNavigation(2), 800); // Second attempt after 800ms
    setTimeout(() => scrollAfterNavigation(3), 1200); // Third attempt after 1200ms
  };

  return { navigateWithHash };
}
