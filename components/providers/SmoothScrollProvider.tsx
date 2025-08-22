'use client';

import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useRef } from 'react';

interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollTo: (target: string | number, options?: { offset?: number; duration?: number }) => void;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollTo: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
      autoResize: true,
      // Enable anchor link handling
      anchors: {
        offset: 100, // Increased offset for better header clearance
        onComplete: () => {
          console.log('✅ Lenis anchor scroll completed');
        },
      },
    });

    lenisRef.current = lenis;

    // RAF loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Handle hash navigation after route changes
  useEffect(() => {
    if (!lenisRef.current) return;

    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash) {
        console.log('🔍 Hash detected on route change:', hash);

        // Simple, single attempt with appropriate delay
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            console.log('🎯 Auto-scrolling to hash element:', element);
            lenisRef.current?.scrollTo(element as HTMLElement, {
              offset: -115, // Consistent offset
              duration: 1.5,
            });
          } else {
            console.warn('⚠️ Hash element not found:', hash);
          }
        }, 500); // Single 500ms delay
      }
    };

    // Handle initial hash on page load
    handleHashScroll();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashScroll);

    return () => {
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, [pathname]);

  const scrollTo = (
    target: string | number,
    options: { offset?: number; duration?: number } = {},
  ) => {
    if (!lenisRef.current) return;

    console.log('📜 ScrollTo called:', { target, options });

    lenisRef.current.scrollTo(target, {
      offset: options.offset ?? -100, // Increased default offset
      duration: options.duration ?? 1.2,
    });
  };

  const contextValue: SmoothScrollContextType = {
    lenis: lenisRef.current,
    scrollTo,
  };

  return (
    <SmoothScrollContext.Provider value={contextValue}>{children}</SmoothScrollContext.Provider>
  );
}
