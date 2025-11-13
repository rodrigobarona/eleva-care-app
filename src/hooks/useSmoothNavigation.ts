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

    // Use a single, sequential approach for cross-page navigation
    let scrollSuccess = false;

    const attemptSequentialScroll = async (maxAttempts: number = 4) => {
      for (let attempt = 1; attempt <= maxAttempts && !scrollSuccess; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 300)); // 300ms, 600ms, 900ms, 1200ms

        console.log(`🔄 Sequential scroll attempt ${attempt} for hash: ${hash}`);

        const element = document.querySelector(`#${hash}`);
        if (element && !scrollSuccess) {
          console.log(`🎯 Found element on attempt ${attempt}, scrolling:`, element);
          scrollSuccess = true;

          // Wait a bit more for any dynamic content to load
          setTimeout(() => {
            scrollTo(`#${hash}`, { offset: -115, duration: 1.5 });
            console.log('✅ Cross-page scroll completed');
          }, 150);
          break;
        } else if (!scrollSuccess) {
          console.warn(`⚠️ Element not found on attempt ${attempt}:`, hash);
        }
      }

      if (!scrollSuccess) {
        console.error('❌ Element not found after all attempts:', hash);
      }
    };

    // Start sequential scroll attempts
    attemptSequentialScroll();
  };

  return { navigateWithHash };
}
