'use client';

import { locales } from '@/lib/i18n/routing';
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

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

/**
 * First path segments (after the optional locale) that belong to static
 * marketing/app routes. Anything else with 2+ segments is a booking route
 * (/[username]/[eventSlug]/...).
 */
const STATIC_FIRST_SEGMENTS = new Set([
  'about',
  'sign-in',
  'sign-up',
  'legal',
  'trust',
  'history',
  'my-packs',
  'pack-purchase',
  'dashboard',
  'help',
  'contact',
  'community',
  'services',
  'onboarding',
  'unauthorized',
]);

const LOCALE_SET = new Set<string>(locales);

function isBookingRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && LOCALE_SET.has(segments[0])) segments.shift();
  return segments.length >= 2 && !STATIC_FIRST_SEGMENTS.has(segments[0]);
}

/** Frames without scrolling before the RAF loop is paused. */
const IDLE_FRAMES_BEFORE_SLEEP = 10;

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const wakeRef = useRef<() => void>(() => {});
  const pathname = usePathname();
  // null until matchMedia has been read, so Lenis is never created (and then
  // immediately destroyed) for visitors who prefer reduced motion.
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  const enabled = reducedMotion === false && !isBookingRoute(pathname);

  // Track prefers-reduced-motion (client-only, after mount)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;

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
      },
    });

    lenisRef.current = lenis;

    // On-demand RAF loop: runs only while Lenis is animating/being touched and
    // sleeps after a few idle frames, instead of ticking 60x/s forever.
    // (Lenis' `autoRaf` option also loops forever, so it is not used here.)
    let rafId: number | null = null;
    let idleFrames = 0;

    const tick = (time: number) => {
      lenis.raf(time);
      if (lenis.isScrolling || lenis.isTouching) {
        idleFrames = 0;
      } else {
        idleFrames += 1;
      }
      if (idleFrames > IDLE_FRAMES_BEFORE_SLEEP) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    const wake = () => {
      idleFrames = 0;
      if (rafId !== null) return;
      // Reset Lenis' clock so the first frame after sleeping has deltaTime 0
      // (otherwise the idle gap would make animations jump to the end).
      lenis.time = 0;
      rafId = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    // Wheel/touch input that Lenis intercepts
    const offVirtualScroll = lenis.on('virtual-scroll', wake);
    // Anchor clicks (Lenis `anchors` option), keyboard and pointer input
    const wakeEvents = ['click', 'keydown', 'pointerdown', 'touchstart'] as const;
    for (const type of wakeEvents) {
      window.addEventListener(type, wake, { capture: true, passive: true });
    }

    wake();

    return () => {
      offVirtualScroll();
      for (const type of wakeEvents) {
        window.removeEventListener(type, wake, { capture: true });
      }
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      wakeRef.current = () => {};
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  const scrollTo = useCallback(
    (target: string | number, options: { offset?: number; duration?: number } = {}) => {
      const offset = options.offset ?? -100;
      const lenis = lenisRef.current;

      if (lenis) {
        lenis.scrollTo(target, {
          offset,
          duration: options.duration ?? 1.2,
        });
        wakeRef.current();
        return;
      }

      // Native fallback when Lenis is disabled (booking routes, reduced motion)
      let top: number;
      if (typeof target === 'number') {
        top = target + offset;
      } else {
        const element = document.querySelector(target);
        if (!element) return;
        top = element.getBoundingClientRect().top + window.scrollY + offset;
      }
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top, behavior: prefersReduced ? 'instant' : 'smooth' });
    },
    [],
  );

  // Handle hash navigation after route changes
  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (!hash) return;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        let element: Element | null = null;
        try {
          element = document.querySelector(hash);
        } catch {
          return; // invalid selector
        }
        if (element && lenisRef.current) {
          lenisRef.current.scrollTo(element as HTMLElement, {
            offset: -115, // Consistent offset
            duration: 1.5,
          });
          wakeRef.current();
        }
      }, 500);
    };

    // Handle initial hash on page load
    handleHashScroll();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashScroll);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, [pathname, enabled]);

  // Create context value without accessing ref during render
  const contextValue: SmoothScrollContextType = useMemo(
    () => ({
      lenis: null, // Don't provide ref value directly - consumers should use scrollTo
      scrollTo,
    }),
    [scrollTo],
  );

  return (
    <SmoothScrollContext.Provider value={contextValue}>{children}</SmoothScrollContext.Provider>
  );
}
